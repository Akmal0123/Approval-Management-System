<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\DokumenApproval;
use App\Models\Masterflow;
use App\Models\Comment;
use App\Models\RevisionLog;
use App\Models\PurReq;
use App\Models\User;
use App\Models\Aplikasi;
use App\Models\Transaksi;
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
use Illuminate\Support\Facades\Http;
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
        
       $aplikasis = Aplikasi::with('company')
            ->orderBy('name')
            ->get();

        // Ambil data tipe dokumen dari database
        $tipeDokumens = \App\Models\TipeDokumen::all();

        // Ambil data company berdasarkan otorisasi atau ambil semua jika Super Admin
        $companies = $this->contextService->isSuperAdmin() 
            ? \App\Models\Company::orderBy('name')->get() 
            : \App\Models\Company::where('id', $this->contextService->getCurrentCompanyId())->get();

        return response()->json([
            'data' => $dokumen,
            'aplikasis' => $aplikasis,
            'tipeDokumens' => $tipeDokumens,
            'companies' => $companies, // <-- Tambahkan variabel companies di sini
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
   public function create()
{
    // 1. Filter masterflows by current company context
    $query = Masterflow::where('is_active', true);

    if (!$this->contextService->isSuperAdmin()) {
        $companyId = $this->contextService->getCurrentCompanyId();
        if ($companyId) {
            $query->where('company_id', $companyId);
        }
    }

    $masterflows = $query->get();

    // 2. TAHAP 1: Filter Aplikasi berdasarkan otorisasi (User Management)
    $userId = \Illuminate\Support\Facades\Auth::id();

    if ($this->contextService->isSuperAdmin()) {
        $aplikasiList = \App\Models\Aplikasi::all(); 
    } else {
        $aplikasiList = \App\Models\Aplikasi::whereHas('userAuths', function ($q) use ($userId) {
            $q->where('user_id', $userId);
        })->get();
    }

    // ===== TAMBAHKAN INI =====
    $tipeDokumens = \App\Models\TipeDokumen::all();
    // =========================

    return Inertia::render('Dokumen/Create', [
        'masterflows' => $masterflows,
        'aplikasiList' => $aplikasiList,
        'tipeDokumens' => $tipeDokumens, // <-- Kirim ke frontend
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

    // Auto-fix duplicate nomor_dokumen if collision occurs
    if ($request->has('nomor_dokumen')) {
        $nomor = $request->input('nomor_dokumen');
        if (Dokumen::where('nomor_dokumen', $nomor)->exists()) {
            $newNomor = $nomor . '-' . rand(1000, 9999);
            $request->merge(['nomor_dokumen' => $newNomor]);
        }
    }

    // Determine validation rules based on masterflow_id
    $rules = [
        'nomor_dokumen' => 'required|string',
        'judul_dokumen' => 'required|string|max:255',
        'tgl_pengajuan' => 'required|date',
        'tgl_deadline' => 'required|date|after_or_equal:tgl_pengajuan',
        'deskripsi' => 'nullable|string',
        'tipe_dokumen' => 'nullable|string',
        'nominal_transaksi' => 'nullable|numeric|min:0',
        'aplikasi_id'    => 'nullable|required_if:category,transaksi|exists:aplikasis,id',
        'tipe_transaksi' => 'nullable|required_if:category,transaksi|in:cuti,lembur,Purchase Request,Purchase Order',
        'file' => 'required|file|mimes:pdf|max:10240', // 10MB - Strictly PDF only for digital signature support
        'submit_type' => 'required|in:draft,submit', // Validate submit type
    ];

    // Check if custom approval or existing masterflow
    if ($request->masterflow_id === 'custom') {
        $rules['custom_approvers'] = 'nullable|array';
        $rules['custom_approvers.*.email'] = 'nullable|email';
        $rules['custom_approvers.*.order'] = 'nullable|integer|min:1';
    } else {
        $rules['masterflow_id'] = 'nullable';
        // Accept both single approvers and group approvers
        $rules['approvers'] = 'nullable|array';
        $rules['approvers.*'] = 'nullable|exists:users,id';
        $rules['step_approvers'] = 'nullable|array';
        $rules['step_approvers.*.jenis_group'] = 'nullable|in:all_required,any_one,majority';
        $rules['step_approvers.*.user_ids'] = 'nullable|array';
        $rules['step_approvers.*.user_ids.*'] = 'nullable|exists:users,id';
    }

    $validated = $request->validate($rules);

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
            'company_id' => $context->company_id,
            'aplikasi_id' => $context->aplikasi_id,
            'masterflow_id' => $request->masterflow_id === 'custom' ? null : $validated['masterflow_id'],
            'status' => $status,
            'tgl_pengajuan' => $validated['tgl_pengajuan'],
            'tgl_deadline' => $validated['tgl_deadline'],
            'tipe_dokumen' => $validated['tipe_dokumen'],
            'nominal_transaksi' => $validated['nominal_transaksi'] ?? null,
            'deskripsi' => $validated['deskripsi'] ?? null,
        'tipe_transaksi' => $request->tipe_transaksi,
            'status_current' => $statusCurrent,
        ]);

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
            $path = $file->storeAs($folderPath, $filename, 'public');

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
            } else if (!empty($validated['masterflow_id'])) {
                // Existing masterflow - create approvals from selected approvers
                $masterflow = Masterflow::with('steps')->find($validated['masterflow_id']);

                if ($masterflow) {
    // Ambil nominal dan tipe dokumen
    $nominal = (float) ($validated['nominal_transaksi'] ?? 0);
    $tipeDokumen = $validated['tipe_dokumen'] ?? '';

    $steps = $masterflow->steps;

    // Tipe dokumen yang dikecualikan dari pembatasan nominal (misal Memo Internal)
    $tipeTanpaNominal = ['memo_internal'];

    // Filter HANYA berjalan jika tipe dokumen BUKAN memo_internal DAN nominal > 0 DAN nominal < 5 Juta
    if (!in_array($tipeDokumen, $tipeTanpaNominal) && $nominal > 0 && $nominal < 5000000) {
        $steps = $steps->filter(function ($step) {
            $namaStep = strtolower($step->step_name ?? '');

            // Abaikan step yang mengandung kata 'kepala divisi' atau 'direktur'
            $isHighLevel = str_contains($namaStep, 'kepala divisi') || str_contains($namaStep, 'direktur');

            // Kembalikan true HANYA untuk step yang BUKAN high level
            return !$isHighLevel;
        });
    }

                    $minStepOrder = $steps->min('step_order');

                    Log::info('Processing masterflow steps', [
                        'masterflow_id' => $masterflow->id,
                        'steps_count' => $steps->count(),
                        'has_step_approvers' => $request->has('step_approvers'),
                        'step_approvers_keys' => $request->has('step_approvers') ? array_keys($request->input('step_approvers', [])) : [],
                    ]);

                    foreach ($steps as $step) {
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
                                    'approval_order' => $step->step_order,
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
                                    'approval_order' => $step->step_order,
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
            }
        }
            
        // Handle signature positions if any
        if ($request->has('signature_positions')) {
            $positions = json_decode($request->signature_positions, true);
            if (is_array($positions)) {
                $positionsData = [];
                foreach ($positions as $pos) {
                    $frontendId = $pos['dokumen_approval_id'];
                    $approvalIds = [];
                    
                    if (isset($frontendIdToApprovalId[$frontendId])) {
                        $mapped = $frontendIdToApprovalId[$frontendId];
                        if (is_array($mapped)) {
                            $approvalIds = $mapped;
                        } else {
                            $approvalIds = [$mapped];
                        }
                    }
                    
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
            'dokumen' => $dokumen->load(['user', 'masterflow', 'latestVersion', 'approvals.user']),
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
                $newVersion = $versionParts[0] . '.' . ((int)$versionParts[1] + 1);

                // Create filename: nomor_dokumen_judul_dokumen_v{version}.ext
                $extension = $file->getClientOriginalExtension();
                $versionNumber = str_replace('.', '', $newVersion); // 1.0 -> 10, 1.1 -> 11
                $filename = $dokumen->nomor_dokumen . '_' . $cleanJudul . '_v' . $versionNumber . '.' . $extension;

                // Store file in document-specific folder
                $path = $file->storeAs($folderPath, $filename, 'public');

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
            if (Storage::disk('public')->exists($version->file_url)) {
                Storage::disk('public')->delete($version->file_url);
            }
        }

        $dokumen->delete();

return response()->json([
    'message' => 'Dokumen berhasil dihapus!',
], 200);
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

        if (!$masterflow) {
            // Document uses Custom Approval Flow - approvals are created separately or already created
            return;
        }

        if (!$masterflow->steps) {
            return;
        }

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
            $path = $file->storeAs($folderPath, $filename, 'public');

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
$targetUserId = $approval->user_id;

// Untuk custom approver, user_id bisa NULL.
// Cari user berdasarkan approver_email.
$targetUserId = null;

if ($approval->approver_email) {
    $targetUserId = \App\Models\User::whereRaw(
        'LOWER(email) = ?',
        [strtolower(trim($approval->approver_email))]
    )->value('id');
}

if ($targetUserId) {
    broadcast(new BrowserNotificationEvent(
        userId: (int) $targetUserId,
        title: 'Dokumen Telah Direvisi',
        body: "Dokumen '{$dokumen->judul_dokumen}' telah direvisi dan membutuhkan persetujuan Anda.",
        url: route('approvals.show', $approval->id),
        type: 'info'
    ));
} else {
    Log::warning('Gagal broadcast notif revisi: user approver tidak ditemukan', [
        'approval_id' => $approval->id,
        'approver_email' => $approval->approver_email,
    ]);
}
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
    public function download(Dokumen $dokumen, $versionId = null, PdfSignatureService $pdfSignatureService = null)
    {
        $pdfSignatureService = $pdfSignatureService ?? app(PdfSignatureService::class);

        $version = $versionId
            ? $dokumen->versions()->findOrFail($versionId)
            : $dokumen->latestVersion;

        if (!$version) {
            return back()->withErrors(['error' => 'Versi dokumen tidak ditemukan.']);
        }

        // Check if original file exists
        if (!$version->file_url || !Storage::disk('public')->exists($version->file_url)) {
            return back()->withErrors(['error' => 'File tidak ditemukan.']);
        }

        // Option to explicitly download original PDF without signatures
        if (request()->has('original') && request('original') == '1') {
            $filePath = Storage::disk('public')->path($version->file_url);
            return response()->download($filePath, 'ASLI_' . $version->nama_file);
        }

        // Get approved signatures for this document
        $approvedSignatures = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->where('approval_status', 'approved')
            ->whereNotNull('signature_path')
            ->with(['user', 'masterflowStep'])
            ->orderBy('created_at')
            ->get();

        // If there are approved signatures, generate signed PDF on-the-fly
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
                Log::error('Failed to generate signed PDF for download', [
                    'error' => $e->getMessage(),
                    'dokumen_id' => $dokumen->id,
                    'version_id' => $version->id,
                ]);
                // Fallback to original file
            }
        }

        // Download original file
        $filePath = Storage::disk('public')->path($version->file_url);
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

        // Check if original file exists
        if (!$version->file_url || !Storage::disk('public')->exists($version->file_url)) {
            abort(404, 'File tidak ditemukan.');
        }

        // Get approved signatures for this document
        $approvedSignatures = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->where('approval_status', 'approved')
            ->whereNotNull('signature_path')
            ->with(['user', 'masterflowStep'])
            ->orderBy('created_at')
            ->get();

        // If no signatures or not a PDF, stream original file
        if ($approvedSignatures->count() === 0 || strtolower($version->tipe_file) !== 'pdf') {
            $filePath = Storage::disk('public')->path($version->file_url);
            return response()->file($filePath, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        // Generate signed PDF on-the-fly
        try {
            $pdfContent = $pdfSignatureService->generateSignedPdfStream(
                $version->file_url,
                $approvedSignatures
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
            $filePath = Storage::disk('public')->path($version->file_url);
            return response()->file($filePath, [
                'Content-Type' => 'application/pdf',
            ]);
        }
    }

    public function viewFile($id)
{
    // 1. Cari dokumen beserta relasi versinya
    $dokumen = Dokumen::with(['versions'])->find($id);

    if (!$dokumen) {
        Log::error("Dokumen ID {$id} tidak ditemukan.");
        abort(404, 'Dokumen tidak ditemukan');
    }

    // 2. Ambil versi terbaru
    $latestVersion = $dokumen->versions->sortByDesc('created_at')->first();

    // Gunakan file_url sesuai struktur database
    $rawPath = $latestVersion?->file_url ?? $latestVersion?->file_path;

    if (!$latestVersion || !$rawPath) {
        Log::error("Path file pada versi dokumen ID {$id} kosong.");
        abort(404, 'Versi dokumen atau path file tidak ditemukan');
    }

    // 3. Bersihkan prefix path jika ada
    $relativePath = ltrim($rawPath, '/');
    if (str_starts_with($relativePath, 'storage/')) {
        $relativePath = substr($relativePath, 8);
    }

    // 4. Cek beberapa lokasi kemungkinan penyimpanannya
    $possiblePaths = [
        storage_path('app/public/' . $relativePath),
        storage_path('app/' . $relativePath),
        public_path('storage/' . $relativePath),
        public_path($relativePath),
    ];

    $fullPath = null;
    foreach ($possiblePaths as $path) {
        if (file_exists($path)) {
            $fullPath = $path;
            break;
        }
    }

    if (!$fullPath) {
        Log::error("File fisik PDF tidak ditemukan di server. Path DB: {$rawPath}");
        abort(404, 'File fisik PDF tidak ditemukan');
    }

    // 5. Response inline PDF
    return response()->file($fullPath, [
        'Content-Type' => 'application/pdf',
        'Content-Disposition' => 'inline; filename="' . ($latestVersion->nama_file ?? 'dokumen.pdf') . '"'
    ]);
}



public function lookupExternal(Request $request)
{
    $request->validate([
        'aplikasi_id' => 'required',
        'transaksi_id' => 'required|exists:transaksis,id',
        'keyword' => 'required|string'
    ]);

    $keyword = trim($request->keyword);

    // === 1. VALIDASI KODE TRANSAKSI DARI DATABASE ===
    $transaksi = Transaksi::find($request->transaksi_id);
    if ($transaksi) {
        $kodeTransaksi = strtoupper(trim($transaksi->kode_transaksi));
        // Ambil prefix dasar (contoh: "PO-ERP" -> "PO", "PR 01" -> "PR", "PO" -> "PO")
        $basePrefix = strtoupper(explode('-', explode(' ', $kodeTransaksi)[0])[0]);

        // Mapping toleransi awalan prefix yang diizinkan untuk setiap transaksi
        $prefixMap = [
            'PR-ERP'  => ['RQE', 'PR'],
            'PO-ERP'  => ['POE', 'PO'],
            'PV-ERP'  => ['PVE', 'PV'],
            'CUTI-HR' => ['CCA', 'CUTI'],
            'REIM-HR' => ['REIM'],
        ];

        if (array_key_exists($kodeTransaksi, $prefixMap)) {
            $allowedPrefixes = $prefixMap[$kodeTransaksi];
        } else {
            $allowedPrefixes = [$basePrefix];
            if ($basePrefix === 'PR') $allowedPrefixes[] = 'RQE';
            if ($basePrefix === 'PO') $allowedPrefixes[] = 'POE';
            if ($basePrefix === 'CUTI') $allowedPrefixes[] = 'CCA';
            if ($basePrefix === 'PV') $allowedPrefixes[] = 'PVE';
        }

        $keywordUpper = strtoupper($keyword);
        $isValid = false;
        foreach ($allowedPrefixes as $prefix) {
            if (str_starts_with($keywordUpper, strtoupper($prefix))) {
                $isValid = true;
                break;
            }
        }

        if (!$isValid) {
            $namaTransaksi = $transaksi->nama_transaksi;
            $contohPrefix = implode(' atau ', array_map(fn($p) => "<b>{$p}-XXXXX</b>", $allowedPrefixes));
            return response()->json([
                'status'  => 'error',
                'message' => "Kode yang Anda masukkan tidak sesuai dengan jenis transaksi \"<b>{$namaTransaksi}</b>\". "
                           . "Gunakan kode dengan awalan: {$contohPrefix}."
            ], 422);
        }
    }
    // ===============================================

    // Helper untuk mengambil file PDF template Tisera asli
    $getPdfBase64 = function ($filename) {
        $path = storage_path("app/dummy_templates/{$filename}.pdf");
        if (file_exists($path)) {
            return base64_encode(file_get_contents($path));
        }
        return 'JVBERi0xLjQKJcOkw7zDtsO5CjEgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+CmVuZG9iagoyIDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL1Jlc291cmNlcyA0IDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUuMjggODQxLjg5XSAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0ZvbnQgPDwgL0YxIDYgMCBSID4+ID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNDQgPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihUZXN0IFBERiBmcm9tIEFQSSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNyAwMDAwMCBuIAowMDAwMDAwMjI0IDAwMDAwIG4gCjAwMDAwMDAwMjY4IDAwMDAwIG4gCjAwMDAwMDAzNjIgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA3IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo0NTEKJSVFT0YK';
    };

    // 2. Cek Purchase Request (RQE-22001433, RQE-22001434, RQE-22001435)
    if (stripos($keyword, 'RQE') !== false || stripos($keyword, '22001433') !== false || stripos($keyword, '22001434') !== false || stripos($keyword, '22001435') !== false) {
        if (stripos($keyword, '22001434') !== false) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nomor_dokumen' => 'RQE-22001434/100000',
                    'judul' => 'Pengadaan Kertas HVS SiDU A4 Surat Jalan & Faktur - MDC Solo TD',
                    'nominal' => '2500000',
                    'tanggal' => '2026-08-01',
                    'pdf_base64' => $getPdfBase64('RQE-22001434')
                ]
            ]);
        } elseif (stripos($keyword, '22001435') !== false) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nomor_dokumen' => 'RQE-22001435/100000',
                    'judul' => 'Pengadaan Barcode Scanner Honeywell Wireless - Gudang TD Yogya',
                    'nominal' => '4200000',
                    'tanggal' => '2026-08-15',
                    'pdf_base64' => $getPdfBase64('RQE-22001435')
                ]
            ]);
        } else {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nomor_dokumen' => 'RQE-22001433/100000',
                    'judul' => 'Pengadaan Printer Epson L3250 Operasional BO Kediri - MDC Solo TD',
                    'nominal' => '2850000',
                    'tanggal' => '2026-07-07',
                    'pdf_base64' => $getPdfBase64('RQE-22001433')
                ]
            ]);
        }
    }

    // 3. Cek Purchase Order (POE-22005020, POE-22005021, POE-22005022)
    if (stripos($keyword, 'POE') !== false || stripos($keyword, '22005020') !== false || stripos($keyword, '22005021') !== false || stripos($keyword, '22005022') !== false) {
        if (stripos($keyword, '22005021') !== false) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nomor_dokumen' => 'POE-22005021/100000',
                    'judul' => 'PO Buku Siswa SMP Kurikulum Merdeka - PT Tiga Serangkai Pustaka Mandiri',
                    'nominal' => '19425000',
                    'tanggal' => '2026-08-12',
                    'pdf_base64' => $getPdfBase64('POE-22005021')
                ]
            ]);
        } elseif (stripos($keyword, '22005022') !== false) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nomor_dokumen' => 'POE-22005022/100000',
                    'judul' => 'PO Cetak Continuous Form Faktur & Surat Jalan 3-Ply - PT Wangsa Jatra Lestari',
                    'nominal' => '12250000',
                    'tanggal' => '2026-08-20',
                    'pdf_base64' => $getPdfBase64('POE-22005022')
                ]
            ]);
        } else {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nomor_dokumen' => 'POE-22005020/100000',
                    'judul' => 'PO GRENGSENG Basa Jawa SMP 7, 8, 9 - MEDIA KARYA PUTRA. CV',
                    'nominal' => '9446640',
                    'tanggal' => '2026-08-10',
                    'pdf_base64' => $getPdfBase64('POE-22005020')
                ]
            ]);
        }
    }

    // 4. Cek Calculation NPK (CCA-00000002, CCA-00000003, CCA-00000004)
    if (stripos($keyword, 'CCA') !== false || stripos($keyword, '00000002') !== false || stripos($keyword, '00000003') !== false || stripos($keyword, '00000004') !== false) {
        if (stripos($keyword, '00000003') !== false) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nomor_dokumen' => 'CCA-00000003/110303',
                    'judul' => 'Pengadaan Kursi Siswa SMPN 1 Enrekang - CV Meubel Jati Indah (Cab. Pare-Pare)',
                    'nominal' => '10000000',
                    'tanggal' => '2026-08-15',
                    'pdf_base64' => $getPdfBase64('CCA-00000003')
                ]
            ]);
        } elseif (stripos($keyword, '00000004') !== false) {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nomor_dokumen' => 'CCA-00000004/100000',
                    'judul' => 'Paket Modul Muatan Lokal Budaya Solo - Dinas Pendidikan Kota Surakarta',
                    'nominal' => '25000000',
                    'tanggal' => '2026-08-25',
                    'pdf_base64' => $getPdfBase64('CCA-00000004')
                ]
            ]);
        } else {
            return response()->json([
                'status' => 'success',
                'data' => [
                    'nomor_dokumen' => 'CCA-00000002/110303',
                    'judul' => 'Meja Siswa Kayu Jati SD NEGERI 22 MURANTE - UD Kembang Jati (Cab. Pare-Pare)',
                    'nominal' => '9000000',
                    'tanggal' => '2026-08-08',
                    'pdf_base64' => $getPdfBase64('CCA-00000002')
                ]
            ]);
        }
    }

    return response()->json(['status' => 'error', 'message' => "Data transaksi dengan nomor '{$keyword}' tidak ditemukan."], 404);
}
}