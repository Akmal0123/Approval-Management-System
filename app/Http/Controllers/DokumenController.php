<?php

namespace App\Http\Controllers;

use App\Models\Aplikasi;
use App\Models\Company;
use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\DokumenApproval;
use App\Models\Masterflow;
use App\Models\Comment;
use App\Models\RevisionLog;
use App\Models\User;
use App\Events\ApprovalCreated;
use App\Events\BrowserNotificationEvent;
use App\Jobs\SendApprovalNotification;
use App\Mail\RevisionUploadedMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Services\ContextService;
use App\Services\PdfSignatureService;
use App\Services\QrCodeService;

class DokumenController extends Controller
{
    protected ContextService $contextService;

    public function __construct(ContextService $contextService)
    {
        $this->contextService = $contextService;
    }

    /**
     * API: Get list of applications and companies for frontend select/tables.
     */
    public function getAplikasiList(Request $request)
    {
        // Menampilkan SEMUA data aplikasi tanpa dibatasi oleh perusahaan aktif
        $query = Aplikasi::with('company')->latest();

        $aplikasis = $query->get();
        $companies = Company::all();

        return response()->json([
            'success'   => true,
            'data'      => $aplikasis,
            'aplikasis' => $aplikasis,
            'companies' => $companies,
        ]);
    }

