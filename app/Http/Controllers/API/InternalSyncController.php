<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\UsersAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class InternalSyncController extends Controller
{
    /**
     * Cek apakah user tertentu (berdasarkan email atau username) sudah terdaftar di AMS.
     * Dipanggil oleh microservice-lookup untuk memutuskan apakah perlu membuat draft dokumen atau sync user.
     */
    public function checkUser(Request $request): JsonResponse
    {
        $email = $request->query('email', $request->input('email'));
        $username = $request->query('username', $request->input('username'));

        if (!$email && !$username) {
            return response()->json([
                'success' => false,
                'message' => 'Parameter email atau username harus disertakan.',
            ], 422);
        }

        $query = User::with(['profile', 'userAuths.role', 'userAuths.company', 'userAuths.aplikasi']);

        if ($email) {
            $query->where('email', $email);
        } else {
            $query->where('name', $username);
        }

        $user = $query->first();

        if ($user) {
            $hasAuth = $user->userAuths && $user->userAuths->isNotEmpty();
            $auth = $user->userAuths->first();
            return response()->json([
                'success' => true,
                'exists' => $hasAuth,
                'registered_in_ams' => true,
                'has_authorization' => $hasAuth,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'has_authorization' => $hasAuth,
                    'role' => $auth?->role?->role_name ?? null,
                    'company_id' => $auth?->company_id ?? null,
                    'aplikasi_id' => $auth?->aplikasi_id ?? null,
                ],
            ]);
        }

        return response()->json([
            'success' => true,
            'exists' => false,
            'user' => null,
        ]);
    }

    /**
     * Daftarkan user baru dari EIS ke User Management AMS.
     * Menggunakan password hash yang sama dari database EIS tanpa re-hashing ulang.
     */
    public function provisionUser(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'password_hash' => 'required|string',
            'username' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi data user gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = $request->input('email');
        $name = $request->input('name') ?: $request->input('username');
        $passwordHash = $request->input('password_hash');

        // Jika user sudah ada, kembalikan user yang ada
        $existing = User::where('email', $email)->first();
        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'User sudah ada di AMS (menunggu konfirmasi otorisasi dari Superadmin).',
                'already_exists' => true,
                'user' => $existing->load(['profile', 'userAuths']),
            ]);
        }

        DB::beginTransaction();
        try {
            // Gunakan insertGetId langsung agar Bcrypt hash dari EIS tidak di-hash ulang oleh Eloquent cast
            $userId = DB::table('users')->insertGetId([
                'name' => $name,
                'email' => $email,
                'password' => $passwordHash,
                'pin' => '12345678',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Buat Profile
            UserProfile::create([
                'user_id' => $userId,
                'address' => 'Pengguna External Inventory System (EIS)',
                'phone_number' => '-',
            ]);

            // Catatan: Otorisasi (UsersAuth) sengaja dikosongkan agar akun menunggu konfirmasi dari Superadmin
            // last_context_id juga tetap null sampai Superadmin mengisi otorisasi

            DB::commit();

            $freshUser = User::with(['profile', 'userAuths.role', 'userAuths.company'])->find($userId);

            Log::info("User EIS '{$email}' berhasil disinkronisasi ke AMS User Management dengan otorisasi kosong (ID: {$userId})");

            return response()->json([
                'success' => true,
                'message' => 'User berhasil didaftarkan ke User Management Superadmin AMS dengan otorisasi kosong (menunggu konfirmasi Superadmin).',
                'already_exists' => false,
                'user' => $freshUser,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Gagal sinkronisasi user EIS ke AMS: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal mendaftarkan user ke AMS: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Buat dokumen baru dengan status 'draft' beserta file PDF yang di-generate oleh microservice-lookup.
     */
    public function createDraftDocument(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nomor_dokumen' => 'required|string|max:100',
            'judul_dokumen' => 'required|string|max:255',
            'nominal' => 'nullable|numeric',
            'email' => 'nullable|email',
            'user_id' => 'nullable|integer',
            'pdf_base64' => 'nullable|string',
            'file_name' => 'nullable|string',
            'tgl_pengajuan' => 'nullable|date',
            'deskripsi' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi data dokumen draft gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $nomorDokumen = trim($request->input('nomor_dokumen'));

        // Cari user pembuat dokumen
        $user = null;
        if ($request->filled('email')) {
            $user = User::with(['lastContext', 'userAuths'])->where('email', $request->input('email'))->first();
        }
        if (!$user && $request->filled('user_id')) {
            $user = User::with(['lastContext', 'userAuths'])->find($request->input('user_id'));
        }
        if (!$user) {
            // Fallback ke user pertama (Superadmin atau existing user)
            $user = User::with(['lastContext', 'userAuths'])->first();
        }

        // Prioritaskan context aktif user (lastContext), lalu first auth record, atau default 1
        $activeAuth = $user?->lastContext ?: $user?->userAuths?->first();
        $companyId = $activeAuth?->company_id ?? 1;
        $aplikasiId = $activeAuth?->aplikasi_id ?? 1;
        $tipeDokumen = $request->input('tipe_dokumen') ?: (str_starts_with(strtoupper($nomorDokumen), 'PR') ? 'purchase_request' : 'purchase_order');

        DB::beginTransaction();
        try {
            // Cek apakah dokumen sudah ada sebelumnya
            $dokumen = Dokumen::where('nomor_dokumen', $nomorDokumen)->first();

            if (!$dokumen) {
                $dokumen = Dokumen::create([
                    'nomor_dokumen' => $nomorDokumen,
                    'judul_dokumen' => $request->input('judul_dokumen'),
                    'nominal' => (float) ($request->input('nominal', 0)),
                    'user_id' => $user->id,
                    'company_id' => $companyId,
                    'aplikasi_id' => $aplikasiId,
                    'tipe_dokumen' => $tipeDokumen,
                    'status' => 'draft',
                    'status_current' => 'draft',
                    'tgl_pengajuan' => $request->input('tgl_pengajuan', now()->toDateString()),
                    'deskripsi' => $request->input('deskripsi', "Dokumen {$nomorDokumen} dari External Inventory System"),
                ]);
            } else {
                // Update dokumen existing agar tetap berstatus draft
                $dokumen->update([
                    'judul_dokumen' => $request->input('judul_dokumen', $dokumen->judul_dokumen),
                    'nominal' => (float) ($request->input('nominal', $dokumen->nominal)),
                    'tipe_dokumen' => $tipeDokumen,
                    'company_id' => $companyId,
                    'aplikasi_id' => $aplikasiId,
                    'status' => 'draft',
                    'status_current' => 'draft',
                    'deskripsi' => $request->input('deskripsi', $dokumen->deskripsi),
                ]);
            }

            // Simpan file PDF jika disertakan
            $version = null;
            if ($request->filled('pdf_base64')) {
                $pdfBinary = base64_decode($request->input('pdf_base64'));
                $fileName = $request->input('file_name', "{$nomorDokumen}.pdf");
                $cleanJudul = preg_replace('/[^A-Za-z0-9\-_]/', '_', $dokumen->judul_dokumen);
                $storedFileName = "{$nomorDokumen}_{$cleanJudul}_v1.pdf";
                $filePath = "dokumen/{$nomorDokumen}/{$storedFileName}";

                // Simpan ke storage local
                Storage::disk('local')->put($filePath, $pdfBinary);

                $version = DokumenVersion::updateOrCreate(
                    [
                        'dokumen_id' => $dokumen->id,
                        'version' => '1.0',
                    ],
                    [
                        'nama_file' => $fileName,
                        'tgl_upload' => now(),
                        'tipe_file' => 'pdf',
                        'file_url' => $filePath,
                        'size_file' => strlen($pdfBinary),
                        'status' => 'active',
                    ]
                );
            }

            DB::commit();

            Log::info("Dokumen draft PO '{$nomorDokumen}' berhasil disinkronisasi ke AMS (ID: {$dokumen->id})");

            return response()->json([
                'success' => true,
                'message' => 'Dokumen PO berhasil dibuat di AMS dengan status draft.',
                'data' => [
                    'dokumen_id' => $dokumen->id,
                    'nomor_dokumen' => $dokumen->nomor_dokumen,
                    'judul_dokumen' => $dokumen->judul_dokumen,
                    'nominal' => $dokumen->nominal,
                    'status' => $dokumen->status,
                    'status_current' => $dokumen->status_current,
                    'user_id' => $dokumen->user_id,
                    'version_id' => $version?->id,
                    'has_pdf' => $version !== null,
                ],
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            Log::error("Gagal membuat dokumen draft PO di AMS: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat dokumen draft di AMS: ' . $e->getMessage(),
            ], 500);
        }
    }
}
