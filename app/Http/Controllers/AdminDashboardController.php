<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Models\DokumenApproval;
use App\Models\User;
use App\Services\ContextService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Carbon;
use Inertia\Inertia;

class AdminDashboardController extends Controller
{
    public function __construct(
        protected ContextService $contextService
    ) {}

    /**
     * Display the admin dashboard with real data based on current context.
     */
    public function index()
    {
        $user = Auth::user();
        $context = $this->contextService->getContext();

        // Get context-specific IDs
        $companyId = $context?->company_id;
        $aplikasiId = $context?->aplikasi_id;

        // Calculate statistics based on current context
        $stats = $this->getStats($user, $companyId, $aplikasiId);

        // Get recent documents for the context
        $recentDocuments = $this->getRecentDocuments($companyId, $aplikasiId);

        // Get recent activity
        $recentActivity = $this->getRecentActivity($companyId, $aplikasiId);

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
            'recent_documents' => $recentDocuments,
            'recent_activity' => $recentActivity,
            // Note: Use 'current_context' to avoid overwriting shared 'context' prop
            'current_context' => [
                'company' => $context?->company?->name ?? 'All Companies',
                'aplikasi' => $context?->aplikasi?->name ?? 'All Applications',
                'role' => $context?->role?->role_name ?? 'Admin',
            ],
        ]);
    }

    /**
     * Get dashboard statistics.
     */
    private function getStats($user, $companyId, $aplikasiId): array
    {
        // Base query for documents in context
        $baseQuery = Dokumen::query();

        if ($companyId) {
            $baseQuery->where('company_id', $companyId);
        }

        if ($aplikasiId) {
            $baseQuery->where('aplikasi_id', $aplikasiId);
        }

        // Pending reviews - documents that need approval from current user
        // Using 'user_id' column (not 'approver_id') and 'approval_status' (not 'status')
        $pendingReviews = DokumenApproval::where('user_id', $user->id)
            ->where('approval_status', 'pending')
            ->when($companyId, function ($query) use ($companyId) {
                $query->whereHas('dokumen', function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                });
            })
            ->count();

        // Approved today
        $approvedToday = DokumenApproval::where('user_id', $user->id)
            ->where('approval_status', 'approved')
            ->whereDate('updated_at', Carbon::today())
            ->count();

        // Total documents in context
        $totalDocuments = (clone $baseQuery)->count();

        // Active users in context (users with same company_id in their userAuths)
        $activeUsers = 0;
        if ($companyId) {
            $activeUsers = User::whereHas('userAuths', function ($query) use ($companyId) {
                $query->where('company_id', $companyId);
            })->count();
        }

        return [
            'pending_reviews' => $pendingReviews,
            'approved_today' => $approvedToday,
            'total_documents' => $totalDocuments,
            'active_users' => $activeUsers,
        ];
    }

    /**
     * Get recent documents for context.
     */
    private function getRecentDocuments($companyId, $aplikasiId): array
    {
        $query = Dokumen::with(['user', 'masterflow', 'latestVersion'])
            ->orderBy('created_at', 'desc')
            ->limit(10);

        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($aplikasiId) {
            $query->where('aplikasi_id', $aplikasiId);
        }

        return $query->get()->map(function ($doc) {
            return [
                'id' => $doc->id,
                'nomor_dokumen' => $doc->nomor_dokumen,
                'judul_dokumen' => $doc->judul_dokumen,
                'status' => $doc->status,
                'status_current' => $doc->status_current,
                'tgl_pengajuan' => $doc->tgl_pengajuan?->format('Y-m-d'),
                'tgl_deadline' => $doc->tgl_deadline?->format('Y-m-d'),
                'user_name' => $doc->user?->name ?? 'Unknown',
                'masterflow_name' => $doc->masterflow?->name ?? 'N/A',
                'created_at' => $doc->created_at->diffForHumans(),
            ];
        })->toArray();
    }

    /**
     * Get recent activity for context.
     */
    private function getRecentActivity($companyId, $aplikasiId): array
    {
        // Get recent approvals/rejections
        // Note: use 'user' relation instead of 'approver', and 'approval_status' instead of 'status'
        $recentApprovals = DokumenApproval::with(['dokumen', 'user'])
            ->whereIn('approval_status', ['approved', 'rejected', 'revision_requested'])
            ->when($companyId, function ($query) use ($companyId) {
                $query->whereHas('dokumen', function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                });
            })
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get();

        $activity = [];

        foreach ($recentApprovals as $approval) {
            $type = 'info';
            $title = 'Document Updated';

            switch ($approval->approval_status) {
                case 'approved':
                    $type = 'success';
                    $title = 'Document Approved';
                    break;
                case 'rejected':
                    $type = 'error';
                    $title = 'Document Rejected';
                    break;
                case 'revision_requested':
                    $type = 'warning';
                    $title = 'Revision Requested';
                    break;
            }

            $activity[] = [
                'id' => $approval->id,
                'type' => $type,
                'title' => $title,
                'description' => ($approval->dokumen?->judul_dokumen ?? 'Document') . ' by ' . ($approval->user?->name ?? 'Unknown'),
                'time' => $approval->updated_at->diffForHumans(),
            ];
        }

        // If no activity, add recent document submissions
        if (empty($activity)) {
            $recentDocs = Dokumen::with('user')
                ->when($companyId, fn($q) => $q->where('company_id', $companyId))
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            foreach ($recentDocs as $doc) {
                $activity[] = [
                    'id' => $doc->id,
                    'type' => 'info',
                    'title' => 'New Submission',
                    'description' => $doc->judul_dokumen . ' submitted by ' . ($doc->user?->name ?? 'Unknown'),
                    'time' => $doc->created_at->diffForHumans(),
                ];
            }
        }

        return $activity;
    }
}
