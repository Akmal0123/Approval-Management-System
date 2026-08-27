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
use App\Jobs\SendApprovalNotification;
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
            ->orderBy('created_at', 'desc');

        // Context-based filtering (Super Admin sees all approvals)
        if (!$this->contextService->isSuperAdmin()) {
            $query->byUser(Auth::id());

            $companyId = $this->contextService->getCurrentCompanyId();
            $aplikasiId = $this->contextService->getCurrentAplikasiId();

            $query->whereHas('dokumen', function ($q) use ($companyId, $aplikasiId) {
                if ($companyId) {
                    $q->where(function ($subQ) use ($companyId) {
                        $subQ->where('company_id', $companyId)
                             ->orWhereNull('company_id')
                             ->orWhere('user_id', Auth::id());
                    });
                }
                if ($aplikasiId) {
                    $q->where(function ($subQ) use ($aplikasiId) {
                        $subQ->where('aplikasi_id', $aplikasiId)
                             ->orWhereNull('aplikasi_id')
                             ->orWhere('user_id', Auth::id());
                    });
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
        $statsBaseQuery = DokumenApproval::query();

        if (!$this->contextService->isSuperAdmin()) {
            $statsBaseQuery->byUser(Auth::id());

            $companyId = $this->contextService->getCurrentCompanyId();
            $aplikasiId = $this->contextService->getCurrentAplikasiId();

            $statsBaseQuery->whereHas('dokumen', function ($q) use ($companyId, $aplikasiId) {
                if ($companyId) {
                    $q->where(function ($subQ) use ($companyId) {
                        $subQ->where('company_id', $companyId)
                             ->orWhereNull('company_id')
                             ->orWhere('user_id', Auth::id());
                    });
                }
                if ($aplikasiId) {
                    $q->where(function ($subQ) use ($aplikasiId) {
                        $subQ->where('aplikasi_id', $aplikasiId)
                             ->orWhereNull('aplikasi_id')
                             ->orWhere('user_id', Auth::id());
                    });
                }
            });
        }

        $stats = [
            'pending' => (clone $statsBaseQuery)->pending()->count(),
            'revision_requested' => (clone $statsBaseQuery)->where('approval_status', 'revision_requested')->count(),
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
        if (!$this->canUserPerformApproval($approval, Auth::id())) {
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

        $allApprovals = DokumenApproval::where('dokumen_id', $approval->dokumen_id)
            ->with(['user.profile', 'masterflowStep.jabatan'])
            ->orderBy('approval_order')
            ->get();

        $isSuperAdmin = $this->contextService->isSuperAdmin();
        $isAssignedUser = (int)$approval->user_id === (int)Auth::id() || ($approval->approver_email && strtolower($approval->approver_email) === strtolower(Auth::user()?->email));
        $canApprove = in_array($approval->approval_status, ['pending', 'waiting']) && ($isSuperAdmin || $isAssignedUser || $approval->canCurrentlyApprove());

        return Inertia::render('approvals/show', [
            'approval' => $approval,
            'allApprovals' => $allApprovals,
            'canApprove' => $canApprove,
        ]);
    }

    /**
     * Check if user is authorized to perform approval actions for this record.
     */
    private function canUserPerformApproval(DokumenApproval $approval, int $userId): bool
    {
        if ($this->contextService->isSuperAdmin()) {
            return true;
        }

        if ($approval->user_id === $userId) {
            return true;
        }

        if ($approval->dokumen && (int)$approval->dokumen->user_id === (int)$userId) {
            return true;
        }

        $user = Auth::user();
        if ($user) {
            if ($approval->approver_email && strtolower($approval->approver_email) === strtolower($user->email)) {
                return true;
            }

            if ($approval->masterflow_step_id) {
                $userJabatanIds = $user->userAuths->pluck('jabatan_id')->filter()->toArray();
                $stepJabatanId = $approval->masterflowStep?->jabatan_id;
                if ($stepJabatanId && in_array($stepJabatanId, $userJabatanIds)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Approve the document.
     */
    public function approve(Request $request, DokumenApproval $approval, PdfSignatureService $pdfSignatureService)
    {
        if (!$this->canUserPerformApproval($approval, Auth::id()) || !$approval->canCurrentlyApprove()) {
            return back()->withErrors(['error' => 'Anda tidak dapat melakukan approval ini. Pastikan tahap sebelumnya sudah selesai.']);
        }

        if (!$approval->relationLoaded('dokumenVersion')) {
            $approval->load('dokumenVersion');
        }

        $validated = $request->validate([
            'comment' => 'nullable|string|max:1000',
            'signature' => 'required|string',
            'signature_position' => 'nullable|string|in:bottom_right,bottom_left,bottom_center',
        ]);

        $signaturePath = null;
        $signatureData = $validated['signature'];

        if (str_starts_with($signatureData, 'data:image')) {
            $image = preg_replace('#^data:image/\w+;base64,#i', '', $signatureData);
            $image = str_replace(' ', '+', $image);
            $imageData = base64_decode($image);

            if ($imageData !== false && strlen($imageData) > 0) {
                $filename = 'approval_signature_' . time() . '_' . \Illuminate\Support\Str::random(10) . '.png';
                $path = 'signatures/approvals/' . $approval->id . '/' . $filename;
                \Illuminate\Support\Facades\Storage::disk('public')->put($path, $imageData);
                $signaturePath = $path;
            }
        } else {
            $parsedUrl = parse_url($signatureData, PHP_URL_PATH) ?? $signatureData;
            $cleanPath = preg_replace('#^/(storage-token|storage)/#i', '', $parsedUrl);
            $cleanPath = ltrim($cleanPath, '/');

            if ($cleanPath && \Illuminate\Support\Facades\Storage::disk('public')->exists($cleanPath)) {
                $signaturePath = $cleanPath;
            }
        }

        if (!$signaturePath || !\Illuminate\Support\Facades\Storage::disk('public')->exists($signaturePath)) {
            $user = Auth::user();
            $userSig = $user?->defaultSignature?->signature_path ?? $user?->signatures()?->first()?->signature_path;
            if ($userSig && \Illuminate\Support\Facades\Storage::disk('public')->exists($userSig)) {
                $signaturePath = $userSig;
            }
        }

        DB::beginTransaction();
        try {
            // 1. Approve approval saat ini
            $approval->update([
                'approval_status' => 'approved',
                'tgl_approve' => now(),
                'comment' => $validated['comment'],
                'signature_path' => $signaturePath,
            ]);

            if ($validated['comment']) {
                \App\Models\Comment::create([
                    'dokumen_id' => $approval->dokumen_id,
                    'content' => 'Approved: ' . $validated['comment'],
                    'user_id' => Auth::id(),
                    'created_at_custom' => now(),
                ]);
            }

            // 2. Cek & Update Status Dokumen & Aktifkan Step Berikutnya
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

        // Post-processing
        try {
            $dokumen = $approval->dokumen->fresh();

            broadcast(new DokumenUpdated($dokumen))->toOthers();
            broadcast(new UserDokumenUpdated($dokumen))->toOthers();

            if ($dokumen && $dokumen->user_id) {
                $isFullyApproved = $dokumen->status === 'approved';
                broadcast(new BrowserNotificationEvent(
                    userId: $dokumen->user_id,
                    title: $isFullyApproved ? 'Dokumen Disetujui Sepenuhnya 🎉' : 'Tahap Persetujuan Disetujui ✅',
                    body: $isFullyApproved
                        ? "Dokumen '{$dokumen->judul_dokumen}' telah selesai disetujui oleh semua pihak!"
                        : "Dokumen '{$dokumen->judul_dokumen}' telah disetujui pada tahap ini.",
                    url: route('dokumen.show', $dokumen->id),
                    type: $isFullyApproved ? 'success' : 'info'
                ));
            }
        } catch (\Exception $e) {
            Log::error('Post-approval processing failed', [
                'error' => $e->getMessage(),
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
        if (!$this->canUserPerformApproval($approval, Auth::id()) || !$approval->canCurrentlyApprove()) {
            return back()->withErrors(['error' => 'Anda tidak dapat melakukan rejection ini. Pastikan tahap sebelumnya sudah selesai.']);
        }

        $validated = $request->validate([
            'alasan_reject' => 'required|string|max:1000',
            'comment' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $currentStepNumber = $approval->masterflowStep?->step_order ?? $approval->approval_order ?? 1;

            $approval->reject($validated['alasan_reject'], $validated['comment']);

            // Cancel pending & waiting approvals
            DokumenApproval::where('dokumen_id', $approval->dokumen_id)
                ->whereIn('approval_status', ['pending', 'waiting'])
                ->update([
                    'approval_status' => 'cancelled',
                    'tgl_approve' => now(),
                    'comment' => 'Auto-cancelled: Document rejected at step ' . $currentStepNumber,
                ]);

            $approval->dokumen->update([
                'status' => 'rejected',
                'status_current' => 'rejected',
            ]);

            \App\Models\Comment::create([
                'dokumen_id' => $approval->dokumen_id,
                'content' => 'Rejected: ' . $validated['alasan_reject'],
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            $dokumen = $approval->dokumen->fresh();

            try {
                broadcast(new DokumenUpdated($dokumen))->toOthers();
                broadcast(new UserDokumenUpdated($dokumen))->toOthers();

                $dokumenWithUser = $approval->dokumen->fresh(['user']);
                $targetEmail = $dokumenWithUser->user?->email;
                if (!$targetEmail || str_ends_with(strtolower($targetEmail), '@example.com')) {
                    $targetEmail = Auth::user()?->email ?? 'cukakyay@gmail.com';
                }
                Mail::to($targetEmail)->send(new DocumentRejectedMail($dokumenWithUser, $approval));

                if (isset($dokumenWithUser) && $dokumenWithUser->user_id) {
                    broadcast(new BrowserNotificationEvent(
                        userId: $dokumenWithUser->user_id,
                        title: 'Dokumen Ditolak',
                        body: "Dokumen '{$dokumenWithUser->judul_dokumen}' telah ditolak. Alasan: " . \Illuminate\Support\Str::limit($validated['alasan_reject'], 50),
                        url: route('dokumen.show', $dokumenWithUser->id),
                        type: 'error'
                    ));
                }
            } catch (\Throwable $bEx) {
                Log::warning('Failed to send broadcast/email on rejection: ' . $bEx->getMessage());
            }

            RevisionLog::create([
                'dokumen_id' => $approval->dokumen_id,
                'dokumen_version_id' => $approval->dokumen_version_id,
                'user_id' => Auth::id(),
                'action' => RevisionLog::ACTION_REJECTED,
                'notes' => $validated['alasan_reject'],
            ]);

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
        if (
            $approval->user_id !== Auth::id() ||
            !$approval->isPending() ||
            $approval->masterflowStep?->is_required
        ) {
            return back()->withErrors(['error' => 'Approval ini tidak dapat di-skip.']);
        }

        $validated = $request->validate([
            'comment' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $approval->update([
                'approval_status' => 'skipped',
                'tgl_approve' => now(),
                'comment' => $validated['comment'],
            ]);

            if ($validated['comment']) {
                \App\Models\Comment::create([
                    'dokumen_id' => $approval->dokumen_id,
                    'content' => 'Skipped: ' . $validated['comment'],
                    'user_id' => Auth::id(),
                    'created_at_custom' => now(),
                ]);
            }

            $this->checkAndUpdateDocumentStatus($approval->dokumen);

            DB::commit();

            return redirect()->route('approvals.index')
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
        if ($approval->user_id !== Auth::id() || !$approval->isPending()) {
            return back()->withErrors(['error' => 'Anda tidak dapat mendelegasikan approval ini.']);
        }

        $validated = $request->validate([
            'delegate_to' => 'required|exists:users,id',
            'comment' => 'nullable|string|max:1000',
        ]);

        $targetUser = \App\Models\User::with('profile')->find($validated['delegate_to']);
        if (
            !$targetUser ||
            $targetUser->profile->jabatan_id !== $approval->masterflowStep?->jabatan_id
        ) {
            return back()->withErrors(['error' => 'User yang dipilih tidak memiliki jabatan yang sesuai.']);
        }

        DB::beginTransaction();
        try {
            $approval->update([
                'user_id' => $validated['delegate_to'],
            ]);

            \App\Models\Comment::create([
                'dokumen_id' => $approval->dokumen_id,
                'content' => 'Approval didelegasikan kepada ' . $targetUser->name .
                    ($validated['comment'] ? ': ' . $validated['comment'] : ''),
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            SendApprovalNotification::dispatch($approval->fresh());

            DB::commit();

            return redirect()->route('approvals.index')
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

        $recentApprovals = DokumenApproval::byUser($userId)
            ->with(['dokumen.user', 'masterflowStep.jabatan'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

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
     * Check and update document status based on approvals & advance sequential steps.
     */
    private function checkAndUpdateDocumentStatus(Dokumen $dokumen)
    {
        $validator = new ApprovalGroupValidator();
        $allApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)->get();

        Log::info('Starting document status check', [
            'dokumen_id' => $dokumen->id,
            'total_approvals' => $allApprovals->count(),
        ]);

        if ($allApprovals->contains('approval_status', 'rejected')) {
            $dokumen->update([
                'status' => 'rejected',
                'status_current' => 'rejected',
            ]);
            return;
        }

        // =========================================================================
        // 1. LOGIKA PENGECEKAN BATAS NOMINAL (< 5 JUTA)
        // =========================================================================
        $nominal = (float) ($dokumen->nominal ?? 0);
        $threshold = 5000000; // Rp 5.000.000

        if ($nominal > 0 && $nominal < $threshold) {
            // Cek persetujuan order 1 & 2 (Biasanya SPV & Manager)
            $step1And2Approvals = $allApprovals->filter(function ($approval) {
                return in_array($approval->approval_order, [1, 2]);
            });

            $isStep1And2Complete = $step1And2Approvals->every(function ($approval) {
                return in_array($approval->approval_status, ['approved', 'skipped']);
            });

            if ($isStep1And2Complete && $step1And2Approvals->isNotEmpty()) {
                // Auto-skip persetujuan untuk step >= 3 (Kepala Divisi ke atas)
                $allApprovals->filter(function ($approval) {
                    return $approval->approval_order >= 3 && in_array($approval->approval_status, ['pending', 'waiting']);
                })->each(function ($approval) {
                    $approval->update([
                        'approval_status' => 'skipped',
                        'tgl_approve' => now(),
                        'comment' => 'Otomatis di-skip karena nominal dokumen di bawah Rp 5.000.000.',
                    ]);
                });

                // Set status dokumen menjadi approved
                $dokumen->update([
                    'status' => 'approved',
                    'status_current' => 'fully_approved',
                ]);

                // Kirim Notifikasi Email
                $dokumenWithUser = $dokumen->fresh(['user']);
                $targetEmail = $dokumenWithUser->user?->email;
                if (!$targetEmail || str_ends_with(strtolower($targetEmail), '@example.com')) {
                    $targetEmail = Auth::user()?->email ?? 'cukakyay@gmail.com';
                }
                Mail::to($targetEmail)->send(new DocumentFullyApprovedMail($dokumenWithUser));

                Log::info('Document auto-approved: Nominal under 5M, step 3+ skipped.');
                return;
            }
        }

        // =========================================================================
        // 2. PENGECEKAN KELENGKAPAN GRUP APPROVAL
        // =========================================================================
        $groupedApprovals = $allApprovals->groupBy('group_index');

        foreach ($groupedApprovals as $groupIndex => $groupApprovals) {
            if (is_null($groupIndex)) {
                continue;
            }

            $groupStatus = $validator->isGroupComplete($dokumen->id, $groupIndex);

            if ($groupStatus['is_complete'] && $groupStatus['status'] === 'approved') {
                $jenisGroup = $groupApprovals->first()->jenis_group;

                if (in_array($jenisGroup, ['any_one', 'majority'])) {
                    $pendingApprovals = $groupApprovals->whereIn('approval_status', ['pending', 'waiting']);

                    if ($pendingApprovals->count() > 0) {
                        $pendingApprovals->each(function ($approval) {
                            $approval->update([
                                'approval_status' => 'skipped',
                                'tgl_approve' => now(),
                                'comment' => 'Otomatis di-skip karena grup sudah menyelesaikan approval.',
                            ]);
                        });
                    }
                }
            }
        }

        // Fresh reload approvals after group skipped updates
        $allApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)->get();

        // =========================================================================
        // 3. LOGIKA BERTAHAP (SEQUENTIAL TRANSITION): AKTIFKAN STEP BERIKUTNYA
        // =========================================================================
        // Cari min approval_order yang masih 'waiting'
        $nextOrder = $allApprovals->where('approval_status', 'waiting')->min('approval_order');

        if ($nextOrder) {
            // Ambil order terbawah yang belum selesai (pending/waiting)
            $currentActiveOrder = $allApprovals->whereIn('approval_status', ['pending', 'waiting'])->min('approval_order');

            // Aktifkan semua record approval di order aktif tersebut dari 'waiting' ke 'pending'
            $nextApprovalsToActivate = $allApprovals->where('approval_order', $currentActiveOrder)->where('approval_status', 'waiting');

            foreach ($nextApprovalsToActivate as $nextApp) {
                $nextApp->update(['approval_status' => 'pending']);

                // Kirim notifikasi email & browser ke approver berikutnya
                try {
                    SendApprovalNotification::dispatch($nextApp);

                    if ($nextApp->user_id) {
                        broadcast(new BrowserNotificationEvent(
                            userId: $nextApp->user_id,
                            title: 'Dokumen Membutuhkan Persetujuan Anda',
                            body: "Dokumen '{$dokumen->judul_dokumen}' telah sampai pada giliran Anda.",
                            url: route('approvals.show', $nextApp->id),
                            type: 'info'
                        ));
                    }
                } catch (\Throwable $ex) {
                    Log::warning('Failed to notify next approver ID ' . $nextApp->id . ': ' . $ex->getMessage());
                }
            }

            $dokumen->update([
                'status' => 'under_review',
                'status_current' => 'waiting_approval_' . $currentActiveOrder,
            ]);
            return;
        }

        // =========================================================================
        // 4. JIKA TIDAK ADA 'PENDING' DAN 'WAITING' LAGI -> FULLY APPROVED
        // =========================================================================
        $hasUnfinished = $allApprovals->contains(function ($app) {
            return in_array($app->approval_status, ['pending', 'waiting']);
        });

        if (!$hasUnfinished) {
            Log::info('Document status: fully approved (all steps complete)');
            $dokumen->update([
                'status' => 'approved',
                'status_current' => 'fully_approved',
            ]);

            $dokumenWithUser = $dokumen->fresh(['user']);
            $targetEmail = $dokumenWithUser->user?->email;
            if (!$targetEmail || str_ends_with(strtolower($targetEmail), '@example.com')) {
                $targetEmail = Auth::user()?->email ?? 'cukakyay@gmail.com';
            }
            Mail::to($targetEmail)->send(new DocumentFullyApprovedMail($dokumenWithUser));
        } else {
            $dokumen->update([
                'status' => 'under_review',
                'status_current' => 'waiting_approval',
            ]);
        }
    }

    /**
     * Request revision for the document (step-level).
     */
    public function requestRevision(Request $request, DokumenApproval $approval)
    {
        if (!$this->canUserPerformApproval($approval, Auth::id()) || in_array($approval->approval_status, ['approved', 'rejected'])) {
            return back()->withErrors(['error' => 'Anda tidak dapat melakukan request revision ini.']);
        }

        $validated = $request->validate([
            'revision_notes' => 'required|string|max:2000',
        ]);

        DB::beginTransaction();
        try {
            $approval->update([
                'approval_status' => 'revision_requested',
                'tgl_approve' => now(),
                'comment' => $validated['revision_notes'],
            ]);

            // Reset TTD dan status 'approved' sebelumnya menjadi 'pending'
            DokumenApproval::where('dokumen_id', $approval->dokumen_id)
                ->where('id', '!=', $approval->id)
                ->where('approval_status', 'approved')
                ->update([
                    'approval_status' => 'pending',
                    'signature_path' => null,
                    'tgl_approve' => null,
                ]);

            $approval->dokumen->update([
                'status' => 'needs_revision',
                'status_current' => 'revision_requested_step_' . ($approval->masterflowStep?->step_order ?? $approval->approval_order ?? 1),
            ]);

            \App\Models\Comment::create([
                'dokumen_id' => $approval->dokumen_id,
                'content' => 'Revisi diminta oleh ' . Auth::user()->name . ': ' . $validated['revision_notes'],
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            RevisionLog::create([
                'dokumen_id' => $approval->dokumen_id,
                'dokumen_version_id' => $approval->dokumen_version_id,
                'user_id' => Auth::id(),
                'action' => RevisionLog::ACTION_REVISION_REQUESTED,
                'notes' => $validated['revision_notes'],
            ]);

            $dokumen = $approval->dokumen->fresh(['user']);
            $targetEmail = $dokumen->user?->email;
            if (!$targetEmail || str_ends_with(strtolower($targetEmail), '@example.com')) {
                $targetEmail = Auth::user()?->email ?? 'cukakyay@gmail.com';
            }
            Mail::to($targetEmail)->send(new RevisionRequestedMail($dokumen, $approval));

            $dokumenForBroadcast = $approval->dokumen->fresh();

            broadcast(new DokumenUpdated($dokumenForBroadcast))->toOthers();
            broadcast(new UserDokumenUpdated($dokumenForBroadcast))->toOthers();

            broadcast(new BrowserNotificationEvent(
                userId: $dokumen->user_id,
                title: 'Revisi Dokumen Diminta',
                body: "Dokumen '{$dokumen->judul_dokumen}' membutuhkan revisi. Catatan: " . \Illuminate\Support\Str::limit($validated['revision_notes'], 50),
                url: route('dokumen.show', $dokumen->id),
                type: 'warning'
            ));

            DB::commit();

            return redirect()->route('approvals.index')
                ->with('success', 'Request revisi berhasil dikirim. Seluruh tanda tangan sebelumnya telah di-reset.');
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