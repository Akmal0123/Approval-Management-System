<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\DokumenApproval;
use App\Models\Masterflow;
use App\Models\Comment;
use App\Models\RevisionLog;
use App\Models\Transaksi;
use App\Models\Aplikasi;
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
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Services\ContextService;
use App\Services\PdfSignatureService;
use App\Services\DummyTransactionService;
use App\Services\TransactionTemplatePdfService;

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
        $query = Dokumen::with(['user', 'masterflow', 'latestVersion', 'approvals.user', 'aplikasi', 'transaksi'])
            ->orderBy('created_at', 'desc');

        // Context-based filtering (Super Admin sees all)
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

        // Filter by status
        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        // Filter by current status
        if ($request->filled('status_current')) {
            $query->byCurrentStatus($request->status_current);
        }

        // Filter by user (for my documents)
        if ($request->filled('my_documents')) {
            $query->byUser(Auth::id());
        }

        // Search by title or description
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('judul_dokumen', 'like', '%' . $request->search . '%')
                    ->orWhere('deskripsi', 'like', '%' . $request->search . '%');
            });
        }

        $dokumen = $query->get();

        // Add detailed status to each dokumen
        $dokumen->each(function ($doc) {
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
        $query = Dokumen::with(['user', 'masterflow', 'latestVersion', 'approvals.user', 'aplikasi', 'transaksi'])
            ->orderBy('created_at', 'desc');

        // Context-based filtering (Super Admin sees all)
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

        // Filter by status
        if ($request->filled('status')) {
            $query->byStatus($request->status);
        }

        // Filter by current status
        if ($request->filled('status_current')) {
            $query->byCurrentStatus($request->status_current);
        }

        // Filter by user (for my documents)
        if ($request->filled('my_documents')) {
            $query->byUser(Auth::id());
        }

        // Search by title or description
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('judul_dokumen', 'like', '%' . $request->search . '%')
                    ->orWhere('deskripsi', 'like', '%' . $request->search . '%');
            });
        }

        $dokumen = $query->get();

        // Add detailed status to each dokumen
        $dokumen->each(function ($doc) {
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
        // Filter masterflows by current company context
        $query = Masterflow::where('is_active', true);

        if (!$this->contextService->isSuperAdmin()) {
            $companyId = $this->contextService->getCurrentCompanyId();
            if ($companyId) {
                $query->where('company_id', $companyId);
            }
        }

        $masterflows = $query->get();

        return Inertia::render('Dokumen/Create', [
            'masterflows' => $masterflows,
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Get user's company and aplikasi from CURRENT CONTEXT (not first)
        $context = $this->contextService->getContext();
        if (!$context) {
            return back()->withErrors(['error' => 'User tidak memiliki akses ke company atau aplikasi. Silakan pilih context terlebih dahulu.']);
        }

        $tipeDokumen = $request->input('tipe_dokumen', 'manual');
        if ($request->filled('transaksi_id') || $tipeDokumen === 'transaksi') {
            $tipeDokumen = 'transaksi';
        }

        // Determine validation rules based on masterflow_id
        $rules = [
            'nomor_dokumen' => 'required|string|unique:dokumen,nomor_dokumen',
            'judul_dokumen' => 'required|string|max:255',
            'tgl_pengajuan' => 'required|date',
            'tgl_deadline' => 'required|date|after_or_equal:tgl_pengajuan',
            'deskripsi' => 'nullable|string',
            'tipe_dokumen' => 'nullable|string|in:manual,transaksi',
            'transaksi_id' => 'nullable|exists:transaksis,id',
            'aplikasi_id' => 'nullable|exists:aplikasis,id',
            'file' => $tipeDokumen === 'transaksi' ? 'nullable|file|mimes:pdf|max:10240' : 'required|file|mimes:pdf|max:10240',
            'submit_type' => 'required|in:draft,submit', // Validate submit type
        ];

        // Check if custom approval or existing masterflow
        if ($request->masterflow_id === 'custom') {
            $rules['custom_approvers'] = 'required|array|min:1';
            $rules['custom_approvers.*.email'] = 'required|email';
            $rules['custom_approvers.*.order'] = 'required|integer|min:1';
        } else {
            $rules['masterflow_id'] = 'required|exists:masterflows,id';
            // Accept both single approvers and group approvers
            $rules['approvers'] = 'nullable|array';
            $rules['approvers.*'] = 'nullable|exists:users,id';
            $rules['step_approvers'] = 'nullable|array';
            $rules['step_approvers.*.jenis_group'] = 'required|in:all_required,any_one,majority';
            $rules['step_approvers.*.user_ids'] = 'required|array|min:1';
            $rules['step_approvers.*.user_ids.*'] = 'required|exists:users,id';
        }

        $validated = $request->validate($rules);

        // Determine company_id and aplikasi_id
        $aplikasiId = $context->aplikasi_id;
        $companyId = $context->company_id;

        if ($request->filled('aplikasi_id')) {
            $selectedApp = Aplikasi::with('company')->find($request->aplikasi_id);
            if ($selectedApp) {
                $aplikasiId = $selectedApp->id;
                if ($selectedApp->company_id) {
                    $companyId = $selectedApp->company_id;
                }
            }
        }

        DB::beginTransaction();
        try {
            // Determine initial status based on submit_type
            $submitType = $validated['submit_type'];
            $status = $submitType === 'draft' ? 'draft' : 'submitted';
            $statusCurrent = $submitType === 'draft' ? 'draft' : 'waiting_approval_1';

            $frontendIdToApprovalId = [];

            // Create document
            $dokumen = Dokumen::create([
                'nomor_dokumen' => $validated['nomor_dokumen'],
                'judul_dokumen' => $validated['judul_dokumen'],
                'user_id' => Auth::id(),
                'company_id' => $companyId,
                'aplikasi_id' => $aplikasiId,
                'transaksi_id' => $request->input('transaksi_id') ?: null,
                'tipe_dokumen' => $tipeDokumen,
                'masterflow_id' => $request->masterflow_id === 'custom' ? null : $validated['masterflow_id'],
                'status' => $status,
                'tgl_pengajuan' => $validated['tgl_pengajuan'],
                'tgl_deadline' => $validated['tgl_deadline'],
                'deskripsi' => $validated['deskripsi'] ?? null,
                'status_current' => $statusCurrent,
            ]);

            $version = null;

            // Store file and create first version
            if ($request->hasFile('file')) {
                $file = $request->file('file');

                // Create folder for this document based on nomor_dokumen
                $folderPath = 'dokumen/' . $validated['nomor_dokumen'];

                // Clean up judul for filename (remove special characters)
                $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $validated['judul_dokumen']);
                $cleanJudul = preg_replace('/_+/', '_', $cleanJudul); // Replace multiple underscores with single

                // Create filename: nomor_dokumen_judul_dokumen_v1.ext
                $extension = $file->getClientOriginalExtension();
                $filename = $validated['nomor_dokumen'] . '_' . $cleanJudul . '_v1.' . $extension;

                // Store file in document-specific folder
                $path = $file->storeAs($folderPath, $filename, 'local');

                $version = DokumenVersion::create([
                    'dokumen_id' => $dokumen->id,
                    'version' => '1.0',
                    'nama_file' => $file->getClientOriginalName(),
                    'tgl_upload' => now(),
                    'tipe_file' => $extension,
                    'file_url' => $path,
                    'size_file' => $file->getSize(),
                    'status' => 'active',
                ]);
            } elseif ($tipeDokumen === 'transaksi') {
                // Auto generate formatted PDF for transaction document
                $transaksi = $dokumen->transaksi_id ? Transaksi::find($dokumen->transaksi_id) : null;
                $path = $this->generateTransactionPdf($dokumen, $transaksi);
                $size = Storage::disk('local')->exists($path) ? Storage::disk('local')->size($path) : 0;

                $version = DokumenVersion::create([
                    'dokumen_id' => $dokumen->id,
                    'version' => '1.0',
                    'nama_file' => $dokumen->nomor_dokumen . '_transaksi.pdf',
                    'tgl_upload' => now(),
                    'tipe_file' => 'pdf',
                    'file_url' => $path,
                    'size_file' => $size,
                    'status' => 'active',
                ]);
            }

            if ($request->masterflow_id === 'custom') {
                // Custom approval flow
                $minOrder = collect($validated['custom_approvers'])->min('order');

                foreach ($validated['custom_approvers'] as $index => $approver) {
                    $targetUser = \App\Models\User::where('email', $approver['email'])->first();

                    $isFirstLevel = $approver['order'] == $minOrder;

                    $approval = DokumenApproval::create([
                        'dokumen_id' => $dokumen->id,
                        'user_id' => $targetUser?->id,
                        'approver_email' => $approver['email'],
                        'approval_order' => $approver['order'],
                        'dokumen_version_id' => $version->id,
                        'approval_status' => $isFirstLevel ? 'pending' : 'waiting',
                        'tgl_deadline' => $validated['tgl_deadline'],
                    ]);

                    $frontendIdToApprovalId["custom_{$index}"] = $approval->id;

                    if ($approval->user_id && $isFirstLevel && $submitType !== 'draft') {
                        SendApprovalNotification::dispatch($approval);
                    }
                }
            } else {
                // Existing masterflow - create approvals from selected approvers
                    $masterflow = Masterflow::with('steps')->find($validated['masterflow_id']);

                    $minStepOrder = $masterflow->steps->min('step_order');

                    Log::info('Processing masterflow steps', [
                        'masterflow_id' => $masterflow->id,
                        'steps_count' => $masterflow->steps->count(),
                        'has_step_approvers' => $request->has('step_approvers'),
                        'step_approvers_keys' => $request->has('step_approvers') ? array_keys($request->input('step_approvers', [])) : [],
                    ]);

                    foreach ($masterflow->steps as $step) {
                        $isFirstLevel = $step->step_order == $minStepOrder;
                        // Check if user selected group approval for this step
                        if ($request->has("step_approvers.{$step->id}")) {
                            $stepApprover = $request->input("step_approvers.{$step->id}");
                            $groupIndex = 'user_selected_' . $dokumen->id . '_' . $step->id;

                            Log::info('Creating group approval', [
                                'step_id' => $step->id,
                                'group_index' => $groupIndex,
                                'jenis_group' => $stepApprover['jenis_group'],
                                'user_ids' => $stepApprover['user_ids'],
                            ]);

                            // Create approval records for all selected users in the group
                            foreach ($stepApprover['user_ids'] as $userId) {
                                $approval = DokumenApproval::create([
                                    'dokumen_id' => $dokumen->id,
                                    'user_id' => $userId,
                                    'masterflow_step_id' => $step->id,
                                    'dokumen_version_id' => $version->id,
                                    'approval_status' => $isFirstLevel ? 'pending' : 'waiting',
                                    'tgl_deadline' => $validated['tgl_deadline'],
                                    'group_index' => $groupIndex,
                                    'jenis_group' => $stepApprover['jenis_group'],
                                ]);

                                if (!isset($frontendIdToApprovalId["group_{$step->id}"])) {
                                    $frontendIdToApprovalId["group_{$step->id}"] = [];
                                }
                                $frontendIdToApprovalId["group_{$step->id}"][] = $approval->id;

                                if ($isFirstLevel && $submitType !== 'draft') {
                                    // Broadcast new approval event
                                    Log::info('Broadcasting ApprovalCreated event', [
                                        'approval_id' => $approval->id,
                                        'user_id' => $userId,
                                        'dokumen_id' => $dokumen->id,
                                    ]);
                                    broadcast(new ApprovalCreated($approval))->toOthers();

                                    // Dispatch email notification job
                                    SendApprovalNotification::dispatch($approval);

                                    // Broadcast browser notification to approver
                                    broadcast(new BrowserNotificationEvent(
                                        userId: $userId,
                                        title: 'Dokumen Baru Membutuhkan Persetujuan',
                                        body: "Dokumen '{$dokumen->judul_dokumen}' membutuhkan persetujuan Anda.",
                                        url: route('approvals.show', $approval->id),
                                        type: 'info'
                                    ));
                                }
                            }
                        } else {
                            // Single approver selected by user
                            if (isset($validated['approvers'][$step->id])) {
                                Log::info('Creating single approval', [
                                    'step_id' => $step->id,
                                    'user_id' => $validated['approvers'][$step->id],
                                ]);

                                $approval = DokumenApproval::create([
                                    'dokumen_id' => $dokumen->id,
                                    'user_id' => $validated['approvers'][$step->id],
                                    'masterflow_step_id' => $step->id,
                                    'dokumen_version_id' => $version->id,
                                    'approval_status' => $isFirstLevel ? 'pending' : 'waiting',
                                    'tgl_deadline' => $validated['tgl_deadline'],
                                ]);

                                $userId = $validated['approvers'][$step->id];
                                $frontendIdToApprovalId["step_{$step->id}_user_{$userId}"] = $approval->id;

                                if ($isFirstLevel && $submitType !== 'draft') {
                                    // Broadcast new approval event
                                    Log::info('Broadcasting ApprovalCreated event', [
                                        'approval_id' => $approval->id,
                                        'user_id' => $validated['approvers'][$step->id],
                                        'dokumen_id' => $dokumen->id,
                                    ]);
                                    broadcast(new ApprovalCreated($approval))->toOthers();

                                    // Dispatch email notification job
                                    SendApprovalNotification::dispatch($approval);

                                    // Broadcast browser notification to approver
                                    broadcast(new BrowserNotificationEvent(
                                        userId: $validated['approvers'][$step->id],
                                        title: 'Dokumen Baru Membutuhkan Persetujuan',
                                        body: "Dokumen '{$dokumen->judul_dokumen}' membutuhkan persetujuan Anda.",
                                        url: route('approvals.show', $approval->id),
                                        type: 'info'
                                    ));
                                }
                            }
                        }
                    }
                }

            // Handle signature positions if any
            if ($request->has('signature_positions')) {
                $positions = json_decode($request->signature_positions, true);
                if (is_array($positions)) {
                    $positionsData = [];
                    foreach ($positions as $pos) {
                        $frontendId = $pos['dokumen_approval_id'];

                        if ($frontendId === 'qr_code' || str_starts_with((string)$frontendId, 'qr_code') || empty($frontendId)) {
                            $positionsData[] = [
                                'dokumen_id' => $dokumen->id,
                                'dokumen_approval_id' => null,
                                'page' => $pos['page'],
                                'x' => $pos['x'],
                                'y' => $pos['y'],
                                'width' => $pos['width'],
                                'height' => $pos['height'],
                                'created_at' => now(),
                                'updated_at' => now(),
                            ];
                        } else if (isset($frontendIdToApprovalId[$frontendId])) {
                            $mapped = $frontendIdToApprovalId[$frontendId];
                            $approvalIds = is_array($mapped) ? $mapped : [$mapped];

                            foreach ($approvalIds as $approvalId) {
                                $positionsData[] = [
                                    'dokumen_id' => $dokumen->id,
                                    'dokumen_approval_id' => $approvalId,
                                    'page' => $pos['page'],
                                    'x' => $pos['x'],
                                    'y' => $pos['y'],
                                    'width' => $pos['width'],
                                    'height' => $pos['height'],
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ];
                            }
                        }
                    }
                    if (count($positionsData) > 0) {
                        \App\Models\DocumentSignaturePosition::insert($positionsData);
                    }
                }
            }

            DB::commit();

            $message = $submitType === 'draft'
                ? 'Dokumen berhasil disimpan sebagai draft!'
                : 'Dokumen berhasil disubmit untuk approval!';

            // Return redirect back with success message (Inertia compatible)
            return back()->with([
                'success' => $message,
                'dokumen' => $dokumen->load(['user', 'masterflow', 'latestVersion', 'approvals.user', 'aplikasi', 'transaksi']),
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error creating dokumen: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return back()->withErrors([
                'error' => 'Gagal membuat dokumen: ' . $e->getMessage(),
            ])->withInput();
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Dokumen $dokumen)
    {
        // Debug log
        Log::info('Show dokumen', [
            'dokumen_id' => $dokumen->id,
            'request_path' => $request->path(),
            'request_url' => $request->fullUrl(),
            'expects_json' => $request->expectsJson(),
        ]);

        $dokumen->load([
            'user',
            'company',
            'aplikasi',
            'transaksi',
            'masterflow.steps.jabatan',
            'versions' => function ($query) {
                $query->orderBy('created_at', 'desc');
            },
            'approvals' => function ($query) {
                $query->with(['user', 'masterflowStep.jabatan']);
            },
        ]);

        Log::info('Loaded dokumen data', [
            'dokumen' => $dokumen->toArray()
        ]);

        // Add detailed status
        $dokumen->detailed_status = $dokumen->getDetailedStatus();

        // If API request (AJAX/Fetch), return JSON
        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json($dokumen);
        }

        // Return Inertia view
        return Inertia::render('dokumen/show', [
            'dokumen' => $dokumen,
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Dokumen $dokumen)
    {
        // Only allow edit if document is draft or rejected
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
        // Only allow update if document is draft or rejected
        if (!in_array($dokumen->status, ['draft', 'rejected'])) {
            return redirect()->route('dokumen.show', $dokumen->id)
                ->withErrors(['error' => 'Dokumen tidak dapat diupdate dalam status ini.']);
        }

        $validated = $request->validate([
            'judul_dokumen' => 'required|string|max:255',
            'tgl_deadline' => 'nullable|date',
            'deskripsi' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf|max:10240', // Only PDF for digital signature support
        ]);

        DB::beginTransaction();
        try {
            // Update dokumen
            $dokumen->update([
                'judul_dokumen' => $validated['judul_dokumen'],
                'tgl_deadline' => $validated['tgl_deadline'] ?? $dokumen->tgl_deadline,
                'deskripsi' => $validated['deskripsi'] ?? $dokumen->deskripsi,
            ]);

            // If new file uploaded, create new version
            if ($request->hasFile('file')) {
                $file = $request->file('file');

                // Use same folder as original document
                $folderPath = 'dokumen/' . $dokumen->nomor_dokumen;

                // Clean up judul for filename
                $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
                $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);

                // Get latest version number and increment
                $latestVersion = $dokumen->versions()->latest()->first();
                $versionParts = explode('.', $latestVersion->version);
                $newVersion = $versionParts[0] . '.' . ((int) $versionParts[1] + 1);

                // Create filename: nomor_dokumen_judul_dokumen_v{version}.ext
                $extension = $file->getClientOriginalExtension();
                $versionNumber = str_replace('.', '', $newVersion); // 1.0 -> 10, 1.1 -> 11
                $filename = $dokumen->nomor_dokumen . '_' . $cleanJudul . '_v' . $versionNumber . '.' . $extension;

                // Store file in document-specific folder
                $path = $file->storeAs($folderPath, $filename, 'local');

                // Set old versions to inactive
                $dokumen->versions()->update(['status' => 'inactive']);

                // Create new version
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

            return redirect()->back()
                ->with('success', 'Dokumen berhasil diupdate!');
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error updating dokumen: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Gagal mengupdate dokumen: ' . $e->getMessage()])
                ->withInput();
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Dokumen $dokumen)
    {
        // Only allow delete if document is draft
        if ($dokumen->status !== 'draft') {
            return back()->withErrors(['error' => 'Hanya dokumen draft yang dapat dihapus.']);
        }

        // Delete associated files
        foreach ($dokumen->versions as $version) {
            if (Storage::disk('local')->exists($version->file_url)) {
                Storage::disk('local')->delete($version->file_url);
            }
        }

        $dokumen->delete();

        return redirect()->route('dokumen.index')
            ->with('success', 'Dokumen berhasil dihapus!');
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
            // Update document status
            $dokumen->update([
                'status' => 'submitted',
                'status_current' => 'waiting_approval_1',
            ]);

            // Notify first-level approvers that are pending
            $firstLevelApprovals = $dokumen->approvals()->where('approval_status', 'pending')->get();

            foreach ($firstLevelApprovals as $approval) {
                if ($approval->user_id) {
                    // Dispatch email notification job
                    SendApprovalNotification::dispatch($approval);

                    // Broadcast browser notification to approver
                    broadcast(new BrowserNotificationEvent(
                        userId: $approval->user_id,
                        title: 'Dokumen Baru Membutuhkan Persetujuan',
                        body: "Dokumen '{$dokumen->judul_dokumen}' membutuhkan persetujuan Anda.",
                        url: route('approvals.show', $approval->id),
                        type: 'info'
                    ));
                }
            }

            DB::commit();

            return redirect()->route('dokumen.show', $dokumen->id)
                ->with('success', 'Dokumen berhasil diajukan untuk approval!');
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

        $minStepOrder = $masterflow->steps->min('step_order');

        foreach ($masterflow->steps as $step) {
            // Find first user with required jabatan for this step
            $user = \App\Models\User::whereHas('userAuths', function ($query) use ($step) {
                $query->where('jabatan_id', $step->jabatan_id);
            })->first();

            $isFirstLevel = $step->step_order == $minStepOrder;

            if ($user) {
                $approval = DokumenApproval::create([
                    'dokumen_id' => $dokumen->id,
                    'user_id' => $user->id,
                    'dokumen_version_id' => $latestVersion->id,
                    'masterflow_step_id' => $step->id,
                    'approval_status' => $isFirstLevel ? 'pending' : 'waiting',
                    'tgl_deadline' => now()->addDays(3), // 3 days deadline
                ]);

                if ($isFirstLevel) {
                    SendApprovalNotification::dispatch($approval);
                }
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
            // Update document status back to draft
            $dokumen->update([
                'status' => 'draft',
                'status_current' => 'draft',
            ]);

            DB::commit();

            return redirect()->route('dokumen.show', $dokumen->id)
                ->with('success', 'Pengajuan dokumen berhasil dibatalkan!');
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
        Log::info('Upload revision requested', [
            'dokumen_id' => $dokumen->id,
            'user_id' => Auth::id(),
            'is_json' => $request->expectsJson() || $request->wantsJson(),
            'files' => $request->allFiles(),
        ]);

        // Allow revision upload for rejected OR needs_revision status
        if (!in_array($dokumen->status, ['rejected', 'needs_revision'])) {
            $message = 'Dokumen ini tidak memerlukan revisi.';
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['message' => $message], 422);
            }
            return back()->withErrors(['error' => $message]);
        }

        // Only document owner can upload revision
        if ($dokumen->user_id !== Auth::id()) {
            $message = 'Anda tidak memiliki akses untuk merevisi dokumen ini.';
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['message' => $message], 403);
            }
            return back()->withErrors(['error' => $message]);
        }

        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240', // Only PDF for digital signature support
            'comment' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            // Get the latest version to increment version number
            $latestVersion = $dokumen->latestVersion;
            $currentVersion = $latestVersion ? floatval($latestVersion->version) : 0.0;
            $newVersion = number_format($currentVersion + 1.0, 1);

            // Upload new file - use same folder structure as initial upload
            $file = $request->file('file');

            // Create folder path based on nomor_dokumen (same as store method)
            $folderPath = 'dokumen/' . $dokumen->nomor_dokumen;

            // Clean up judul for filename (same pattern as store method)
            $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
            $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);

            // Create filename: nomor_dokumen_judul_v{version}.ext
            $extension = $file->getClientOriginalExtension();
            $filename = $dokumen->nomor_dokumen . '_' . $cleanJudul . '_v' . str_replace('.', '', $newVersion) . '.' . $extension;

            // Store file in document-specific folder
            $path = $file->storeAs($folderPath, $filename, 'local');

            // Create new version
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

            // Handle based on document status
            if ($dokumen->status === 'needs_revision') {
                // Step-level revision: Reset approvals and notify appropriately
                $revisionApproval = DokumenApproval::where('dokumen_id', $dokumen->id)
                    ->where('approval_status', 'revision_requested')
                    ->first();

                if ($revisionApproval) {
                    // Check if this approval is part of a group
                    if ($revisionApproval->group_index) {
                        // Group approval scenario: Reset ALL approvals in the same group
                        $groupApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)
                            ->where('group_index', $revisionApproval->group_index)
                            ->get();

                        foreach ($groupApprovals as $groupApproval) {
                            // Reset each group member's approval
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

                            // Send email notification to each group member
                            Mail::to($groupApproval->user->email)
                                ->queue(new \App\Mail\RevisionUploadedMail(
                                    $dokumen,
                                    $groupApproval->fresh(),
                                    $newVersion
                                ));

                            // Broadcast browser notification to each group member
                            broadcast(new BrowserNotificationEvent(
                                userId: $groupApproval->user_id,
                                title: 'Revisi Dokumen Telah Diupload',
                                body: "Dokumen '{$dokumen->judul_dokumen}' (v{$newVersion}) telah direvisi dan membutuhkan persetujuan ulang.",
                                url: route('approvals.show', $groupApproval->id),
                                type: 'info'
                            ));

                            Log::info('Notified group member about revision', [
                                'approval_id' => $groupApproval->id,
                                'user_id' => $groupApproval->user_id,
                                'group_index' => $revisionApproval->group_index,
                            ]);
                        }
                    } else {
                        // Single approver scenario: Just reset the one who requested revision
                        $revisionApproval->update([
                            'dokumen_version_id' => $dokumenVersion->id,
                            'approval_status' => 'pending',
                            'revision_notes' => null,
                            'revision_requested_by' => null,
                            'revision_requested_at' => null,
                        ]);

                        // Dispatch email notification for the reset approval
                        if ($revisionApproval->user?->email) {
                            Mail::to($revisionApproval->user->email)
                                ->queue(new \App\Mail\RevisionUploadedMail($dokumen, $revisionApproval->fresh(), $newVersion));
                        }

                        // Broadcast browser notification to approver
                        broadcast(new BrowserNotificationEvent(
                            userId: $revisionApproval->user_id,
                            title: 'Dokumen Telah Direvisi',
                            body: "Dokumen '{$dokumen->judul_dokumen}' telah direvisi dan membutuhkan persetujuan Anda.",
                            url: route('approvals.show', $revisionApproval->id),
                            type: 'info'
                        ));
                    }

                    // Update document status back to under_review
                    $dokumen->update([
                        'status' => 'under_review',
                        'status_current' => 'waiting_approval_' . ($revisionApproval->masterflowStep?->step_order ?? 1),
                    ]);
                }

                // Update all other pending approvals to use new version
                DokumenApproval::where('dokumen_id', $dokumen->id)
                    ->where('approval_status', 'pending')
                    ->where('id', '!=', $revisionApproval?->id)
                    ->when($revisionApproval?->group_index, function ($query) use ($revisionApproval) {
                        // Exclude group members that were already updated above
                        $query->where(function ($q) use ($revisionApproval) {
                            $q->whereNull('group_index')
                                ->orWhere('group_index', '!=', $revisionApproval->group_index);
                        });
                    })
                    ->update(['dokumen_version_id' => $dokumenVersion->id]);
            } else {
                // Rejection at specific step: Only reset from rejected step onwards
                // Find the rejected approval to determine which step was rejected
                $rejectedApproval = DokumenApproval::where('dokumen_id', $dokumen->id)
                    ->where('approval_status', 'rejected')
                    ->with('masterflowStep')
                    ->first();

                if ($rejectedApproval) {
                    // Get the step order of rejected approval
                    $rejectedStepOrder = $rejectedApproval->masterflowStep?->step_order ?? $rejectedApproval->approval_order ?? 1;

                    // Get all approvals for this document
                    $allApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)
                        ->with('masterflowStep')
                        ->get();

                    foreach ($allApprovals as $approval) {
                        $approvalStepOrder = $approval->masterflowStep?->step_order ?? $approval->approval_order ?? 1;

                        // Only reset approvals from rejected step onwards
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

                            // Dispatch email notification for each reset approval
                            if ($approval->user?->email) {
                                Mail::to($approval->user->email)
                                    ->queue(new \App\Mail\RevisionUploadedMail($dokumen, $approval->fresh(), $newVersion));
                            }

                            // Broadcast browser notification to approver
                            broadcast(new BrowserNotificationEvent(
                                userId: $approval->user_id,
                                title: 'Dokumen Telah Direvisi',
                                body: "Dokumen '{$dokumen->judul_dokumen}' telah direvisi dan membutuhkan persetujuan Anda.",
                                url: route('approvals.show', $approval->id),
                                type: 'info'
                            ));
                        } else {
                            // Update the version_id for already approved steps but keep their status
                            $approval->update([
                                'dokumen_version_id' => $dokumenVersion->id,
                            ]);
                        }
                    }

                    // Set status_current to the rejected step (not from beginning)
                    $dokumen->update([
                        'status' => 'under_review',
                        'status_current' => 'waiting_approval_' . $rejectedStepOrder,
                    ]);
                } else {
                    // Fallback: No rejected approval found, reset all
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

                        // Broadcast browser notification to approver
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

            // Add revision comment
            $commentText = 'Dokumen direvisi - Version ' . $newVersion;

            // NOTE: Signed PDF file creation removed for storage optimization.
            // Previous approvals' signatures are rendered on-demand when viewing/downloading.
            // The signature_path is preserved in dokumen_approvals table for on-demand rendering.
            $approvedApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)
                ->where('approval_status', 'approved')
                ->whereNotNull('signature_path')
                ->count();

            if ($approvedApprovals > 0) {
                Log::info('Revision uploaded - previous signatures will be rendered on-demand', [
                    'dokumen_id' => $dokumen->id,
                    'version' => $newVersion,
                    'approved_signatures_count' => $approvedApprovals
                ]);
            }

            if ($request->has('comment') || isset($validated['comment'])) {
                $commentText .= "\n\nCatatan: " . ($request->comment ?? $validated['comment'] ?? '-');
            }

            Comment::create([
                'dokumen_id' => $dokumen->id,
                'content' => $commentText,
                'user_id' => Auth::id(),
                'created_at_custom' => now(),
            ]);

            // Log revision
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

            Log::info('Document revision uploaded', [
                'dokumen_id' => $dokumen->id,
                'new_version' => $newVersion,
                'user_id' => Auth::id(),
            ]);

            $successMessage = 'Revisi dokumen berhasil diupload! Version ' . $newVersion . ' telah dibuat.';

            // Return appropriate response based on request type
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

            return redirect()->route('dokumen.show', $dokumen->id)
                ->with('success', $successMessage);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Failed to upload revision', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'dokumen_id' => $dokumen->id,
            ]);

            $message = 'Gagal mengupload revisi: ' . $e->getMessage();
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['message' => $message], 500);
            }

            return back()->withErrors(['error' => $message]);
        }
    }

    /**
     * Download document file.
     * Uses on-demand PDF generation for signed documents.
     */
    public function download(Dokumen $dokumen, $versionId = null, PdfSignatureService $pdfSignatureService)
    {
        $version = $versionId
            ? $dokumen->versions()->findOrFail($versionId)
            : $dokumen->latestVersion;

        if (!$version) {
            return back()->withErrors(['error' => 'Versi dokumen tidak ditemukan.']);
        }

        if (!$this->canAccessDokumen($dokumen)) {
            abort(403, 'Anda tidak memiliki akses ke dokumen ini.');
        }

        // Check if original file exists
        if (!$version->file_url || !Storage::disk('local')->exists($version->file_url)) {
            return back()->withErrors(['error' => 'File tidak ditemukan.']);
        }

        // Get approved signatures for this document
        $approvedSignatures = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->where('approval_status', 'approved')
            ->where(function ($query) {
                $query->whereNotNull('signature_path')
                    ->orWhere('signature_method', 'qr');
            })
            ->with(['user', 'masterflowStep'])
            ->orderBy('created_at')
            ->get();

        // If there are approved signatures, generate signed PDF on-the-fly
        if ($approvedSignatures->count() > 0 && strtolower($version->tipe_file) === 'pdf') {
            try {
                $pdfContent = $pdfSignatureService->generateSignedPdfStream(
                    $version->file_url,
                    $approvedSignatures,
                    $dokumen
                );

                $signedFilename = pathinfo($version->nama_file, PATHINFO_FILENAME) . '_signed.pdf';

                return response($pdfContent)
                    ->header('Content-Type', 'application/pdf')
                    ->header('Content-Disposition', 'attachment; filename="' . $signedFilename . '"')
                    ->header('Content-Length', strlen($pdfContent));
            } catch (\Exception $e) {
                Log::error('Failed to generate signed PDF for download', [
                    'error' => $e->getMessage(),
                    'dokumen_id' => $dokumen->id,
                    'version_id' => $version->id,
                ]);
                // Fallback to original file
            }
        }

        // Download original file
        $filePath = Storage::disk('local')->path($version->file_url);
        return response()->download($filePath, $version->nama_file);
    }

    /**
     * Stream signed PDF with all approved signatures (on-demand generation).
     * This endpoint is used for PDF preview in the browser.
     */
    public function streamSignedPdf(Dokumen $dokumen, PdfSignatureService $pdfSignatureService, $versionId = null)
    {
        $version = $versionId
            ? $dokumen->versions()->findOrFail($versionId)
            : $dokumen->latestVersion;

        if (!$version) {
            abort(404, 'Versi dokumen tidak ditemukan.');
        }

        if (!$this->canAccessDokumen($dokumen)) {
            abort(403, 'Anda tidak memiliki akses ke dokumen ini.');
        }

        // Check if original file exists
        if (!$version->file_url || !Storage::disk('local')->exists($version->file_url)) {
            abort(404, 'File tidak ditemukan.');
        }

        // Get approved signatures for this document
        $approvedSignatures = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->where('approval_status', 'approved')
            ->where(function ($query) {
                $query->whereNotNull('signature_path')
                    ->orWhere('signature_method', 'qr');
            })
            ->with(['user', 'masterflowStep'])
            ->orderBy('created_at')
            ->get();

        // Check if QR code position is configured for this document
        $hasQrCode = \App\Models\DocumentSignaturePosition::where('dokumen_id', $dokumen->id)
            ->whereNull('dokumen_approval_id')
            ->exists();

        // If no signatures and no QR code, or not a PDF, stream original file
        if (($approvedSignatures->count() === 0 && !$hasQrCode) || strtolower($version->tipe_file) !== 'pdf') {
            $filePath = Storage::disk('local')->path($version->file_url);
            return response()->file($filePath, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        // Generate signed PDF on-the-fly
        try {
            $pdfContent = $pdfSignatureService->generateSignedPdfStream(
                $version->file_url,
                $approvedSignatures,
                $dokumen
            );

            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="signed_' . $version->nama_file . '"')
                ->header('Content-Length', strlen($pdfContent));
        } catch (\Exception $e) {
            Log::error('Failed to generate signed PDF stream', [
                'error' => $e->getMessage(),
                'dokumen_id' => $dokumen->id,
                'version_id' => $version->id,
            ]);

            // Fallback to original file
            $filePath = Storage::disk('local')->path($version->file_url);
            return response()->file($filePath, [
                'Content-Type' => 'application/pdf',
            ]);
        }
    }

    /**
     * Check if user has access to view/download this document
     */
    private function canAccessDokumen(\App\Models\Dokumen $dokumen)
    {
        if ($this->contextService->isSuperAdmin()) {
            return true;
        }

        $userId = \Illuminate\Support\Facades\Auth::id();

        // Is creator?
        if ($dokumen->user_id === $userId) {
            return true;
        }

        // Is approver?
        $isApprover = $dokumen->approvals()->where('user_id', $userId)->exists();
        if ($isApprover) {
            return true;
        }

        // Or Admin in the same context
        $context = $this->contextService->getContext();
        if ($context && $context->role && strtolower($context->role->role_name) === 'admin') {
            if ($dokumen->company_id === $context->company_id && $dokumen->aplikasi_id === $context->aplikasi_id) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate structured PDF for transaction document
     */
    private function generateTransactionPdf(Dokumen $dokumen, ?Transaksi $transaksi = null): string
    {
        $pdf = new \setasign\Fpdi\Fpdi();
        $pdf->AddPage('P', 'A4');
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(true, 15);

        // Header Accent Bar
        $pdf->SetFillColor(15, 118, 110);
        $pdf->Rect(15, 15, 180, 4, 'F');

        // Document Title
        $pdf->SetY(24);
        $pdf->SetFont('Arial', 'B', 16);
        $pdf->SetTextColor(15, 23, 42);
        $pdf->Cell(180, 8, 'FORMULIR PENGAJUAN TRANSAKSI', 0, 1, 'C');

        $pdf->SetFont('Arial', '', 10);
        $pdf->SetTextColor(100, 116, 139);
        $companyName = $dokumen->company?->name ?? 'Approval Management System';
        $aplikasiName = $dokumen->aplikasi?->name ?? '-';
        $pdf->Cell(180, 5, "{$companyName} | Modul Aplikasi: {$aplikasiName}", 0, 1, 'C');

        $pdf->Ln(4);
        $pdf->SetDrawColor(226, 232, 240);
        $pdf->Line(15, $pdf->GetY(), 195, $pdf->GetY());
        $pdf->Ln(6);

        // Information Grid
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->SetTextColor(30, 41, 59);
        $pdf->Cell(180, 6, 'INFORMASI TRANSAKSI', 0, 1, 'L');
        $pdf->Ln(2);

        $tglPengajuanFormatted = $dokumen->tgl_pengajuan ? (is_string($dokumen->tgl_pengajuan) ? date('d/m/Y', strtotime($dokumen->tgl_pengajuan)) : $dokumen->tgl_pengajuan->format('d/m/Y')) : '-';
        $tglDeadlineFormatted = $dokumen->tgl_deadline ? (is_string($dokumen->tgl_deadline) ? date('d/m/Y', strtotime($dokumen->tgl_deadline)) : $dokumen->tgl_deadline->format('d/m/Y')) : '-';

        $data = [
            ['Nomor Dokumen', ': ' . $dokumen->nomor_dokumen],
            ['Judul Pengajuan', ': ' . $dokumen->judul_dokumen],
            ['Tipe Transaksi', ': ' . ($transaksi ? "{$transaksi->kode_transaksi} - {$transaksi->nama_transaksi}" : '-')],
            ['Departemen', ': ' . ($transaksi?->departemen ?? '-')],
            ['Tanggal Pengajuan', ': ' . $tglPengajuanFormatted],
            ['Batas Waktu (Deadline)', ': ' . $tglDeadlineFormatted],
            ['Pemohon (User)', ': ' . ($dokumen->user?->name ?? '-') . ' (' . ($dokumen->user?->email ?? '-') . ')'],
            ['Status Alur', ': ' . strtoupper($dokumen->status)],
        ];

        $pdf->SetFont('Arial', '', 9);
        $fill = false;
        foreach ($data as $row) {
            $pdf->SetFillColor($fill ? 248 : 255, $fill ? 250 : 255, $fill ? 252 : 255);
            $pdf->SetTextColor(71, 85, 105);
            $pdf->Cell(50, 7, $row[0], 1, 0, 'L', true);
            $pdf->SetTextColor(15, 23, 42);
            $pdf->SetFont('Arial', 'B', 9);
            $pdf->Cell(130, 7, $row[1], 1, 1, 'L', true);
            $pdf->SetFont('Arial', '', 9);
            $fill = !$fill;
        }

        $pdf->Ln(6);
        $pdf->SetFont('Arial', 'B', 11);
        $pdf->SetTextColor(30, 41, 59);
        $pdf->Cell(180, 6, 'DESKRIPSI / KETERANGAN PENGAJUAN', 0, 1, 'L');
        $pdf->Ln(2);

        $pdf->SetFont('Arial', '', 9);
        $pdf->SetTextColor(51, 65, 85);
        $pdf->SetFillColor(248, 250, 252);
        $deskripsi = $dokumen->deskripsi ?: 'Tidak ada keterangan tambahan.';
        $pdf->MultiCell(180, 6, $deskripsi, 1, 'L', true);

        // Footer / Signatures Note
        $pdf->Ln(10);
        $pdf->SetFont('Arial', 'B', 10);
        $pdf->SetTextColor(30, 41, 59);
        $pdf->Cell(180, 6, 'LEMBAR PENGESAHAN ELEKTRONIK', 0, 1, 'C');
        $pdf->SetFont('Arial', 'I', 8);
        $pdf->SetTextColor(148, 163, 184);
        $pdf->Cell(180, 4, 'Dokumen ini diproses dan disahkan secara digital melalui Approval Management System', 0, 1, 'C');

        $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
        $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);
        $folderPath = 'dokumen/' . $dokumen->nomor_dokumen;
        $filename = $dokumen->nomor_dokumen . '_' . $cleanJudul . '_v1.pdf';
        $fullPath = $folderPath . '/' . $filename;

        $pdfContent = $pdf->Output('S');
        Storage::disk('local')->put($fullPath, $pdfContent);

        return $fullPath;
    }

    /**
     * Lookup external transaction data and generate its template PDF.
     */
    public function lookupExternal(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'keyword' => 'required|string',
            'aplikasi_id' => 'nullable',
            'transaksi_id' => 'nullable',
        ]);

        $keyword = trim($request->keyword);
        $txData = DummyTransactionService::findByKeyword($keyword);

        if (!$txData) {
            $samples = DummyTransactionService::getSamples();
            return response()->json([
                'status' => 'error',
                'message' => "Data transaksi dengan nomor/kode '{$keyword}' tidak ditemukan.",
                'samples' => $samples,
            ], 404);
        }

        // Generate the PDF template dynamically
        $pdfBinary = TransactionTemplatePdfService::generate($txData, 'S');
        $pdfBase64 = base64_encode($pdfBinary);

        // Map data to return
        $filename = ($txData['kode'] ?? 'dokumen') . '.pdf';

        return response()->json([
            'status' => 'success',
            'message' => 'Data transaksi dan file PDF berhasil ditarik',
            'data' => [
                'kode' => $txData['kode'] ?? '',
                'nomor_dokumen' => $txData['nomor_dokumen'] ?? $txData['kode'],
                'judul' => $txData['judul'] ?? '',
                'nominal' => $txData['nominal'] ?? 0,
                'tanggal' => $txData['tanggal'] ?? date('Y-m-d'),
                'tipe' => $txData['tipe'] ?? 'PR',
                'deskripsi' => $txData['deskripsi'] ?? '',
                'filename' => $filename,
                'pdf_base64' => $pdfBase64,
                'items_count' => count($txData['items'] ?? []),
            ],
            'samples' => DummyTransactionService::getSamples(),
        ]);
    }
}