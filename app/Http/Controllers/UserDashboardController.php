<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Dokumen;
use App\Models\DokumenApproval;
use App\Models\Masterflow;
use App\Models\UsersAuth;
use App\Models\RevisionLog;
use App\Services\ContextService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UserDashboardController extends Controller
{
    public function __construct(
        protected ContextService $contextService
    ) {}

    /**
     * Display the user dashboard with real data based on current context.
     */
    public function index()
    {
        $user = Auth::user();
        $context = $this->contextService->getContext();

        // Get context data
        $companyId = $context?->company_id;
        $aplikasiId = $context?->aplikasi_id;
        $roleName = $context?->role?->role_name ?? 'User';
        $companyName = $context?->company?->name ?? 'No Company Assigned';
        $jabatanName = $context?->jabatan?->name ?? 'No Position Assigned';

        // Get real statistics
        $statistics = $this->getStatistics($user, $companyId, $aplikasiId);

        // Get real recent documents
        $recentDocuments = $this->getRecentDocuments($user, $companyId, $aplikasiId);

        // Get available masterflows for user's company
        $availableMasterflows = $this->getMasterflowsForContext($companyId);

        // Get recent activity
        $recentActivity = $this->getRecentActivity($user);

        $dashboardData = [
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $roleName,
                'company' => $companyName,
                'jabatan' => $jabatanName,
                'profile' => $user->profile ? [
                    'phone' => $user->profile->no_hp,
                    'address' => $user->profile->alamat,
                ] : null
            ],
            'statistics' => $statistics,
            'recent_documents' => $recentDocuments,
            'available_masterflows' => $availableMasterflows,
            'recent_activity' => $recentActivity,
            // Note: Use 'current_context' to avoid overwriting shared 'context' prop
            'current_context' => [
                'company' => $companyName,
                'aplikasi' => $context?->aplikasi?->name ?? 'All Applications',
                'role' => $roleName,
            ],
        ];

        return Inertia::render('user/dashboard', $dashboardData);
    }

    /**
     * Get real statistics for user's documents.
     */
    private function getStatistics($user, $companyId, $aplikasiId): array
    {
        // Base query for user's own documents
        $baseQuery = Dokumen::where('user_id', $user->id);

        if ($companyId) {
            $baseQuery->where('company_id', $companyId);
        }

        if ($aplikasiId) {
            $baseQuery->where('aplikasi_id', $aplikasiId);
        }

        // Count by status
        $pendingDocuments = (clone $baseQuery)
            ->whereIn('status', ['draft', 'pending', 'in_review', 'revision_requested'])
            ->count();

        $approvedDocuments = (clone $baseQuery)
            ->where('status', 'approved')
            ->count();

        $rejectedDocuments = (clone $baseQuery)
            ->where('status', 'rejected')
            ->count();

        $totalSubmitted = (clone $baseQuery)->count();

        // Count approvals assigned to user
        $approvalQuery = DokumenApproval::byUser($user->id);

        $pendingApprovals = (clone $approvalQuery)
            ->where('approval_status', 'pending')
            ->count();

        $processedApprovals = (clone $approvalQuery)
            ->whereIn('approval_status', ['approved', 'rejected'])
            ->count();

        return [
            'pending_documents' => $pendingDocuments,
            'approved_documents' => $approvedDocuments,
            'rejected_documents' => $rejectedDocuments,
            'total_submitted' => $totalSubmitted,
            'pending_approvals' => $pendingApprovals,
            'processed_approvals' => $processedApprovals,
        ];
    }

    /**
     * Get recent documents for user.
     */
    private function getRecentDocuments($user, $companyId, $aplikasiId): array
    {
        $query = Dokumen::with(['masterflow', 'latestVersion'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit(10);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($aplikasiId) {
            $query->where('aplikasi_id', $aplikasiId);
        }

        return $query->get()->map(function ($doc) {
            // Calculate file size from latest version if available
            $size = 'N/A';
            if ($doc->latestVersion && $doc->latestVersion->size_file) {
                $size = $this->formatBytes($doc->latestVersion->size_file);
            }

            return [
                'id' => $doc->id,
                'name' => $doc->judul_dokumen,
                'status' => $doc->status,
                'submitted_at' => $doc->tgl_pengajuan?->format('Y-m-d') ?? $doc->created_at->format('Y-m-d'),
                'category' => $doc->masterflow?->name ?? 'General',
                'size' => $size,
            ];
        })->toArray();
    }

    /**
     * Get masterflows available for the context.
     */
    private function getMasterflowsForContext($companyId): array
    {
        $query = Masterflow::where('is_active', true)
            ->with(['steps.jabatan', 'company', 'aplikasi', 'transaksi']);

        if (!$this->contextService->isSuperAdmin() && $companyId) {
            $query->where('company_id', $companyId);
        }

        return $query->orderBy('name')
            ->get()
            ->map(function ($masterflow) {
                return [
                    'id' => $masterflow->id,
                    'name' => $masterflow->name,
                    'description' => $masterflow->description,
                    'aplikasi_id' => $masterflow->aplikasi_id,
                    'transaksi_id' => $masterflow->transaksi_id,
                    'departemen' => $masterflow->departemen,
                    'tipe_dokumen' => $masterflow->tipe_dokumen,
                    'steps_count' => $masterflow->steps ? $masterflow->steps->count() : 0,
                    'company' => $masterflow->company ? $masterflow->company->name : null,
                    'steps' => $masterflow->steps ? $masterflow->steps->sortBy('step_order')->values()->map(function ($step) {
                        return [
                            'id' => $step->id,
                            'step_order' => $step->step_order,
                            'step_name' => $step->step_name,
                            'jabatan_id' => $step->jabatan_id,
                            'jabatan' => $step->jabatan ? [
                                'id' => $step->jabatan->id,
                                'name' => $step->jabatan->name,
                            ] : null,
                            'group_index' => $step->group_index,
                            'jenis_group' => $step->jenis_group,
                            'users_in_group' => $step->users_in_group,
                        ];
                    })->toArray() : [],
                ];
            })->toArray();
    }

    /**
     * Get recent activity for user.
     */
    private function getRecentActivity($user): array
    {
        return RevisionLog::with(['dokumen', 'user'])
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhereHas('dokumen', function ($q) use ($user) {
                        $q->where('user_id', $user->id);
                    });
            })
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'description' => $this->formatActivityDescription($log),
                    'timestamp' => $log->created_at ? $log->created_at->diffForHumans() : 'Just now',
                    'user_name' => $log->user?->name ?? 'System',
                    'document_name' => $log->dokumen?->judul_dokumen ?? 'Unknown Document',
                ];
            })->toArray();
    }

    private function formatActivityDescription($log): string
    {
        $docName = $log->dokumen?->judul_dokumen ?? 'Dokumen';
        $actor = $log->user_id === Auth::id() ? 'You' : ($log->user?->name ?? 'System');

        return match ($log->action) {
            RevisionLog::ACTION_CREATED => "$actor created document '$docName'",
            RevisionLog::ACTION_REVISED => "$actor uploaded a revision for '$docName'",
            RevisionLog::ACTION_SUBMITTED => "$actor submitted '$docName' for approval",
            RevisionLog::ACTION_APPROVED => "$actor approved '$docName'",
            RevisionLog::ACTION_REJECTED => "$actor rejected '$docName'",
            RevisionLog::ACTION_REVISION_REQUESTED => "$actor requested revision for '$docName'",
            RevisionLog::ACTION_CANCELLED => "$actor cancelled submission of '$docName'",
            default => "$actor performed " . $log->action . " on '$docName'",
        };
    }

    /**
     * Format bytes to human readable format.
     */
    private function formatBytes($bytes, $precision = 2): string
    {
        if ($bytes == 0) return '0 B';

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $pow = floor(log($bytes) / log(1024));
        $pow = min($pow, count($units) - 1);

        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }

    /**
     * Get user dashboard statistics (API endpoint).
     */
    public function getStatisticsApi()
    {
        $user = Auth::user();
        $context = $this->contextService->getContext();

        $companyId = $context?->company_id;
        $aplikasiId = $context?->aplikasi_id;

        return response()->json($this->getStatistics($user, $companyId, $aplikasiId));
    }

    /**
     * Get user's recent documents (API endpoint).
     */
    public function getRecentDocumentsApi()
    {
        $user = Auth::user();
        $context = $this->contextService->getContext();

        $companyId = $context?->company_id;
        $aplikasiId = $context?->aplikasi_id;

        return response()->json($this->getRecentDocuments($user, $companyId, $aplikasiId));
    }

    /**
     * Get user's available masterflows for document submission (API endpoint).
     */
    public function getMasterflowsApi()
    {
        $context = $this->contextService->getContext();
        $companyId = $context?->company_id;

        return response()->json([
            'masterflows' => $this->getMasterflowsForContext($companyId)
        ]);
    }
}
