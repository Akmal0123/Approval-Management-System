<?php

namespace App\Http\Controllers;

use App\Models\Aplikasi;
use App\Models\Company;
use Illuminate\Http\Request;

class AplikasiController extends Controller
{
    /**
     * Tampilkan semua daftar aplikasi (API response)
     */
    public function index()
    {
        return response()->json([
            'success'   => true,
            'data'      => Aplikasi::with('company')->latest()->get(),
            'companies' => Company::all(),
        ]);
    }

    /**
     * Simpan data aplikasi baru
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'transaksi_management' => 'required|string',
            'name'                 => 'nullable|string',
            'nama_aplikasi'        => 'nullable|string',
            'company_id'           => 'nullable|exists:companies,id',
            'perusahaan_id'        => 'nullable|exists:companies,id',
        ]);

        $appName = $validated['nama_aplikasi'] ?? $validated['name'];
        $companyId = $validated['company_id'] ?? $validated['perusahaan_id'];

        $aplikasi = Aplikasi::create([
            'transaksi_management' => $validated['transaksi_management'],
            'nama_aplikasi'        => $appName,
            'name'                 => $appName,
            'company_id'           => $companyId,
            'perusahaan_id'        => $companyId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Master aplikasi berhasil dibuat!',
            'data'    => $aplikasi->load('company'),
        ], 201);
    }

    /**
     * Perbarui data aplikasi
     */
    public function update(Request $request, $id)
    {
        $aplikasi = Aplikasi::findOrFail($id);

        $validated = $request->validate([
            'transaksi_management' => 'required|string',
            'name'                 => 'nullable|string',
            'nama_aplikasi'        => 'nullable|string',
            'company_id'           => 'nullable|exists:companies,id',
            'perusahaan_id'        => 'nullable|exists:companies,id',
        ]);

        $appName = $validated['nama_aplikasi'] ?? $validated['name'];
        $companyId = $validated['company_id'] ?? $validated['perusahaan_id'];

        $aplikasi->update([
            'transaksi_management' => $validated['transaksi_management'],
            'nama_aplikasi'        => $appName,
            'name'                 => $appName,
            'company_id'           => $companyId,
            'perusahaan_id'        => $companyId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Master aplikasi berhasil diperbarui!',
            'data'    => $aplikasi->load('company'),
        ]);
    }

    /**
     * Hapus aplikasi dari database
     */
    public function destroy($id)
    {
        $aplikasi = Aplikasi::findOrFail($id);
        $aplikasi->delete();

        return response()->json([
            'success' => true,
            'message' => 'Master aplikasi berhasil dihapus!',
        ]);
    }
}