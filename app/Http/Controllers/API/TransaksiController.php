<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Aplikasi;
use App\Models\Transaksi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class TransaksiController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transaksi::with(['aplikasi.company'])->orderBy('created_at', 'desc');

        if ($request->filled('aplikasi_id') && $request->aplikasi_id !== 'all') {
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
                  ->orWhere('get_pdf_path_api', 'like', "%{$search}%");
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
            $validated = $request->validate([
                'aplikasi_id' => 'required|exists:aplikasis,id',
                'kode_transaksi' => 'required|string|max:50',
                'nama_transaksi' => 'required|string|max:255',
                'departemen' => 'nullable|string|max:255',
                'deskripsi' => 'nullable|string',
                'is_active' => 'nullable|boolean',
                'lookup_path_api' => 'nullable|string|max:255',
                'get_pdf_path_api' => 'nullable|string|max:255',
            ]);

            $validated['is_active'] = $request->boolean('is_active', true);
            $validated['lookup_path_api'] = $request->input('lookup_path_api') ?: null;
            $validated['get_pdf_path_api'] = $request->input('get_pdf_path_api') ?: null;

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

            $validated = $request->validate([
                'aplikasi_id' => 'required|exists:aplikasis,id',
                'kode_transaksi' => 'required|string|max:50',
                'nama_transaksi' => 'required|string|max:255',
                'departemen' => 'nullable|string|max:255',
                'deskripsi' => 'nullable|string',
                'is_active' => 'nullable|boolean',
                'lookup_path_api' => 'nullable|string|max:255',
                'get_pdf_path_api' => 'nullable|string|max:255',
            ]);

            if ($request->has('is_active')) {
                $validated['is_active'] = $request->boolean('is_active');
            }
            if ($request->has('lookup_path_api')) {
                $validated['lookup_path_api'] = $request->input('lookup_path_api') ?: null;
            }
            if ($request->has('get_pdf_path_api')) {
                $validated['get_pdf_path_api'] = $request->input('get_pdf_path_api') ?: null;
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
