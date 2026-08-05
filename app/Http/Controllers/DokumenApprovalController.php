<?php

namespace App\Http\Controllers;

use App\Models\DokumenApproval;
use App\Models\Dokumen;
use App\Models\RevisionLog;
use App\Services\PdfSignatureService;
use App\Services\ApprovalGroupValidator;
use App\Events\DokumenUpdated;
use App\Events\UserDokumenUpdated;
use App\Events\BrowserNotificationEvent;
use App\Mail\DocumentRejectedMail;
use App\Mail\RevisionRequestedMail;
use App\Mail\DocumentFullyApprovedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use App\Services\ContextService;

class DokumenApprovalController extends Controller
{
    protected ContextService $contextService;

    public function __construct(ContextService $contextService)
    {
        $this->contextService = $contextService;
    }

    /**
     * Display a listing of approvals for current user.
     */
    public function index(Request $request)
    {
        $query = DokumenApproval::with([
            'dokumen.user',
            'dokumen.latestVersion',
            'masterflowStep.jabatan',
            'dokumenVersion'
        ])
            ->byUser(Auth::id())
            ->orderBy('created_at', 'desc');

        // Context-based filtering (Super Admin sees all)
        if (!$this->contextService->isSuperAdmin()) {
            $companyId = $this->contextService->getCurrentCompanyId();
            $aplikasiId = $this->contextService->getCurrentAplikasiId();

            $query->whereHas('dokumen', function ($q) use ($companyId, $aplikasiId) {
                if ($companyId) {
                    $q->where('company_id', $companyId);
                }
                if ($aplikasiId) {
                    $q->where('aplikasi_id', $aplikasiId);
                }
            });
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        // Filter overdue
        if ($request->filled('overdue') && $request->overdue) {
            $query->overdue();
        }

        // Search by document title
        if ($request->filled('search')) {
            $query->whereHas('dokumen', function ($q) use ($request) {
                $q->where('judul_dokumen', 'like', '%' . $request->search . '%');
            });
        }

        $approvals = $query->paginate(15)->withQueryString();

        // Get statistics - with context filter applied
        $statsBaseQuery = DokumenApproval::byUser(Auth::id());

        // Apply the same context filtering to stats
        if (!$this->contextService->isSuperAdmin()) {
            $companyId = $this->contextService->getCurrentCompanyId();
            $aplikasiId = $this->contextService->getCurrentAplikasiId();

            $statsBaseQuery->whereHas('dokumen', function ($q) use ($companyId, $aplikasiId) {
                if ($companyId) {
                    $q->where('company_id', $companyId);
                }
                if ($aplikasiId) {
                    $q->where('aplikasi_id', $aplikasiId);
                }
            });
        }

        $stats = [
            'pending' => (clone $statsBaseQuery)->pending()->count(),
            'approved' => (clone $statsBaseQuery)->approved()->count(),
            'rejected' => (clone $statsBaseQuery)->rejected()->count(),
            'overdue' => (clone $statsBaseQuery)->overdue()->count(),
        ];

        return Inertia::render('approvals/index', [
            'approvals' => $approvals,
            'stats' => $stats,
            'filters' => $request->only(['status', 'overdue', 'search']),
        ]);
    }

    /**
     * Display the specified approval.
     */
    public function show(DokumenApproval $approval)
    {
        // Ensure user can access this approval
        if ($approval->user_id !== Auth::id()) {
            abort(403, 'Anda tidak memiliki akses ke approval ini.');
        }

        $approval->load([
            'dokumen.user.profile',
            'dokumen.masterflow.steps.jabatan',
            'dokumen.comments.user',
            'dokumen.versions',
            'dokumen.revisionLogs.user',
            'dokumenVersion',
            'masterflowStep.jabatan',
        ]);

        // Get all approvals for this document to show workflow progress
        $allApprovals = DokumenApproval::where('dokumen_id', $approval->dokumen_id)
            ->with(['user.profile', 'masterflowStep.jabatan'])
            ->orderBy('masterflow_step_id')
            ->get();

        return Inertia::render('approvals/show', [
            'approval' => $approval,
            'allApprovals' => $allApprovals,
            'canApprove' => $approval->canCurrentlyApprove(),
        ]);
    }

    /**
     * Approve the document.
     */
    public function approve(Request $request, DokumenApproval $approval, PdfSignatureService $pdfSignatureService)
    {
        // Ensure user can approve this and previous steps are completed
        if ($approval->user_id !== Auth::id() || !$approval->canCurrentlyApprove()) {
            return back()->withErrors(['error' => 'Anda tidak dapat melakukan approval ini. Pastikan tahap sebelumnya sudah selesai.']);
        }

        // Load dokumen_version if not already loaded
        if (!$approval->relationLoaded('dokumenVersion')) {
            $approval->load('dokumenVersion');
        }

        $validated = $request->validate([
            'comment' => 'nullable|string|max:1000',
            'signature' => 'required|string',
            'signature_position' => 'nullable|string|in:bottom_right,bottom_left,bottom_center',
        ]);

        // Handle signature storage (moved outside transaction)
        $signaturePath = null;
        $signatureData = $validated['signature'];

        if (str_starts_with($signatureData, 'data:image')) {
            // New manual signature - decode and save
            $image = str_replace('data:image/png;base64,', '', $signatureData);
            $image = str_replace(' ', '+', $image);
            $imageData = base64_decode($image);

            $filename = 'approval_signature_' . time() . '_' . \Illuminate\Support\Str::random(10) . '.png';
            $path = 'signatures/approvals/' . $approval->id . '/' . $filename;

            \Illuminate\Support\Facades\Storage::disk('public')->put($path, $imageData);
            $signaturePath = $path;
        } elseif (str_starts_with($signatureData, 'http') || str_starts_with($signatureData, '/storage')) {
            // Existing signature URL - extract path
            $signaturePath = str_replace('/storage/', '', parse_url($signatureData, PHP_URL_PATH));
        }

        DB::beginTransaction();
        try {
            // Approve this approval with signature
            $approval->update([
                'approval_status' => 'approved',
                'tgl_approve' => now(),
                'comment' => $validated['comment'],
                'signature_path' => $signaturePath,
            ]);

            // Add comment if provided
            if ($validated['comment']) {
                \App\Models\Comment::create([
                    'dokumen_id' => $approval->dokumen_id,
                    'content' => 'Approved: ' . $validated['comment'],
                    'user_id' => Auth::id(),
                    'created_at_custom' => now(),
                ]);
            }

            // Check if all approvals are complete and handle group logic
            Log::info('Checking document status after approval', [
                'dokumen_id' => $approval->dokumen_id,
                'approval_id' => $approval->id,
                'group_index' => $approval->group_index,
                'jenis_group' => $approval->jenis_group,
            ]);

            $this->checkAndUpdateDocumentStatus($approval->dokumen);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Approval failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'approval_id' => $approval->id,
            ]);
            return back()->withErrors(['error' => 'Gagal melakukan approval: ' . $e->getMessage()]);
        }

