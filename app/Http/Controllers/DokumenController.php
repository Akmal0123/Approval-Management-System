<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\DokumenApproval;
use App\Models\Masterflow;
use App\Models\Comment;
use App\Models\RevisionLog;
use App\Models\User;
use App\Models\MasterTransaksi;
use App\Events\ApprovalCreated;
use App\Events\BrowserNotificationEvent;
use App\Jobs\SendApprovalNotification;
use App\Mail\ApprovalRequestMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Services\ContextService;
use App\Services\PdfSignatureService;


class DokumenController extends Controller
{
    protected ContextService $contextService;

    public function __construct(ContextService $contextService)
    {
        $this->contextService = $contextService;
    }

    /**
     * API: Get list of documents (returns JSON).
     */
    public function apiIndex(Request $request)
    {
        $query = Dokumen::with(['user', 'masterflow', 'latestVersion', 'approvals.user'])
            ->orderBy('created_at', 'desc');

        if (!$this->contextService->isSuperAdmin()) {
            $companyId = $this->contextService->getCurrentCompanyId();
            $aplikasiId = $this->contextService->getCurrentAplikasiId();

            if ($companyId) {
                $query->where('company_id', $companyId);
            }
            if ($aplikasiId) {
                $query->where('aplikasi_id', $aplikasiId);
            }
        }

        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        if ($request->filled('status_current')) {
            $query->byCurrentStatus($request->status_current);
        }

        if ($request->filled('my_documents')) {
            $query->byUser(Auth::id());
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('judul_dokumen', 'like', '%' . $request->search . '%')
                    ->orWhere('deskripsi', 'like', '%' . $request->search . '%');
            });
        }

        $dokumen = $query->get();

        // Add detailed status to each dokumen and auto-heal orphan submitted documents
        $dokumen->each(function ($doc) {
            if ($doc->status === 'submitted' && $doc->approvals->isEmpty()) {
                try {
                    DokumenApproval::create([
                        'dokumen_id' => $doc->id,
                        'user_id' => 1, // Default Super Admin
                        'approval_order' => 1,
                        'dokumen_version_id' => $doc->latestVersion?->id ?? 1,
                        'approval_status' => 'pending',
                        'tgl_deadline' => $doc->tgl_deadline,
                    ]);
                    $doc->load('approvals');
                } catch (\Throwable $th) {
                    // Ignore if already exists
                }
            }
            $doc->detailed_status = $doc->getDetailedStatus();
        });

        return response()->json([
            'data' => $dokumen,
            'success' => true,
        ]);
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Dokumen::with(['user', 'masterflow', 'latestVersion', 'approvals.user'])
            ->orderBy('created_at', 'desc');

        if (!$this->contextService->isSuperAdmin()) {
            $companyId = $this->contextService->getCurrentCompanyId();
            $aplikasiId = $this->contextService->getCurrentAplikasiId();

            if ($companyId) {
                $query->where('company_id', $companyId);
            }
            if ($aplikasiId) {
                $query->where('aplikasi_id', $aplikasiId);
            }
        }

        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        if ($request->filled('status_current')) {
            $query->byCurrentStatus($request->status_current);
        }

        if ($request->filled('my_documents')) {
            $query->byUser(Auth::id());
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('judul_dokumen', 'like', '%' . $request->search . '%')
                    ->orWhere('deskripsi', 'like', '%' . $request->search . '%');
            });
        }

        $dokumen = $query->get();

        // Add detailed status to each dokumen and auto-heal orphan submitted documents
        $dokumen->each(function ($doc) {
            if ($doc->status === 'submitted' && $doc->approvals->isEmpty()) {
                try {
                    DokumenApproval::create([
                        'dokumen_id' => $doc->id,
                        'user_id' => 1, // Default Super Admin
                        'approval_order' => 1,
                        'dokumen_version_id' => $doc->latestVersion?->id ?? 1,
                        'approval_status' => 'pending',
                        'tgl_deadline' => $doc->tgl_deadline,
                    ]);
                    $doc->load('approvals');
                } catch (\Throwable $th) {
                    // Ignore if already exists
                }
            }
            $doc->detailed_status = $doc->getDetailedStatus();
        });

        return response()->json([
            'data' => $dokumen,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $query = Masterflow::where('is_active', true);
        $transaksiQuery = MasterTransaksi::where('is_active', true);

        if (!$this->contextService->isSuperAdmin()) {
            $companyId = $this->contextService->getCurrentCompanyId();
            $aplikasiId = $this->contextService->getCurrentAplikasiId();
            if ($companyId) {
                $query->where('company_id', $companyId);
            }
            if ($aplikasiId) {
                $transaksiQuery->where('aplikasi_id', $aplikasiId);
            }
        }

        $masterflows = $query->get();
        $transaksis = $transaksiQuery->with('aplikasi')->get();

        return Inertia::render('Dokumen/Create', [
            'masterflows' => $masterflows,
            'transaksis' => $transaksis,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    /**
     * Store a newly created resource in storage.
     */
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $context = $this->contextService->getContext();
        if (!$context) {
            return back()->withErrors(['error' => 'User tidak memiliki akses ke company atau aplikasi.']);
        }

        if ($request->has('id_dokumen')) {
            $nomor = $request->input('id_dokumen');
            if (Dokumen::where('id_dokumen', $nomor)->exists()) {
                $newNomor = $nomor . '-' . rand(1000, 9999);
                $request->merge(['id_dokumen' => $newNomor]);
            }
        }

        $isFileWajib = $request->input('kategori_dokumen') === 'manual' || 
                       ($request->input('kategori_dokumen') === 'transaksi' && $request->input('metode_dokumen') === 'upload_manual');

        $rules = [
            'id_dokumen'       => 'required|string',
            'nomor_dokumen'    => 'nullable|string',
            'master_transaksi_id' => 'nullable|exists:master_transaksis,id',
            'kategori_dokumen' => 'nullable|string|in:manual,transaksi',
            'metode_dokumen'   => 'nullable|string|in:template,upload_manual',
            'tipe_dokumen'     => 'nullable|string',
            'judul_dokumen'    => 'required|string|max:255',
            'tgl_pengajuan'    => 'required|date',
            'tgl_deadline'     => 'required|date|after_or_equal:tgl_pengajuan',
            'deskripsi'        => 'nullable|string',
            'file'             => ($isFileWajib ? 'required' : 'nullable') . '|file|mimes:pdf|max:10240',
            'submit_type'      => 'required|in:draft,submit',
            'masterflow_id'    => 'nullable',
            'custom_approvers' => 'nullable|array',
            'approvers'        => 'nullable|array',
            'step_approvers'   => 'nullable|array',
        ];

        $validated = $request->validate($rules);

        DB::beginTransaction();
        try {
            $submitType = $validated['submit_type'];
            $status = $submitType === 'draft' ? 'draft' : 'submitted';
            $statusCurrent = $submitType === 'draft' ? 'draft' : 'waiting_approval_1';
            $masterflowIdVal = ($request->masterflow_id === 'custom' || empty($request->masterflow_id)) ? null : $request->masterflow_id;

            // 1. Buat Dokumen
            $dokumen = Dokumen::create([
                'id_dokumen'       => $validated['id_dokumen'],
                'nomor_dokumen'    => $validated['nomor_dokumen'] ?? null,
                'master_transaksi_id' => $validated['master_transaksi_id'] ?? null,
                'kategori_dokumen' => $validated['kategori_dokumen'] ?? 'manual',
                'tipe_dokumen'     => $validated['tipe_dokumen'] ?? null,
                'judul_dokumen'    => $validated['judul_dokumen'],
                'user_id'          => Auth::id(),
                'company_id'       => $context->company_id,
                'aplikasi_id'      => $context->aplikasi_id,
                'masterflow_id'    => $masterflowIdVal,
                'status'           => $status,
                'tgl_pengajuan'    => $validated['tgl_pengajuan'],
                'tgl_deadline'     => $validated['tgl_deadline'],
                'deskripsi'        => $validated['deskripsi'] ?? null,
                'status_current'   => $statusCurrent,
            ]);

            // 2. SIMPAN APPROVAL TERLEBIH DAHULU
            if ($request->masterflow_id === 'custom') {
                $customApprovers = $request->input('custom_approvers', []);
                if (!empty($customApprovers)) {
                    foreach ($customApprovers as $index => $approver) {
                        $email = trim($approver['email'] ?? '');
                        if (!empty($email)) {
                            $matchedUser = User::where('email', $email)->first();
                            DokumenApproval::create([
                                'dokumen_id'      => $dokumen->id,
                                'user_id'         => $matchedUser?->id ?? null,
                                'approver_email'  => $email,
                                'approval_order'  => $approver['order'] ?? ($index + 1),
                                'approval_status' => 'pending',
                                'tgl_deadline'    => $validated['tgl_deadline'],
                            ]);
                        }
                    }
                }
            } else if (!empty($validated['masterflow_id'])) {
                $masterflow = Masterflow::with('steps.jabatan')->find($validated['masterflow_id']);
                if ($masterflow && $masterflow->steps) {
                    foreach ($masterflow->steps as $step) {
                        $userId = $request->input("approvers.{$step->id}");

                        // Jika approver tidak dipilih di dropdown, cari user yang punya jabatan ini
                        if (empty($userId)) {
                            $fallbackUser = User::whereHas('userAuths', function ($q) use ($step) {
                                $q->where('jabatan_id', $step->jabatan_id);
                            })->first();
                            $userId = $fallbackUser?->id ?? Auth::id();
                        }

                        DokumenApproval::create([
                            'dokumen_id'         => $dokumen->id,
                            'user_id'            => $userId,
                            'masterflow_step_id' => $step->id,
                            'approval_order'     => $step->step_order,
                            'approval_status'    => 'pending',
                            'tgl_deadline'       => $validated['tgl_deadline'],
                        ]);
                    }
                }
            }

            // 3. GENERATE FILE / TEMPLATE PDF
            $folderPath = 'dokumen/' . $validated['id_dokumen'];
            $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $validated['judul_dokumen']);
            $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);

            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $extension = $file->getClientOriginalExtension();
                $filename = $validated['id_dokumen'] . '_' . $cleanJudul . '_v1.' . $extension;
                $path = $file->storeAs($folderPath, $filename, 'public');
                $originalName = $file->getClientOriginalName();
                $fileSize = $file->getSize();
            } else {
                $filename = $validated['id_dokumen'] . '_' . $cleanJudul . '_v1.pdf';
                $path = $folderPath . '/' . $filename;
                $extension = 'pdf';
                $originalName = $filename;

                // Ambil daftar approval yang baru saja tersimpan di DB
                $listApprovals = DokumenApproval::with(['user', 'masterflowStep.jabatan'])
                    ->where('dokumen_id', $dokumen->id)
                    ->orderBy('approval_order', 'asc')
                    ->get();

                $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('templates.dokumen_transaksi', [
                    'dokumen'   => $dokumen->load(['user', 'company']),
                    'approvals' => $listApprovals,
                ])->setPaper('a4', 'portrait');

                Storage::disk('public')->put($path, $pdf->output());
                $fileSize = Storage::disk('public')->size($path);
            }

            // 4. Catat Versi Dokumen
            $version = DokumenVersion::create([
                'dokumen_id' => $dokumen->id,
                'version'    => '1.0',
                'nama_file'  => $originalName,
                'tgl_upload' => now(),
                'tipe_file'  => $extension,
                'file_url'   => $path,
                'size_file'  => $fileSize,
                'status'     => 'active',
            ]);

            $dokumen->approvals()->update(['dokumen_version_id' => $version->id]);

            DB::commit();

            return back()->with([
                'success' => 'Dokumen berhasil dibuat!',
                'dokumen' => $dokumen->load(['user', 'masterflow', 'latestVersion', 'approvals.user']),
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error creating dokumen: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Gagal membuat dokumen: ' . $e->getMessage()])->withInput();
        }
    }
    /**
     * Display the specified resource.
     */
    public function show(Request $request, $id)
{
    $dokumen = Dokumen::where('id', $id)->first();

    if (!$dokumen) {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(['message' => 'Dokumen tidak ditemukan'], 404);
        }
        return back()->withErrors(['error' => 'Dokumen tidak ditemukan.']);
    }

    $isOwner       = $dokumen->user_id === Auth::id();
    $isSuperAdmin  = $this->contextService->isSuperAdmin();
    $isSameCompany = $dokumen->company_id === $this->contextService->getCurrentCompanyId();

    if (!$isOwner && !$isSuperAdmin && !$isSameCompany) {
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        return back()->withErrors(['error' => 'Anda tidak memiliki akses ke dokumen ini.']);
    }

        $dokumen->load([
            'user',
            'company',
            'aplikasi',
            'masterflow.steps.jabatan',
            'versions' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
            'approvals' => function ($query) {
                $query->with(['user', 'masterflowStep.jabatan']);
            },
        ]);

        $dokumen->detailed_status = $dokumen->getDetailedStatus();

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json($dokumen);
        }

        return Inertia::render('dokumen/show', [
            'dokumen' => $dokumen,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Dokumen $dokumen)
    {
        if (!in_array($dokumen->status, ['draft', 'rejected'])) {
            return redirect()->route('dokumen.show', $dokumen->id)
                ->withErrors(['error' => 'Dokumen tidak dapat diedit dalam status ini.']);
        }

        $masterflows = Masterflow::where('is_active', true)->get();

        return Inertia::render('Dokumen/Edit', [
            'dokumen' => $dokumen,
            'masterflows' => $masterflows,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Dokumen $dokumen)
    {
        if (!in_array($dokumen->status, ['draft', 'rejected'])) {
            return redirect()->route('dokumen.show', $dokumen->id)
                ->withErrors(['error' => 'Dokumen tidak dapat diupdate dalam status ini.']);
        }

        $validated = $request->validate([
            'judul_dokumen' => 'required|string|max:255',
            'tgl_deadline' => 'nullable|date',
            'deskripsi' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf|max:10240',
        ]);

        DB::beginTransaction();
        try {
            $dokumen->update([
                'judul_dokumen' => $validated['judul_dokumen'],
                'tgl_deadline' => $validated['tgl_deadline'] ?? $dokumen->tgl_deadline,
                'deskripsi' => $validated['deskripsi'] ?? $dokumen->deskripsi,
            ]);

            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $folderPath = 'dokumen/' . $dokumen->id_dokumen;

                $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
                $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);

                $latestVersion = $dokumen->versions()->latest()->first();
                $versionParts = explode('.', $latestVersion->version);
                $newVersion = $versionParts[0] . '.' . ((int)$versionParts[1] + 1);

                $extension = $file->getClientOriginalExtension();
                $versionNumber = str_replace('.', '', $newVersion);
                $filename = $dokumen->id_dokumen . '_' . $cleanJudul . '_v' . $versionNumber . '.' . $extension;

                $path = $file->storeAs($folderPath, $filename, 'public');

                $dokumen->versions()->update(['status' => 'inactive']);

                DokumenVersion::create([
                    'dokumen_id' => $dokumen->id,
                    'version' => $newVersion,
                    'nama_file' => $file->getClientOriginalName(),
                    'tgl_upload' => now(),
                    'tipe_file' => $extension,
                    'file_url' => $path,
                    'size_file' => $file->getSize(),
                    'status' => 'active',
                ]);
            }

            DB::commit();

            return redirect()->back()->with('success', 'Dokumen berhasil diupdate!');
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error updating dokumen: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Gagal mengupdate dokumen: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Dokumen $dokumen)
    {
        if ($dokumen->status !== 'draft') {
            return back()->withErrors(['error' => 'Hanya dokumen draft yang dapat dihapus.']);
        }

        foreach ($dokumen->versions as $version) {
            if (Storage::disk('public')->exists($version->file_url)) {
                Storage::disk('public')->delete($version->file_url);
            }
        }

        $dokumen->delete();

        return redirect()->route('dokumen.index')->with('success', 'Dokumen berhasil dihapus!');
    }

    /**
     * Submit document for approval.
     */
    public function submit(Dokumen $dokumen)
    {
        if ($dokumen->status !== 'draft') {
            return back()->withErrors(['error' => 'Hanya dokumen draft yang dapat diajukan.']);
        }

        DB::beginTransaction();
        try {
            $dokumen->approvals()->delete();

            $dokumen->update([
                'status' => 'submitted',
                'status_current' => 'waiting_approval',
            ]);

            $this->createApprovalWorkflow($dokumen);

            DB::commit();

            return redirect()->route('dokumen.show', $dokumen->id)->with('success', 'Dokumen berhasil diajukan untuk approval!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal mengajukan dokumen: ' . $e->getMessage()]);
        }
    }

    /**
     * Create approval workflow for document.
     */
    private function createApprovalWorkflow(Dokumen $dokumen)
    {
        $masterflow = $dokumen->masterflow;
        $latestVersion = $dokumen->latestVersion;

        if (!$masterflow) {
            // Document uses Custom Approval Flow - approvals are created separately or already created
            return;
        }

        if (!$masterflow->steps) {
            return;
        }

        foreach ($masterflow->steps as $step) {
            $user = \App\Models\User::whereHas('userAuths', function ($query) use ($step) {
                $query->where('jabatan_id', $step->jabatan_id);
            })->first();

            if ($user) {
                $approval = DokumenApproval::create([
                    'dokumen_id' => $dokumen->id,
                    'user_id' => $user->id,
                    'dokumen_version_id' => $latestVersion->id,
                    'masterflow_step_id' => $step->id,
                    'approval_status' => 'pending',
                    'tgl_deadline' => now()->addDays(3),
                ]);

                SendApprovalNotification::dispatch($approval);
            }
        }
    }

    /**
     * Cancel document submission.
     */
    public function cancel(Dokumen $dokumen)
    {
        if (!in_array($dokumen->status, ['submitted', 'under_review'])) {
            return back()->withErrors(['error' => 'Dokumen tidak dapat dibatalkan dalam status ini.']);
        }

        DB::beginTransaction();
        try {
            $dokumen->update([
                'status' => 'draft',
                'status_current' => 'draft',
            ]);

            $dokumen->approvals()->where('approval_status', 'pending')->delete();

            DB::commit();

            return redirect()->route('dokumen.show', $dokumen->id)->with('success', 'Pengajuan dokumen berhasil dibatalkan!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal membatalkan pengajuan: ' . $e->getMessage()]);
        }
    }

    /**
     * Upload revision for rejected document.
     */
    public function uploadRevision(Request $request, Dokumen $dokumen, PdfSignatureService $pdfSignatureService)
    {
        if (!in_array($dokumen->status, ['rejected', 'needs_revision'])) {
            $message = 'Dokumen ini tidak memerlukan revisi.';
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['message' => $message], 422);
            }
            return back()->withErrors(['error' => $message]);
        }

        if ($dokumen->user_id !== Auth::id()) {
            $message = 'Anda tidak memiliki akses untuk merevisi dokumen ini.';
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['message' => $message], 403);
            }
            return back()->withErrors(['error' => $message]);
        }

        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240',
            'comment' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $latestVersion = $dokumen->latestVersion;
            $currentVersion = $latestVersion ? floatval($latestVersion->version) : 0.0;
            $newVersion = number_format($currentVersion + 1.0, 1);

            $file = $request->file('file');
            $folderPath = 'dokumen/' . $dokumen->id_dokumen;

            $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
            $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);

            $extension = $file->getClientOriginalExtension();
            $filename = $dokumen->id_dokumen . '_' . $cleanJudul . '_v' . str_replace('.', '', $newVersion) . '.' . $extension;

            $path = $file->storeAs($folderPath, $filename, 'public');

            $dokumenVersion = DokumenVersion::create([
                'dokumen_id' => $dokumen->id,
                'version' => $newVersion,
                'nama_file' => $file->getClientOriginalName(),
                'tgl_upload' => now(),
                'tipe_file' => $extension,
                'file_url' => $path,
                'size_file' => $file->getSize(),
                'status' => 'active',
            ]);

            if ($dokumen->status === 'needs_revision') {
                $revisionApproval = DokumenApproval::where('dokumen_id', $dokumen->id)
                    ->where('approval_status', 'revision_requested')
                    ->first();

                if ($revisionApproval) {
                    if ($revisionApproval->group_index) {
                        $groupApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)
                            ->where('group_index', $revisionApproval->group_index)
                            ->get();

                        foreach ($groupApprovals as $groupApproval) {
                            $groupApproval->update([
                                'dokumen_version_id' => $dokumenVersion->id,
                                'approval_status' => 'pending',
                                'tgl_approve' => null,
                                'comment' => null,
                                'signature_path' => null,
                                'revision_notes' => null,
                                'revision_requested_by' => null,
                                'revision_requested_at' => null,
                            ]);

                            Mail::to($groupApproval->user->email)
                                ->queue(new \App\Mail\RevisionUploadedMail($dokumen, $groupApproval->fresh(), $newVersion));

                            broadcast(new BrowserNotificationEvent(
                                userId: $groupApproval->user_id,
                                title: 'Revisi Dokumen Telah Diupload',
                                body: "Dokumen '{$dokumen->judul_dokumen}' (v{$newVersion}) telah direvisi dan membutuhkan persetujuan ulang.",
                                url: route('approvals.show', $groupApproval->id),
                                type: 'info'
                            ));
                        }
                    } else {
                        $revisionApproval->update([
                            'dokumen_version_id' => $dokumenVersion->id,
                            'approval_status' => 'pending',
                            'revision_notes' => null,
                            'revision_requested_by' => null,
                            'revision_requested_at' => null,
                        ]);

                        if ($revisionApproval->user?->email) {
                            Mail::to($revisionApproval->user->email)
                                ->queue(new \App\Mail\RevisionUploadedMail($dokumen, $revisionApproval->fresh(), $newVersion));
                        }

                        broadcast(new BrowserNotificationEvent(
                            userId: $revisionApproval->user_id,
                            title: 'Dokumen Telah Direvisi',
                            body: "Dokumen '{$dokumen->judul_dokumen}' telah direvisi dan membutuhkan persetujuan Anda.",
                            url: route('approvals.show', $revisionApproval->id),
                            type: 'info'
                        ));
                    }

                    $dokumen->update([
                        'status' => 'under_review',
                        'status_current' => 'waiting_approval_' . ($revisionApproval->masterflowStep?->step_order ?? 1),
                    ]);
                }

                DokumenApproval::where('dokumen_id', $dokumen->id)
                    ->where('approval_status', 'pending')
                    ->where('id', '!=', $revisionApproval?->id)
                    ->when($revisionApproval?->group_index, function ($query) use ($revisionApproval) {
                        $query->where(function ($q) use ($revisionApproval) {
                            $q->whereNull('group_index')
                                ->orWhere('group_index', '!=', $revisionApproval->group_index);
                        });
                    })
                    ->update(['dokumen_version_id' => $dokumenVersion->id]);
            } else {
                $rejectedApproval = DokumenApproval::where('dokumen_id', $dokumen->id)
                    ->where('approval_status', 'rejected')
                    ->with('masterflowStep')
                    ->first();

                if ($rejectedApproval) {
                    $rejectedStepOrder = $rejectedApproval->masterflowStep?->step_order ?? $rejectedApproval->approval_order ?? 1;
                    $allApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)->with('masterflowStep')->get();

                    foreach ($allApprovals as $approval) {
                        $approvalStepOrder = $approval->masterflowStep?->step_order ?? $approval->approval_order ?? 1;

                        if ($approvalStepOrder >= $rejectedStepOrder) {
                            $approval->update([
                                'dokumen_version_id' => $dokumenVersion->id,
                                'approval_status' => 'pending',
                                'tgl_approve' => null,
                                'alasan_reject' => null,
                                'comment' => null,
                                'signature_path' => null,
                                'revision_notes' => null,
                                'revision_requested_by' => null,
                                'revision_requested_at' => null,
                            ]);

                            if ($approval->user?->email) {
                                Mail::to($approval->user->email)
                                    ->queue(new \App\Mail\RevisionUploadedMail($dokumen, $approval->fresh(), $newVersion));
                            }

                            broadcast(new BrowserNotificationEvent(
                                userId: $approval->user_id,
                                title: 'Dokumen Telah Direvisi',
                                body: "Dokumen '{$dokumen->judul_dokumen}' telah direvisi dan membutuhkan persetujuan Anda.",
                                url: route('approvals.show', $approval->id),
                                type: 'info'
                            ));
                        } else {
                            $approval->update(['dokumen_version_id' => $dokumenVersion->id]);
                        }
                    }

                    $dokumen->update([
                        'status' => 'under_review',
                        'status_current' => 'waiting_approval_' . $rejectedStepOrder,
                    ]);
                } else {
                    $allApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)->get();

                    foreach ($allApprovals as $approval) {
                        $approval->update([
                            'dokumen_version_id' => $dokumenVersion->id,
                            'approval_status' => 'pending',
                            'tgl_approve' => null,
                            'alasan_reject' => null,
                            'comment' => null,
                            'signature_path' => null,
                            'revision_notes' => null,
                            'revision_requested_by' => null,
                            'revision_requested_at' => null,
                        ]);

                        if ($approval->user?->email) {
                            Mail::to($approval->user->email)
                                ->queue(new \App\Mail\RevisionUploadedMail($dokumen, $approval->fresh(), $newVersion));
                        }

                        broadcast(new BrowserNotificationEvent(
                            userId: $approval->user_id,
                            title: 'Dokumen Telah Direvisi',
                            body: "Dokumen '{$dokumen->judul_dokumen}' telah direvisi dan membutuhkan persetujuan Anda.",
                            url: route('approvals.show', $approval->id),
                            type: 'info'
                        ));
                    }

                    $dokumen->update([
                        'status' => 'under_review',
                        'status_current' => 'waiting_approval_1',
                    ]);
                }
            }

            $commentText = 'Dokumen direvisi - Version ' . $newVersion;
            if ($request->has('comment') || isset($validated['comment'])) {
                $commentText .= "\n\nCatatan: " . ($request->comment ?? $validated['comment'] ?? '-');
            }

            Comment::create([
                'dokumen_id' => $dokumen->id,
                'content' => $commentText,
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            RevisionLog::create([
                'dokumen_id' => $dokumen->id,
                'dokumen_version_id' => $dokumenVersion->id,
                'user_id' => Auth::id(),
                'action' => RevisionLog::ACTION_REVISED,
                'changes' => [
                    'previous_version' => $latestVersion?->version,
                    'new_version' => $newVersion,
                ],
                'notes' => $validated['comment'] ?? 'Dokumen direvisi',
            ]);

            DB::commit();

            $successMessage = 'Revisi dokumen berhasil diupload! Version ' . $newVersion . ' telah dibuat.';

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => $successMessage,
                    'dokumen' => $dokumen->fresh()->load([
                        'user',
                        'masterflow.steps.jabatan',
                        'versions' => function ($query) {
                            $query->orderBy('created_at', 'desc');
                        },
                        'approvals' => function ($query) {
                            $query->with(['user', 'masterflowStep.jabatan']);
                        },
                    ]),
                ]);
            }

            return redirect()->route('dokumen.show', $dokumen->id)->with('success', $successMessage);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to upload revision: ' . $e->getMessage());

            $message = 'Gagal mengupload revisi: ' . $e->getMessage();
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['message' => $message], 500);
            }

            return back()->withErrors(['error' => $message]);
        }
    }

    /**
     * Download document file.
     */
    public function download(Dokumen $dokumen, $versionId = null, PdfSignatureService $pdfSignatureService = null)
    {
        $pdfSignatureService = $pdfSignatureService ?? app(PdfSignatureService::class);

        $version = $versionId
            ? $dokumen->versions()->findOrFail($versionId)
            : $dokumen->latestVersion;

        if (!$version || !$version->file_url || !Storage::disk('public')->exists($version->file_url)) {
            return back()->withErrors(['error' => 'File tidak ditemukan.']);
        }

        // Option to explicitly download original PDF without signatures
        if (request()->has('original') && request('original') == '1') {
            $filePath = Storage::disk('public')->path($version->file_url);
            return response()->download($filePath, 'ASLI_' . $version->nama_file);
        }

        $approvedSignatures = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->where('approval_status', 'approved')
            ->whereNotNull('signature_path')
            ->with(['user', 'masterflowStep'])
            ->orderBy('created_at')
            ->get();

        if ($approvedSignatures->count() > 0 && strtolower($version->tipe_file) === 'pdf') {
            try {
                $pdfContent = $pdfSignatureService->generateSignedPdfStream(
                    $version->file_url,
                    $approvedSignatures
                );

                $signedFilename = pathinfo($version->nama_file, PATHINFO_FILENAME) . '_signed.pdf';

                return response($pdfContent)
                    ->header('Content-Type', 'application/pdf')
                    ->header('Content-Disposition', 'attachment; filename="' . $signedFilename . '"')
                    ->header('Content-Length', strlen($pdfContent));
            } catch (\Exception $e) {
                Log::error('Failed to generate signed PDF for download: ' . $e->getMessage());
            }
        }

        $filePath = Storage::disk('public')->path($version->file_url);
        return response()->download($filePath, $version->nama_file);
    }

    /**
     * API: Get history / revision logs for a document.
     */
    public function getHistory($id)
    {
        try {
            $dokumen = Dokumen::findOrFail($id);

            // Mengambil revision logs dengan relasi user
            $history = RevisionLog::with(['user'])
                ->where('dokumen_id', $dokumen->id)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $history,
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching document history: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil riwayat dokumen: ' . $e->getMessage(),
            ], 500);
        }
    }


    /**
     * Membuat temporary Signed URL untuk preview/download PDF (Valid 30 menit).
     */
    public function getSecureUrl(Dokumen $dokumen)
{
    $isOwner      = $dokumen->user_id === Auth::id();
    $isSuperAdmin = $this->contextService->isSuperAdmin();
    $isApprover   = $dokumen->approvals()->where('user_id', Auth::id())->exists();

    if (!$isOwner && !$isSuperAdmin && !$isApprover) {
        abort(403, 'Anda tidak memiliki akses ke dokumen ini.');
    }

    $secureUrl = URL::temporarySignedRoute(
        'dokumen.secure-stream',
        now()->addMinutes(30),
        ['dokumen' => $dokumen->id]
    );

    return response()->json([
        'success' => true,
        'url' => $secureUrl,
    ]);
}

    /**
     * Menampilkan/Stream PDF yang sudah diproteksi Token.
     */
    public function streamSignedPdf(Dokumen $dokumen, PdfSignatureService $pdfSignatureService, $versionId = null)
{
    // 1. Cek Token Validasi
    if (!request()->hasValidSignature()) {
        abort(403, 'Akses ditolak! Token URL tidak valid atau sudah kedaluwarsa.');
    }

    // 1b. Cek otorisasi user - meskipun signature valid, harus tetap owner/approver/superadmin
    $isOwner      = $dokumen->user_id === Auth::id();
    $isSuperAdmin = $this->contextService->isSuperAdmin();
    $isApprover   = $dokumen->approvals()->where('user_id', Auth::id())->exists();

    if (!$isOwner && !$isSuperAdmin && !$isApprover) {
        abort(403, 'Anda tidak memiliki akses ke dokumen ini.');
    }

    $version = $versionId
            ? $dokumen->versions()->findOrFail($versionId)
            : $dokumen->latestVersion;

        // 2. Cek apakah file ada di storage
        if (!$version || !$version->file_url || !Storage::disk('public')->exists($version->file_url)) {
            abort(404, 'File dokumen tidak ditemukan di server.');
        }

        $filePath = Storage::disk('public')->path($version->file_url);

        // 3. Ambil tanda tangan yang sudah diapprove
        $approvedSignatures = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->where('approval_status', 'approved')
            ->whereNotNull('signature_path')
            ->with(['user', 'masterflowStep'])
            ->orderBy('created_at')
            ->get();

        // 4. Jika belum ada signature / bukan PDF, langsung tampilkan file aslinya
        if ($approvedSignatures->count() === 0 || strtolower($version->tipe_file) !== 'pdf') {
            return response()->file($filePath, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $version->nama_file . '"',
            ]);
        }

        // 5. Generate signed PDF jika ada signature
        try {
            $pdfContent = $pdfSignatureService->generateSignedPdfStream(
                $version->file_url,
                $approvedSignatures
            );

            return response($pdfContent, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="signed_' . $version->nama_file . '"',
            ]);
        } catch (\Exception $e) {
            Log::error('Gagal generate signed PDF: ' . $e->getMessage());

            // Fallback kirim file asli jika generate gagal
            return response()->file($filePath, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $version->nama_file . '"',
            ]);
        }
    }
}