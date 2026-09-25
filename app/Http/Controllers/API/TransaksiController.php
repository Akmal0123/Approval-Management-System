<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Aplikasi;
use App\Models\Transaksi;
use App\Models\UsersAuth;
use App\Services\ContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class TransaksiController extends Controller
{
    /**
     * Get authorized aplikasi IDs for the authenticated user based on current context.
     * Returns null if user is Super Admin (unrestricted access).
     */
    private function getAuthorizedAplikasiIds($user, ?Request $request = null): ?\Illuminate\Support\Collection
    {
        if (!$user) {
            return collect();
        }

        $contextService = app(ContextService::class);
        if ($contextService->isSuperAdmin()) {
            return null; // Super admin has access to all
        }

        // 1. Cek context aktif dari ContextService
        $context = $contextService->getContext();

        // Jika request membawa context_id atau header X-Context-Id, validasi context tersebut
        $contextId = $request?->input('context_id') ?? $request?->header('X-Context-Id');
        if ($contextId) {
            $requestedContext = UsersAuth::where('id', $contextId)
                ->where('user_id', $user->id)
                ->with(['company', 'aplikasi'])
                ->first();
            if ($requestedContext) {
                $context = $requestedContext;
            }
        }

        // 2. Jika context aktif memiliki aplikasi_id tertentu, batasi HANYA ke aplikasi context ini
        if ($context && !empty($context->aplikasi_id)) {
            return collect([$context->aplikasi_id]);
        }

        // 3. Jika context aktif hanya memiliki company_id, ambil semua aplikasi di company tersebut yang diotoritaskan ke user
        if ($context && !empty($context->company_id)) {
            $companyAplikasiIds = UsersAuth::where('user_id', $user->id)
                ->where('company_id', $context->company_id)
                ->whereNotNull('aplikasi_id')
                ->pluck('aplikasi_id')
                ->unique()
                ->values();

            if ($companyAplikasiIds->isNotEmpty()) {
                return $companyAplikasiIds;
            }
        }

        // 4. Fallback: seluruh aplikasi yang diotoritaskan ke user
        return UsersAuth::where('user_id', $user->id)
            ->whereNotNull('aplikasi_id')
            ->pluck('aplikasi_id')
            ->unique()
            ->values();
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transaksi::with(['aplikasi.company'])->orderBy('created_at', 'desc');

        $user = $request->user() ?? Auth::user();
        $allowedAplikasiIds = $this->getAuthorizedAplikasiIds($user, $request);

        if ($allowedAplikasiIds !== null) {
            $query->whereIn('aplikasi_id', $allowedAplikasiIds);
        }

        if ($request->filled('aplikasi_id') && $request->aplikasi_id !== 'all') {
            if ($allowedAplikasiIds !== null && !$allowedAplikasiIds->contains($request->aplikasi_id)) {
                return response()->json([
                    'data' => [],
                    'transaksis' => [],
                    'message' => 'Transaksis retrieved successfully'
                ]);
            }
            $query->where('aplikasi_id', $request->aplikasi_id);
        }

        if ($request->has('is_active')) {
            $isActive = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($isActive !== null) {
                $query->where('is_active', $isActive);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_transaksi', 'like', "%{$search}%")
                  ->orWhere('kode_transaksi', 'like', "%{$search}%")
                  ->orWhere('departemen', 'like', "%{$search}%")
                  ->orWhere('lookup_path_api', 'like', "%{$search}%")
                  ->orWhere('get_pdf_path_api', 'like', "%{$search}%")
                  ->orWhere('path_dokumen', 'like', "%{$search}%");
            });
        }

        $transaksis = $query->get();

        return response()->json([
            'data' => $transaksis,
            'transaksis' => $transaksis,
            'message' => 'Transaksis retrieved successfully'
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $user = $request->user() ?? Auth::user();
            $allowedAplikasiIds = $this->getAuthorizedAplikasiIds($user, $request);

            $validated = $request->validate([
                'aplikasi_id' => 'required|exists:aplikasis,id',
                'kode_transaksi' => 'required|string|max:50',
                'nama_transaksi' => 'required|string|max:255',
                'departemen' => 'nullable|string|max:255',
                'deskripsi' => 'nullable|string',
                'is_active' => 'nullable|boolean',
                'lookup_path_api' => 'nullable|string|max:255',
                'get_pdf_path_api' => 'nullable|string|max:255',
                'path_dokumen' => 'nullable|string|max:255',
            ]);

            if ($allowedAplikasiIds !== null && !$allowedAplikasiIds->contains($validated['aplikasi_id'])) {
                return response()->json([
                    'message' => 'Anda tidak memiliki otoritas untuk menambahkan transaksi pada aplikasi context ini.'
                ], 403);
            }

            $validated['is_active'] = $request->boolean('is_active', true);
            $validated['lookup_path_api'] = $request->input('lookup_path_api') ?: null;
            $validated['get_pdf_path_api'] = $request->input('get_pdf_path_api') ?: null;
            $validated['path_dokumen'] = $request->input('path_dokumen') ?: null;

            $transaksi = Transaksi::create($validated);
            $transaksi->load('aplikasi.company');

            return response()->json([
                'data' => $transaksi,
                'transaksi' => $transaksi,
                'message' => 'Transaksi berhasil ditambahkan'
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Terjadi kesalahan saat menyimpan transaksi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $transaksi = Transaksi::with('aplikasi.company')->findOrFail($id);

            $user = request()->user() ?? Auth::user();
            $allowedAplikasiIds = $this->getAuthorizedAplikasiIds($user, request());

            if ($allowedAplikasiIds !== null && !$allowedAplikasiIds->contains($transaksi->aplikasi_id)) {
                return response()->json([
                    'message' => 'Anda tidak memiliki otoritas untuk melihat transaksi ini.'
                ], 403);
            }

            return response()->json([
                'data' => $transaksi,
                'transaksi' => $transaksi,
                'message' => 'Transaksi retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Transaksi tidak ditemukan'
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $transaksi = Transaksi::findOrFail($id);

            $user = $request->user() ?? Auth::user();
            $allowedAplikasiIds = $this->getAuthorizedAplikasiIds($user, $request);

            if ($allowedAplikasiIds !== null && !$allowedAplikasiIds->contains($transaksi->aplikasi_id)) {
                return response()->json([
                    'message' => 'Anda tidak memiliki otoritas untuk mengubah transaksi ini.'
                ], 403);
            }

            $validated = $request->validate([
                'aplikasi_id' => 'required|exists:aplikasis,id',
                'kode_transaksi' => 'required|string|max:50',
                'nama_transaksi' => 'required|string|max:255',
                'departemen' => 'nullable|string|max:255',
                'deskripsi' => 'nullable|string',
                'is_active' => 'nullable|boolean',
                'lookup_path_api' => 'nullable|string|max:255',
                'get_pdf_path_api' => 'nullable|string|max:255',
                'path_dokumen' => 'nullable|string|max:255',
            ]);

            if ($allowedAplikasiIds !== null && !$allowedAplikasiIds->contains($validated['aplikasi_id'])) {
                return response()->json([
                    'message' => 'Anda tidak memiliki otoritas untuk memindahkan transaksi ke aplikasi di luar context ini.'
                ], 403);
            }

            if ($request->has('is_active')) {
                $validated['is_active'] = $request->boolean('is_active');
            }
            if ($request->has('lookup_path_api')) {
                $validated['lookup_path_api'] = $request->input('lookup_path_api') ?: null;
            }
            if ($request->has('get_pdf_path_api')) {
                $validated['get_pdf_path_api'] = $request->input('get_pdf_path_api') ?: null;
            }
            if ($request->has('path_dokumen')) {
                $validated['path_dokumen'] = $request->input('path_dokumen') ?: null;
            }

            $transaksi->update($validated);
            $transaksi->load('aplikasi.company');

            return response()->json([
                'data' => $transaksi,
                'transaksi' => $transaksi,
                'message' => 'Transaksi berhasil diperbarui'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Terjadi kesalahan saat memperbarui transaksi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Toggle active status of the specified resource.
     */
    public function toggleStatus(string $id): JsonResponse
    {
        try {
            $transaksi = Transaksi::findOrFail($id);

            $user = request()->user() ?? Auth::user();
            $allowedAplikasiIds = $this->getAuthorizedAplikasiIds($user, request());

            if ($allowedAplikasiIds !== null && !$allowedAplikasiIds->contains($transaksi->aplikasi_id)) {
                return response()->json([
                    'message' => 'Anda tidak memiliki otoritas untuk mengubah status transaksi ini.'
                ], 403);
            }

            $transaksi->is_active = !$transaksi->is_active;
            $transaksi->save();
            $transaksi->load('aplikasi.company');

            return response()->json([
                'data' => $transaksi,
                'transaksi' => $transaksi,
                'message' => 'Status transaksi berhasil diubah menjadi ' . ($transaksi->is_active ? 'aktif' : 'nonaktif')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal mengubah status transaksi'
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $transaksi = Transaksi::findOrFail($id);

            $user = request()->user() ?? Auth::user();
            $allowedAplikasiIds = $this->getAuthorizedAplikasiIds($user, request());

            if ($allowedAplikasiIds !== null && !$allowedAplikasiIds->contains($transaksi->aplikasi_id)) {
                return response()->json([
                    'message' => 'Anda tidak memiliki otoritas untuk menghapus transaksi ini.'
                ], 403);
            }

            $nama = $transaksi->nama_transaksi;
            $transaksi->delete();

            return response()->json([
                'message' => "Transaksi '{$nama}' berhasil dihapus"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Transaksi tidak dapat dihapus: ' . $e->getMessage()
            ], 500);
        }
    }
}