    /**
     * API: Get list of documents (returns JSON).
     */
    public function apiIndex(Request $request)
    {
        $query = Dokumen::with(['user', 'company', 'aplikasi', 'masterflow', 'latestVersion', 'approvals.user', 'aplikasiManagement'])
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
                    ->orWhere('deskripsi', 'like', '%' . $request->search . '%')
                    ->orWhere('nomor_dokumen', 'like', '%' . $request->search . '%');
            });
        }

        $dokumen = $query->get();

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
        return $this->apiIndex($request);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $query = Masterflow::where('is_active', true);

        if (!$this->contextService->isSuperAdmin()) {
            $companyId = $this->contextService->getCurrentCompanyId();
            if ($companyId) {
                $query->where('company_id', $companyId);
            }
        }

        $masterflows = $query->get();

        $appQuery = Aplikasi::with('company')->latest();
        if (!$this->contextService->isSuperAdmin()) {
            $companyId = $this->contextService->getCurrentCompanyId();
            if ($companyId) {
                $appQuery->where('company_id', $companyId);
            }
        }
        $masterAplikasis = $appQuery->get();

        return Inertia::render('Dokumen/Create', [
            'masterflows' => $masterflows,
            'masterAplikasis' => $masterAplikasis,
            'aplikasis' => $masterAplikasis,
            'companies' => Company::all(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request, QrCodeService $qrCodeService)
    {
        $context = $this->contextService->getContext();

        if ($request->has('nomor_dokumen')) {
            $nomor = $request->input('nomor_dokumen');
            if (Dokumen::where('nomor_dokumen', $nomor)->exists()) {
                $newNomor = $nomor . '-' . rand(1000, 9999);
                $request->merge(['nomor_dokumen' => $newNomor]);
            }
        }

        $fileRule = ($request->input('jenis_pengajuan') === 'transaksi') ? 'nullable|file|mimes:pdf|max:10240' : 'required|file|mimes:pdf|max:10240';

        $rules = [
            'jenis_pengajuan' => 'nullable|in:manual,transaksi',
            'modul_transaksi' => 'nullable|string',
            'transaksi_management' => 'nullable|string',
            'aplikasi_unit_id' => 'nullable|exists:aplikasis,id',
            'aplikasi_id' => 'nullable|exists:aplikasis,id',
            'kategori_hris' => 'nullable|string',
            'nama_karyawan_nip' => 'nullable|string|max:255',
            'vendor_name' => 'nullable|string|max:255',
            'payment_terms' => 'nullable|string|max:255',
            'urgensi_memo' => 'nullable|string|max:255',
            'metode_pembayaran' => 'nullable|string|max:255',
            'rekening_vendor' => 'nullable|string|max:255',
            'items_transaksi' => 'nullable',
            'nomor_dokumen' => 'required|string',
            'judul_dokumen' => 'required|string|max:255',
            'tipe_dokumen' => 'nullable|string',
            'nominal' => 'nullable|numeric|min:0',
            'tgl_pengajuan' => 'required|date',
            'tgl_deadline' => 'required|date|after_or_equal:tgl_pengajuan',
            'deskripsi' => 'nullable|string',
            'file' => $fileRule,
            'submit_type' => 'required|in:draft,submit',
            'sig_x' => 'nullable|numeric|min:0|max:100',
            'sig_y' => 'nullable|numeric|min:0|max:100',
            'sig_page' => 'nullable|string|in:first,last,all',
            'signature_position_x' => 'nullable|numeric|min:0|max:100',
            'signature_position_y' => 'nullable|numeric|min:0|max:100',
            'signature_page' => 'nullable|string|in:first,last,all',
            'approver_positions' => 'nullable|array',
            'custom_approver_positions' => 'nullable|array',
            'is_qr_active' => 'nullable|boolean',
            'qr_pos_x' => 'nullable|numeric|min:0|max:100',
            'qr_pos_y' => 'nullable|numeric|min:0|max:100',
            'qr_page' => 'nullable|string',
        ];

        if ($request->masterflow_id === 'custom') {
            $rules['custom_approvers'] = 'nullable|array';
            $rules['custom_approvers.*.email'] = 'nullable|email';
            $rules['custom_approvers.*.order'] = 'nullable|integer|min:1';
        } else {
            $rules['masterflow_id'] = 'nullable';
            $rules['approvers'] = 'nullable|array';
            $rules['approvers.*'] = 'nullable|exists:users,id';
            $rules['step_approvers'] = 'nullable|array';
            $rules['step_approvers.*.jenis_group'] = 'nullable|in:all_required,any_one,majority';
            $rules['step_approvers.*.user_ids'] = 'nullable|array';
            $rules['step_approvers.*.user_ids.*'] = 'nullable|exists:users,id';
        }

        $validated = $request->validate($rules);

        $itemsTransaksiData = $request->input('items_transaksi');
        if (is_string($itemsTransaksiData)) {
            $itemsTransaksiData = json_decode($itemsTransaksiData, true);
        }

        DB::beginTransaction();
        try {
            $submitType = $validated['submit_type'];
            $status = $submitType === 'draft' ? 'draft' : 'submitted';
            $statusCurrent = $submitType === 'draft' ? 'draft' : 'waiting_approval_1';

            $masterflowIdVal = ($request->masterflow_id === 'custom' || empty($request->masterflow_id)) ? null : $request->masterflow_id;

            $companyId = $context?->company_id ?? Auth::user()->company_id ?? 1;
            $selectedAplikasiId = $validated['aplikasi_unit_id'] ?? $validated['aplikasi_id'] ?? $context?->aplikasi_id ?? 1;

            if (empty($masterflowIdVal) && $request->masterflow_id !== 'custom' && !empty($validated['tipe_dokumen'])) {
                $nominalVal = $validated['nominal'] ?? 0;
                $matchedFlow = Masterflow::where('company_id', $companyId)
                    ->where('is_active', true)
                    ->where('tipe_dokumen', $validated['tipe_dokumen'])
                    ->where(function ($q) use ($nominalVal) {
                        $q->whereNull('max_nominal')
                          ->orWhere('max_nominal', '>=', $nominalVal);
                    })
                    ->first();

                if ($matchedFlow) {
                    $masterflowIdVal = $matchedFlow->id;
                }
            }

            $sigX = $validated['sig_x'] ?? $validated['signature_position_x'] ?? 70.0;
            $sigY = $validated['sig_y'] ?? $validated['signature_position_y'] ?? 80.0;
            $sigPage = $validated['sig_page'] ?? $validated['signature_page'] ?? 'last';

            $dokumen = Dokumen::create([
                'jenis_pengajuan' => $validated['jenis_pengajuan'] ?? 'manual',
                'modul_transaksi' => $validated['modul_transaksi'] ?? $validated['transaksi_management'] ?? null,
                'aplikasi_unit_id' => $selectedAplikasiId,
                'kategori_hris' => $validated['kategori_hris'] ?? null,
                'nama_karyawan_nip' => $validated['nama_karyawan_nip'] ?? null,
                'vendor_name' => $validated['vendor_name'] ?? null,
                'payment_terms' => $validated['payment_terms'] ?? null,
                'urgensi_memo' => $validated['urgensi_memo'] ?? null,
                'metode_pembayaran' => $validated['metode_pembayaran'] ?? null,
                'rekening_vendor' => $validated['rekening_vendor'] ?? null,
                'items_transaksi' => $itemsTransaksiData ?? null,
                'nomor_dokumen' => $validated['nomor_dokumen'],
                'judul_dokumen' => $validated['judul_dokumen'],
                'tipe_dokumen' => $validated['tipe_dokumen'] ?? 'proposal',
                'nominal' => $validated['nominal'] ?? null,
                'user_id' => Auth::id(),
                'company_id' => $companyId,
                'aplikasi_id' => $selectedAplikasiId,
                'masterflow_id' => $masterflowIdVal,
                'status' => $status,
                'tgl_pengajuan' => $validated['tgl_pengajuan'],
                'tgl_deadline' => $validated['tgl_deadline'],
                'deskripsi' => $validated['deskripsi'] ?? null,
                'status_current' => $statusCurrent,
                'signature_position_x' => $sigX,
                'signature_position_y' => $sigY,
                'signature_page' => $sigPage,
                'is_qr_active' => $validated['is_qr_active'] ?? false,
                'qr_pos_x' => $validated['qr_pos_x'] ?? null,
                'qr_pos_y' => $validated['qr_pos_y'] ?? null,
                'qr_page' => $validated['qr_page'] ?? 'last',
            ]);

            try {
                $verificationUrl = route('dokumen.show', $dokumen->id);
                $qrPath = $qrCodeService->generateDocumentQrCode($dokumen->nomor_dokumen, $verificationUrl);
                $dokumen->update([
                    'qr_code_path' => $qrPath,
                    'qr_code_hash' => md5($dokumen->nomor_dokumen . '_' . time()),
                ]);
            } catch (\Throwable $qrEx) {
                Log::warning('QR Code generation failed for document ID ' . $dokumen->id . ': ' . $qrEx->getMessage());
            }

            $version = null;
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $folderPath = 'dokumen/' . $validated['nomor_dokumen'];

                $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $validated['judul_dokumen']);
                $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);

                $extension = $file->getClientOriginalExtension();
                $filename = $validated['nomor_dokumen'] . '_' . $cleanJudul . '_v1.' . $extension;

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
            }

            $versionId = $version?->id;

            if ($request->masterflow_id === 'custom') {
                if (!empty($validated['custom_approvers'])) {
                    $cOrder = 0;
                    foreach ($validated['custom_approvers'] as $approver) {
                        if (!empty($approver['email'])) {
                            $cOrder++;
                            $initialStatus = ($cOrder === 1 && $submitType !== 'draft') ? 'pending' : 'waiting';

                            DokumenApproval::create([
                                'dokumen_id' => $dokumen->id,
                                'approver_email' => $approver['email'],
                                'approval_order' => $approver['order'] ?? $cOrder,
                                'dokumen_version_id' => $versionId,
                                'approval_status' => $initialStatus,
                                'tgl_deadline' => $validated['tgl_deadline'],
                            ]);
                        }
                    }
                }
            } else if (!empty($validated['masterflow_id'])) {
                $masterflow = Masterflow::with('steps.jabatan')->find($validated['masterflow_id']);

                if ($masterflow) {
                    $nominalVal = (float) ($validated['nominal'] ?? 0);
                    $createdStepIndex = 0;
                    $sortedSteps = $masterflow->steps->sortBy('step_order');

                    foreach ($sortedSteps as $step) {
                        $jabatanName = strtolower($step->jabatan->name ?? '');
                        $createdStepIndex++;

                        $isSkippedByThreshold = ($nominalVal > 0 && $nominalVal < 5000000 && str_contains($jabatanName, 'kepala divisi'));

                        if ($isSkippedByThreshold) {
                            $initialStatus = 'skipped';
                        } else {
                            $initialStatus = ($createdStepIndex === 1 && $submitType !== 'draft') ? 'pending' : 'waiting';
                        }

                        if ($request->has("step_approvers.{$step->id}")) {
                            $stepApprover = $request->input("step_approvers.{$step->id}");
                            $groupIndex = 'user_selected_' . $dokumen->id . '_' . $step->id;

                            if (!empty($stepApprover['user_ids'])) {
                                foreach ($stepApprover['user_ids'] as $userId) {
                                    $approval = DokumenApproval::create([
                                        'dokumen_id' => $dokumen->id,
                                        'user_id' => $userId,
                                        'masterflow_step_id' => $step->id,
                                        'approval_order' => $createdStepIndex,
                                        'dokumen_version_id' => $versionId,
                                        'approval_status' => $initialStatus,
                                        'tgl_deadline' => $validated['tgl_deadline'],
                                        'group_index' => $groupIndex,
                                        'jenis_group' => $stepApprover['jenis_group'] ?? null,
                                        'comment' => null,
                                        'tgl_approve' => $isSkippedByThreshold ? now() : null,
                                        'pos_x' => $validated['approver_positions'][$step->id]['x'] ?? $sigX,
                                        'pos_y' => $validated['approver_positions'][$step->id]['y'] ?? $sigY,
                                        'page' => $validated['approver_positions'][$step->id]['page'] ?? $sigPage,
                                    ]);

                                    if ($initialStatus === 'pending') {
                                        try {
                                            broadcast(new ApprovalCreated($approval))->toOthers();
                                            SendApprovalNotification::dispatch($approval);
                                        } catch (\Throwable $notifEx) {
                                            Log::warning('Failed notif: ' . $notifEx->getMessage());
                                        }
                                    }
                                }
                            }
                        } else {
                            if (isset($validated['approvers'][$step->id])) {
                                $userId = $validated['approvers'][$step->id];

                                $approval = DokumenApproval::create([
                                    'dokumen_id' => $dokumen->id,
                                    'user_id' => $userId,
                                    'masterflow_step_id' => $step->id,
                                    'approval_order' => $createdStepIndex,
                                    'dokumen_version_id' => $versionId,
                                    'approval_status' => $initialStatus,
                                    'tgl_deadline' => $validated['tgl_deadline'],
                                    'comment' => null,
                                    'tgl_approve' => $isSkippedByThreshold ? now() : null,
                                    'pos_x' => $validated['approver_positions'][$step->id]['x'] ?? $sigX,
                                    'pos_y' => $validated['approver_positions'][$step->id]['y'] ?? $sigY,
                                    'page' => $validated['approver_positions'][$step->id]['page'] ?? $sigPage,
                                ]);

                                if ($initialStatus === 'pending') {
                                    try {
                                        broadcast(new ApprovalCreated($approval))->toOthers();
                                        SendApprovalNotification::dispatch($approval);
                                        broadcast(new BrowserNotificationEvent(
                                            userId: $userId,
                                            title: 'Dokumen Baru Membutuhkan Persetujuan',
                                            body: "Dokumen '{$dokumen->judul_dokumen}' membutuhkan persetujuan Anda.",
                                            url: route('approvals.show', $approval->id),
                                            type: 'info'
                                        ));
                                    } catch (\Throwable $notifEx) {
                                        Log::warning('Failed notification: ' . $notifEx->getMessage());
                                    }
                                }
                            }
                        }
                    }
                }
            }

            DB::commit();

            $message = $submitType === 'draft'
                ? 'Dokumen berhasil disimpan sebagai draft!'
                : 'Dokumen berhasil disubmit untuk approval!';

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => $message,
                    'dokumen' => $dokumen->fresh()->load(['user', 'company', 'aplikasi', 'masterflow', 'latestVersion', 'approvals.user', 'aplikasiManagement']),
                ], 201);
            }

            return back()->with([
                'success' => $message,
                'dokumen' => $dokumen->load(['user', 'company', 'aplikasi', 'masterflow', 'latestVersion', 'approvals.user', 'aplikasiManagement']),
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error creating dokumen: ' . $e->getMessage());

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['message' => 'Gagal membuat dokumen: ' . $e->getMessage()], 500);
            }

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
        $dokumen->load([
            'user',
            'company',
            'aplikasi',
            'aplikasiManagement',
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

        return Inertia::render('Dokumen/Show', [
            'dokumen' => $dokumen,
            'aplikasis' => Aplikasi::with('company')->latest()->get(),
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
        $masterAplikasis = Aplikasi::with('company')->get();

        return Inertia::render('Dokumen/Edit', [
            'dokumen' => $dokumen->load(['company', 'aplikasi', 'aplikasiManagement']),
            'masterflows' => $masterflows,
            'masterAplikasis' => $masterAplikasis,
            'aplikasis' => $masterAplikasis,
            'companies' => Company::all(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Dokumen $dokumen)
    {
        if (!in_array($dokumen->status, ['draft', 'rejected'])) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['message' => 'Dokumen tidak dapat diupdate dalam status ini.'], 422);
            }
            return redirect()->route('dokumen.show', $dokumen->id)
                ->withErrors(['error' => 'Dokumen tidak dapat diupdate dalam status ini.']);
        }

        $validated = $request->validate([
            'judul_dokumen' => 'required|string|max:255',
            'tgl_deadline' => 'nullable|date',
            'deskripsi' => 'nullable|string',
            'file' => 'nullable|file|mimes:pdf|max:10240',
            'sig_x' => 'nullable|numeric|min:0|max:100',
            'sig_y' => 'nullable|numeric|min:0|max:100',
            'sig_page' => 'nullable|string|in:first,last,all',
            'signature_position_x' => 'nullable|numeric|min:0|max:100',
            'signature_position_y' => 'nullable|numeric|min:0|max:100',
            'signature_page' => 'nullable|string|in:first,last,all',
        ]);

        DB::beginTransaction();
        try {
            $dokumen->update([
                'judul_dokumen' => $validated['judul_dokumen'],
                'tgl_deadline' => array_key_exists('tgl_deadline', $validated) && $validated['tgl_deadline'] ? $validated['tgl_deadline'] : $dokumen->tgl_deadline,
                'deskripsi' => array_key_exists('deskripsi', $validated) ? $validated['deskripsi'] : $dokumen->deskripsi,
                'signature_position_x' => $validated['sig_x'] ?? $validated['signature_position_x'] ?? $dokumen->signature_position_x,
                'signature_position_y' => $validated['sig_y'] ?? $validated['signature_position_y'] ?? $dokumen->signature_position_y,
                'signature_page' => $validated['sig_page'] ?? $validated['signature_page'] ?? $dokumen->signature_page,
            ]);

            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $folderPath = 'dokumen/' . $dokumen->nomor_dokumen;

                $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
                $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);

                $latestVersion = $dokumen->versions()->latest()->first();
                $versionParts = explode('.', $latestVersion?->version ?? '1.0');
                $newVersion = $versionParts[0] . '.' . ((int)($versionParts[1] ?? 0) + 1);

                $extension = $file->getClientOriginalExtension();
                $versionNumber = str_replace('.', '', $newVersion);
                $filename = $dokumen->nomor_dokumen . '_' . $cleanJudul . '_v' . $versionNumber . '.' . $extension;

                $path = $file->storeAs($folderPath, $filename, 'public');

                $dokumen->versions()->update(['status' => 'archived']);

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

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json([
                    'message' => 'Dokumen berhasil diupdate!',
                    'dokumen' => $dokumen->fresh(['versions', 'user', 'company', 'aplikasi', 'aplikasiManagement']),
                ]);
            }

            return redirect()->back()->with('success', 'Dokumen berhasil diupdate!');
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error updating dokumen: ' . $e->getMessage());

            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['message' => 'Gagal mengupdate dokumen: ' . $e->getMessage()], 500);
            }

            return back()->withErrors(['error' => 'Gagal mengupdate dokumen: ' . $e->getMessage()])->withInput();
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Dokumen $dokumen)
    {
        $user = Auth::user();
        if ($user && (int)$dokumen->user_id !== (int)$user->id && !$this->contextService->isSuperAdmin()) {
            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json(['message' => 'Anda tidak berhak menghapus dokumen ini.'], 403);
            }
            return back()->withErrors(['error' => 'Anda tidak berhak menghapus dokumen ini.']);
        }

        if ($dokumen->status !== 'draft') {
            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json(['message' => 'Hanya dokumen draft yang dapat dihapus.'], 422);
            }
            return back()->withErrors(['error' => 'Hanya dokumen draft yang dapat dihapus.']);
        }

        foreach ($dokumen->versions as $version) {
            if ($version->file_url && Storage::disk('public')->exists($version->file_url)) {
                Storage::disk('public')->delete($version->file_url);
            }
        }

        $dokumen->delete();

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json(['message' => 'Dokumen berhasil dihapus!']);
        }

        return redirect()->route('dokumen.index')->with('success', 'Dokumen berhasil dihapus!');
    }

    /**
     * Submit document for approval.
     */
    public function submit(Dokumen $dokumen)
    {
        if ($dokumen->status !== 'draft') {
            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json(['message' => 'Hanya dokumen draft yang dapat diajukan.'], 422);
            }
            return back()->withErrors(['error' => 'Hanya dokumen draft yang dapat diajukan.']);
        }

        DB::beginTransaction();
        try {
            $dokumen->approvals()->delete();

            $dokumen->update([
                'status' => 'submitted',
                'status_current' => 'waiting_approval_1',
            ]);

            $this->createApprovalWorkflow($dokumen);

            DB::commit();

            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json([
                    'message' => 'Dokumen berhasil diajukan untuk approval!',
                    'dokumen' => $dokumen->fresh(['versions', 'approvals', 'user', 'company', 'aplikasi', 'aplikasiManagement']),
                ]);
            }

            return redirect()->route('dokumen.show', $dokumen->id)->with('success', 'Dokumen berhasil diajukan untuk approval!');
        } catch (\Exception $e) {
            DB::rollback();
            Log::error('Error submitting dokumen: ' . $e->getMessage());

            if (request()->expectsJson() || request()->wantsJson()) {
                return response()->json(['message' => 'Gagal mengajukan dokumen: ' . $e->getMessage()], 500);
            }

            return back()->withErrors(['error' => 'Gagal mengajukan dokumen: ' . $e->getMessage()]);
        }
    }

    /**
     * Create approval workflow for document (Helper Method).
     */
    private function createApprovalWorkflow(Dokumen $dokumen)
    {
        $masterflow = $dokumen->masterflow;
        $latestVersion = $dokumen->latestVersion;

        if (!$masterflow || !$masterflow->steps) {
            return;
        }

        $nominalVal = (float) ($dokumen->nominal ?? 0);
        $createdStepIndex = 0;
        $sortedSteps = $masterflow->steps->sortBy('step_order');

        foreach ($sortedSteps as $step) {
            $jabatanName = strtolower($step->jabatan->name ?? '');

            $user = User::whereHas('userAuths', function ($query) use ($step) {
                $query->where('jabatan_id', $step->jabatan_id);
            })->first();

            if ($user) {
                $createdStepIndex++;

                $isSkippedByThreshold = ($nominalVal > 0 && $nominalVal < 5000000 && str_contains($jabatanName, 'kepala divisi'));

                if ($isSkippedByThreshold) {
                    $initialStatus = 'skipped';
                } else {
                    $initialStatus = ($createdStepIndex === 1) ? 'pending' : 'waiting';
                }

                $approval = DokumenApproval::create([
                    'dokumen_id' => $dokumen->id,
                    'user_id' => $user->id,
                    'dokumen_version_id' => $latestVersion?->id,
                    'masterflow_step_id' => $step->id,
                    'approval_order' => $createdStepIndex,
                    'approval_status' => $initialStatus,
                    'tgl_deadline' => now()->addDays(3),
                    'comment' => null,
                    'tgl_approve' => $isSkippedByThreshold ? now() : null,
                ]);

                if ($initialStatus === 'pending') {
                    try {
                        SendApprovalNotification::dispatch($approval);
                    } catch (\Throwable $ex) {
                        Log::warning('Failed to dispatch SendApprovalNotification: ' . $ex->getMessage());
                    }
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
            $dokumen->update([
                'status' => 'draft',
                'status_current' => 'draft',
            ]);

            $dokumen->approvals()->whereIn('approval_status', ['pending', 'waiting'])->delete();

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
            $folderPath = 'dokumen/' . $dokumen->nomor_dokumen;

            $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
            $cleanJudul = preg_replace('/_+/', '_', $cleanJudul);

            $extension = $file->getClientOriginalExtension();
            $filename = $dokumen->nomor_dokumen . '_' . $cleanJudul . '_v' . str_replace('.', '', $newVersion) . '.' . $extension;

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
                    $revisionApproval->update([
                        'dokumen_version_id' => $dokumenVersion->id,
                        'approval_status'    => 'pending',
                        'tgl_approve'        => null,
                        'comment'            => null,
                        'signature_path'     => null,
                        'revision_notes'     => null,
                        'revision_requested_by'  => null,
                        'revision_requested_at'  => null,
                    ]);
                }

                $allPendingApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)
                    ->where('approval_status', 'pending')
                    ->get();

                foreach ($allPendingApprovals as $pendingApproval) {
                    $pendingApproval->update([
                        'dokumen_version_id' => $dokumenVersion->id,
                    ]);

                    $targetEmail = $pendingApproval->user?->email;
                    if ($targetEmail) {
                        Mail::to($targetEmail)->send(new RevisionUploadedMail($dokumen, $pendingApproval->fresh(), $newVersion));
                    }

                    $targetUserId = $pendingApproval->user_id ?? ($pendingApproval->approver_email
                        ? User::where('email', $pendingApproval->approver_email)->value('id')
                        : null);
                    if ($targetUserId) {
                        broadcast(new BrowserNotificationEvent(
                            userId: (int) $targetUserId,
                            title: 'Revisi Dokumen Telah Diupload',
                            body: "Dokumen '{$dokumen->judul_dokumen}' (v{$newVersion}) telah direvisi dan membutuhkan persetujuan Anda.",
                            url: route('approvals.show', $pendingApproval->id),
                            type: 'info'
                        ));
                    }
                }

                $dokumen->update([
                    'status'         => 'under_review',
                    'status_current' => 'waiting_approval_' . ($revisionApproval?->masterflowStep?->step_order ?? 1),
                ]);
            } else {
                $rejectedApproval = DokumenApproval::where('dokumen_id', $dokumen->id)
                    ->where('approval_status', 'rejected')
                    ->with('masterflowStep')
                    ->first();

                if ($rejectedApproval) {
                    $rejectedStepOrder = $rejectedApproval->masterflowStep?->step_order ?? $rejectedApproval->approval_order ?? 1;

                    $allApprovals = DokumenApproval::where('dokumen_id', $dokumen->id)
                        ->with('masterflowStep')
                        ->get();

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

                            $targetEmail = $approval->user?->email;
                            if ($targetEmail) {
                                Mail::to($targetEmail)->send(new RevisionUploadedMail($dokumen, $approval->fresh(), $newVersion));
                            }

                            $targetUserId = $approval->user_id ?? ($approval->approver_email ? User::where('email', $approval->approver_email)->value('id') : null);
                            if ($targetUserId) {
                                broadcast(new BrowserNotificationEvent(
                                    userId: (int) $targetUserId,
                                    title: 'Dokumen Telah Direvisi',
                                    body: "Dokumen '{$dokumen->judul_dokumen}' telah direvisi dan membutuhkan persetujuan Anda.",
                                    url: route('approvals.show', $approval->id),
                                    type: 'info'
                                ));
                            }
                        } else {
                            $approval->update([
                                'dokumen_version_id' => $dokumenVersion->id,
                            ]);
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

                        $targetEmail = $approval->user?->email;
                        if ($targetEmail) {
                            Mail::to($targetEmail)->send(new RevisionUploadedMail($dokumen, $approval->fresh(), $newVersion));
                        }

                        $targetUserId = $approval->user_id ?? ($approval->approver_email ? User::where('email', $approval->approver_email)->value('id') : null);
                        if ($targetUserId) {
                            broadcast(new BrowserNotificationEvent(
                                userId: (int) $targetUserId,
                                title: 'Dokumen Telah Direvisi',
                                body: "Dokumen '{$dokumen->judul_dokumen}' telah direvisi dan membutuhkan persetujuan Anda.",
                                url: route('approvals.show', $approval->id),
                                type: 'info'
                            ));
                        }
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
                        'company',
                        'aplikasi',
                        'aplikasiManagement',
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
            Log::error('Failed to upload revision', [
                'error' => $e->getMessage(),
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
     * Download document file with Dual QR & Custom Position support.
     */
    public function download(Dokumen $dokumen, $version = null, ?PdfSignatureService $pdfSignatureService = null)
    {
        $pdfSignatureService = $pdfSignatureService ?? app(PdfSignatureService::class);
        $versionObj = $version
            ? $dokumen->versions()->findOrFail($version)
            : $dokumen->latestVersion;

        if (!$versionObj || !$versionObj->file_url || !Storage::disk('public')->exists($versionObj->file_url)) {
            return back()->withErrors(['error' => 'File dokumen tidak ditemukan.']);
        }

        $user = Auth::user();
        if ($user) {
            $isOwner = (int)$dokumen->user_id === (int)$user->id;
            $isSuperAdmin = $this->contextService->isSuperAdmin();
            $isAdmin = $this->contextService->isAdmin();
            $isAssignedApprover = DokumenApproval::where('dokumen_id', $dokumen->id)
                ->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                      ->orWhere('approver_email', $user->email);
                })
                ->exists();

            if (!$isSuperAdmin && !$isAdmin && !$isOwner && !$isAssignedApprover) {
                abort(403, 'Dokumen ini hanya dapat diakses oleh pihak yang terlibat.');
            }
        }

        if (request()->has('original') && request('original') == '1') {
            $filePath = Storage::disk('public')->path($versionObj->file_url);
            return response()->download($filePath, 'ASLI_' . $versionObj->nama_file);
        }

        $approvedSignatures = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->where('approval_status', 'approved')
            ->with(['user.defaultSignature', 'user.signatures', 'masterflowStep'])
            ->orderBy('created_at')
            ->get();

        if (($approvedSignatures->count() > 0 || $dokumen->qr_code_path) && strtolower($versionObj->tipe_file) === 'pdf') {
            try {
                $pdfContent = $pdfSignatureService->generateSignedPdfStream(
                    $versionObj->file_url,
                    $approvedSignatures,
                    $dokumen->qr_code_path,
                    [
                        'x' => $dokumen->signature_position_x ?? 70.0,
                        'y' => $dokumen->signature_position_y ?? 80.0,
                        'page' => $dokumen->signature_page ?? 'last',
                    ]
                );

                $signedFilename = pathinfo($versionObj->nama_file, PATHINFO_FILENAME) . '_signed.pdf';

                return response($pdfContent)
                    ->header('Content-Type', 'application/pdf')
                    ->header('Content-Disposition', 'attachment; filename="' . $signedFilename . '"')
                    ->header('Content-Length', strlen($pdfContent));
            } catch (\Exception $e) {
                Log::error('Failed to generate signed PDF for download', [
                    'error' => $e->getMessage(),
                    'dokumen_id' => $dokumen->id,
                ]);
            }
        }

        $filePath = Storage::disk('public')->path($versionObj->file_url);
        return response()->download($filePath, $versionObj->nama_file);
    }

    /**
     * Stream signed PDF with all approved signatures, Dual QR codes, and custom coordinates.
     */
    public function streamSignedPdf(Dokumen $dokumen, $version = null, ?PdfSignatureService $pdfSignatureService = null)
    {
        $pdfSignatureService = $pdfSignatureService ?? app(PdfSignatureService::class);
        $versionObj = $version
            ? $dokumen->versions()->findOrFail($version)
            : $dokumen->latestVersion;

        if (!$versionObj || !$versionObj->file_url || !Storage::disk('public')->exists($versionObj->file_url)) {
            abort(404, 'File tidak ditemukan.');
        }

        $user = Auth::user();
        if ($user) {
            $isOwner = (int)$dokumen->user_id === (int)$user->id;
            $isSuperAdmin = $this->contextService->isSuperAdmin();
            $isAdmin = $this->contextService->isAdmin();
            $isAssignedApprover = DokumenApproval::where('dokumen_id', $dokumen->id)
                ->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                      ->orWhere('approver_email', $user->email);
                })
                ->exists();

            if (!$isSuperAdmin && !$isAdmin && !$isOwner && !$isAssignedApprover) {
                abort(403, 'Dokumen ini hanya dapat diakses oleh pihak yang terlibat.');
            }
        }

        if (request()->has('original') && request('original') == '1') {
            $filePath = Storage::disk('public')->path($versionObj->file_url);
            return response()->file($filePath, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        $approvedSignatures = DokumenApproval::where('dokumen_id', $dokumen->id)
            ->where('approval_status', 'approved')
            ->with(['user.defaultSignature', 'user.signatures', 'masterflowStep'])
            ->orderBy('created_at')
            ->get();

        if ($approvedSignatures->count() === 0 && !$dokumen->qr_code_path && strtolower($versionObj->tipe_file) !== 'pdf') {
            $filePath = Storage::disk('public')->path($versionObj->file_url);
            return response()->file($filePath, [
                'Content-Type' => 'application/pdf',
            ]);
        }

        try {
            $pdfContent = $pdfSignatureService->generateSignedPdfStream(
                $versionObj->file_url,
                $approvedSignatures,
                $dokumen->qr_code_path,
                [
                    'x' => $dokumen->signature_position_x ?? 70.0,
                    'y' => $dokumen->signature_position_y ?? 80.0,
                    'page' => $dokumen->signature_page ?? 'last',
                ]
            );

            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'inline; filename="signed_' . $versionObj->nama_file . '"')
                ->header('Content-Length', strlen($pdfContent));
        } catch (\Exception $e) {
            Log::error('Failed to generate signed PDF stream', [
                'error' => $e->getMessage(),
                'dokumen_id' => $dokumen->id,
            ]);

            $filePath = Storage::disk('public')->path($versionObj->file_url);
            return response()->file($filePath, [
                'Content-Type'        => 'application/pdf',
                'Content-Disposition' => 'inline; filename="' . $versionObj->nama_file . '"',
            ]);
        }
    }
}