        // Post-processing outside transaction to avoid blocking DB connections
        try {
            // NOTE: PDF signature embedding removed for storage optimization.
            // Signatures are now rendered on-demand when viewing/downloading documents
            // using PdfSignatureService::generateSignedPdfStream()
            Log::info('Approval completed - signature stored for on-demand rendering', [
                'signature_path' => $signaturePath,
                'approval_id' => $approval->id,
                'dokumen_id' => $approval->dokumen_id,
            ]);

            // Broadcast dokumen updated event for real-time updates (minimal payload)
            $dokumen = $approval->dokumen->fresh();

            // Broadcast to detail page viewers
            Log::info('Broadcasting DokumenUpdated event', [
                'dokumen_id' => $dokumen->id,
                'channel' => 'dokumen.' . $dokumen->id,
                'event' => 'dokumen.updated'
            ]);
            broadcast(new DokumenUpdated($dokumen))->toOthers();

            // Broadcast to dokumen owner's list page
            Log::info('Broadcasting UserDokumenUpdated event', [
                'dokumen_id' => $dokumen->id,
                'user_id' => $dokumen->user_id,
                'channel' => 'user.' . $dokumen->user_id . '.dokumen',
                'event' => 'dokumen.updated'
            ]);
            broadcast(new UserDokumenUpdated($dokumen))->toOthers();
        } catch (\Exception $e) {
            // Log post-processing errors but don't fail the request as the approval is already committed
            Log::error('Post-approval processing failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'approval_id' => $approval->id,
            ]);
        }

        return redirect()->route('approvals.index')
            ->with('success', 'Dokumen berhasil di-approve dan ditandatangani!');
    }

    /**
     * Reject the document.
     */
    public function reject(Request $request, DokumenApproval $approval)
    {
        // Ensure user can reject this and previous steps are completed
        if ($approval->user_id !== Auth::id() || !$approval->canCurrentlyApprove()) {
            return back()->withErrors(['error' => 'Anda tidak dapat melakukan rejection ini. Pastikan tahap sebelumnya sudah selesai.']);
        }

        $validated = $request->validate([
            'alasan_reject' => 'required|string|max:1000',
            'comment' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            // Get the current step number
            $currentStepNumber = $approval->masterflowStep->step_order;

            // Reject this approval
            $approval->reject($validated['alasan_reject'], $validated['comment']);

            // Cancel all pending approvals in future steps
            // When a document is rejected at step X, all approvals at step X+1, X+2, etc. should be cancelled
            DokumenApproval::where('dokumen_id', $approval->dokumen_id)
                ->where('approval_status', 'pending')
                ->whereHas('masterflowStep', function ($query) use ($currentStepNumber) {
                    $query->where('step_order', '>', $currentStepNumber);
                })
                ->update([
                    'approval_status' => 'cancelled',
                    'tgl_approve' => now(),
                    'comment' => 'Auto-cancelled: Document rejected at step ' . $currentStepNumber,
                ]);

            // Update document status to rejected
            $approval->dokumen->update([
                'status' => 'rejected',
                'status_current' => 'rejected',
            ]);

            // Add comment
            \App\Models\Comment::create([
                'dokumen_id' => $approval->dokumen_id,
                'content' => 'Rejected: ' . $validated['alasan_reject'],
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            // Broadcast dokumen updated event for real-time updates (minimal payload)
            $dokumen = $approval->dokumen->fresh();

            // Broadcast to detail page viewers
            Log::info('Broadcasting DokumenUpdated event (reject)', [
                'dokumen_id' => $dokumen->id,
                'channel' => 'dokumen.' . $dokumen->id,
                'event' => 'dokumen.updated'
            ]);
            broadcast(new DokumenUpdated($dokumen))->toOthers();

            // Broadcast to dokumen owner's list page
            Log::info('Broadcasting UserDokumenUpdated event (reject)', [
                'dokumen_id' => $dokumen->id,
                'user_id' => $dokumen->user_id,
                'channel' => 'user.' . $dokumen->user_id . '.dokumen',
                'event' => 'dokumen.updated'
            ]);
            broadcast(new UserDokumenUpdated($dokumen))->toOthers();

            // Send email notification to document owner
            $dokumenWithUser = $approval->dokumen->fresh(['user']);
            if ($dokumenWithUser->user?->email) {
                Mail::to($dokumenWithUser->user->email)
                    ->queue(new DocumentRejectedMail($dokumenWithUser, $approval));
            }

            // Log revision
            RevisionLog::create([
                'dokumen_id' => $approval->dokumen_id,
                'dokumen_version_id' => $approval->dokumen_version_id,
                'user_id' => Auth::id(),
                'action' => RevisionLog::ACTION_REJECTED,
                'notes' => $validated['alasan_reject'],
            ]);

            // Broadcast browser notification to document owner
            broadcast(new BrowserNotificationEvent(
                userId: $dokumenWithUser->user_id,
                title: 'Dokumen Ditolak',
                body: "Dokumen '{$dokumenWithUser->judul_dokumen}' telah ditolak. Alasan: " . \Illuminate\Support\Str::limit($validated['alasan_reject'], 50),
                url: route('dokumen.show', $dokumenWithUser->id),
                type: 'error'
            ));

            DB::commit();

            return redirect()->route('approvals.index')
                ->with('success', 'Dokumen berhasil di-reject!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal melakukan rejection: ' . $e->getMessage()]);
        }
    }

    /**
     * Skip approval (if allowed).
     */
    public function skip(Request $request, DokumenApproval $approval)
    {
        // Ensure user can skip this and step is not required
        if (
            $approval->user_id !== Auth::id() ||
            !$approval->isPending() ||
            $approval->masterflowStep->is_required
        ) {
            return back()->withErrors(['error' => 'Approval ini tidak dapat di-skip.']);
        }

        $validated = $request->validate([
            'comment' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            // Skip this approval
            $approval->update([
                'approval_status' => 'skipped',
                'tgl_approve' => now(),
                'comment' => $validated['comment'],
            ]);

            // Add comment if provided
            if ($validated['comment']) {
                \App\Models\Comment::create([
                    'dokumen_id' => $approval->dokumen_id,
                    'content' => 'Skipped: ' . $validated['comment'],
                    'user_id' => Auth::id(),
                    'created_at_custom' => now(),
                ]);
            }

            // Check if all approvals are complete
            $this->checkAndUpdateDocumentStatus($approval->dokumen);

            DB::commit();

            return redirect()->route('approval.index')
                ->with('success', 'Approval berhasil di-skip!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal melakukan skip: ' . $e->getMessage()]);
        }
    }

    /**
     * Delegate approval to another user.
     */
    public function delegate(Request $request, DokumenApproval $approval)
    {
        // Ensure user can delegate this
        if ($approval->user_id !== Auth::id() || !$approval->isPending()) {
            return back()->withErrors(['error' => 'Anda tidak dapat mendelegasikan approval ini.']);
        }

        $validated = $request->validate([
            'delegate_to' => 'required|exists:users,id',
            'comment' => 'nullable|string|max:1000',
        ]);

        // Ensure delegate target has same jabatan
        $targetUser = \App\Models\User::with('profile')->find($validated['delegate_to']);
        if (
            !$targetUser ||
            $targetUser->profile->jabatan_id !== $approval->masterflowStep->jabatan_id
        ) {
            return back()->withErrors(['error' => 'User yang dipilih tidak memiliki jabatan yang sesuai.']);
        }

        DB::beginTransaction();
        try {
            // Update approval user
            $approval->update([
                'user_id' => $validated['delegate_to'],
            ]);

            // Add comment about delegation
            \App\Models\Comment::create([
                'dokumen_id' => $approval->dokumen_id,
                'content' => 'Approval didelegasikan kepada ' . $targetUser->name .
                    ($validated['comment'] ? ': ' . $validated['comment'] : ''),
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            DB::commit();

            return redirect()->route('approval.index')
                ->with('success', 'Approval berhasil didelegasikan!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal mendelegasikan approval: ' . $e->getMessage()]);
        }
    }

    /**
     * Get approval history for a document.
     */
    public function history(Dokumen $dokumen)
    {
        $approvals = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->with([
                'user.profile',
                'masterflowStep.jabatan',
                'dokumenVersion'
            ])
            ->orderBy('created_at')
            ->get();

        return Inertia::render('DokumenApproval/History', [
            'dokumen' => $dokumen->load(['user', 'masterflow']),
            'approvals' => $approvals,
        ]);
    }

    /**
     * Dashboard for approval statistics.
     */
    public function dashboard()
    {
        $userId = Auth::id();

        // Get statistics
        $stats = [
            'pending' => DokumenApproval::byUser($userId)->pending()->count(),
            'approved_today' => DokumenApproval::byUser($userId)
                ->approved()
                ->whereDate('tgl_approve', today())
                ->count(),
            'overdue' => DokumenApproval::byUser($userId)->overdue()->count(),
            'this_week' => DokumenApproval::byUser($userId)
                ->where('created_at', '>=', now()->startOfWeek())
                ->count(),
        ];

        // Get recent approvals
        $recentApprovals = DokumenApproval::byUser($userId)
            ->with(['dokumen.user', 'masterflowStep.jabatan'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Get overdue approvals
        $overdueApprovals = DokumenApproval::byUser($userId)
            ->overdue()
            ->with(['dokumen.user', 'masterflowStep.jabatan'])
            ->orderBy('tgl_deadline')
            ->limit(5)
            ->get();

        return Inertia::render('DokumenApproval/Dashboard', [
            'stats' => $stats,
            'recentApprovals' => $recentApprovals,
            'overdueApprovals' => $overdueApprovals,
        ]);
    }

    /**
     * Check and update document status based on approvals.
     */
    private function checkAndUpdateDocumentStatus(Dokumen $dokumen)
    {
        $validator = new ApprovalGroupValidator();
        $allApprovals = $dokumen->approvals;

        Log::info('Starting document status check', [
            'dokumen_id' => $dokumen->id,
            'total_approvals' => $allApprovals->count(),
        ]);

        // Check if any approval is rejected
        if ($allApprovals->contains('approval_status', 'rejected')) {
            $dokumen->update([
                'status' => 'rejected',
                'status_current' => 'rejected',
            ]);
            Log::info('Document rejected - at least one approval is rejected');
            return;
        }

        // Use isFullyApproved method for simpler logic
        if ($dokumen->isFullyApproved()) {
            Log::info('Document status: fully approved (no pending approvals)');
            $dokumen->update([
                'status' => 'approved',
                'status_current' => 'fully_approved',
            ]);
            return;
        }

        // If there are still pending approvals, status is under_review
        Log::info('Document status: waiting for approvals (has pending)');
        $dokumen->update([
            'status' => 'under_review',
            'status_current' => 'waiting_approval',
        ]);

        // Auto-skip logic for completed groups (any_one or majority)
        $groupedApprovals = $allApprovals->groupBy('group_index');

        foreach ($groupedApprovals as $groupIndex => $groupApprovals) {
            // Skip if group_index is null (single approver, not a group)
            if (is_null($groupIndex)) {
                continue;
            }

            // Check group completion using validator
            $groupStatus = $validator->isGroupComplete($dokumen->id, $groupIndex);

            Log::info('Checking group for auto-skip', [
                'group_index' => $groupIndex,
                'is_complete' => $groupStatus['is_complete'],
                'status' => $groupStatus['status'],
            ]);

            // Auto-skip pending approvals in completed groups (for any_one or majority)
            if ($groupStatus['is_complete'] && $groupStatus['status'] === 'approved') {
                $jenisGroup = $groupApprovals->first()->jenis_group;

                if (in_array($jenisGroup, ['any_one', 'majority'])) {
                    // Skip remaining pending approvals in this group
                    $pendingApprovals = $groupApprovals->where('approval_status', 'pending');

                    if ($pendingApprovals->count() > 0) {
                        Log::info('Auto-skipping pending approvals in completed group', [
                            'group_index' => $groupIndex,
                            'jenis_group' => $jenisGroup,
                            'pending_count' => $pendingApprovals->count(),
                        ]);

                        $pendingApprovals->each(function ($approval) {
                            $approval->update([
                                'approval_status' => 'skipped',
                                'tgl_approve' => now(),
                                'comment' => 'Otomatis di-skip karena grup sudah menyelesaikan approval.',
                            ]);

                            Log::info('Skipped approval', [
                                'approval_id' => $approval->id,
                                'user_id' => $approval->user_id,
                            ]);
                        });
                    }
                }
            }
        }
    }

    /**
     * Request revision for the document (step-level).
     * This does NOT reset previous approvals.
     */
    public function requestRevision(Request $request, DokumenApproval $approval)
    {
        // Ensure user can request revision
        if ($approval->user_id !== Auth::id() || !$approval->isPending()) {
            return back()->withErrors(['error' => 'Anda tidak dapat melakukan request revision ini.']);
        }

        $validated = $request->validate([
            'revision_notes' => 'required|string|max:2000',
        ]);

        DB::beginTransaction();
        try {
            // Update THIS approval only to revision_requested
            $approval->requestRevision($validated['revision_notes'], Auth::id());

            // Update document status to needs_revision
            $approval->dokumen->update([
                'status' => 'needs_revision',
                'status_current' => 'revision_requested_step_' . ($approval->masterflowStep->step_order ?? 0),
            ]);

            // Add comment
            \App\Models\Comment::create([
                'dokumen_id' => $approval->dokumen_id,
                'content' => 'Revisi diminta oleh ' . Auth::user()->name . ': ' . $validated['revision_notes'],
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            // Log revision
            RevisionLog::create([
                'dokumen_id' => $approval->dokumen_id,
                'dokumen_version_id' => $approval->dokumen_version_id,
                'user_id' => Auth::id(),
                'action' => RevisionLog::ACTION_REVISION_REQUESTED,
                'notes' => $validated['revision_notes'],
            ]);

            // Send email notification to owner
            $dokumen = $approval->dokumen->fresh(['user']);
            if ($dokumen->user?->email) {
                Mail::to($dokumen->user->email)
                    ->queue(new RevisionRequestedMail($dokumen, $approval));
            }

            // Broadcast event (minimal payload)
            $dokumenForBroadcast = $approval->dokumen->fresh();

            broadcast(new DokumenUpdated($dokumenForBroadcast))->toOthers();
            broadcast(new UserDokumenUpdated($dokumenForBroadcast))->toOthers();

            // Broadcast browser notification to document owner
            broadcast(new BrowserNotificationEvent(
                userId: $dokumen->user_id,
                title: 'Revisi Dokumen Diminta',
                body: "Dokumen '{$dokumen->judul_dokumen}' membutuhkan revisi. Catatan: " . \Illuminate\Support\Str::limit($validated['revision_notes'], 50),
                url: route('dokumen.show', $dokumen->id),
                type: 'warning'
            ));

            DB::commit();

            return redirect()->route('approvals.index')
                ->with('success', 'Request revisi berhasil dikirim ke pemilik dokumen.');
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to request revision', [
                'approval_id' => $approval->id,
                'error' => $e->getMessage(),
            ]);
            return back()->withErrors(['error' => 'Gagal mengirim request revisi: ' . $e->getMessage()]);
        }
    }
}
