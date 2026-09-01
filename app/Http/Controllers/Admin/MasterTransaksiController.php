<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MasterTransaksi;
use App\Models\Aplikasi;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MasterTransaksiController extends Controller
{
    /**
     * Helper untuk mendapatkan company ID user yang sedang login
     */
    private function getCurrentUserCompanyId()
    {
        $user = Auth::user();
        if (!$user || $user->user_auths->isEmpty()) {
            abort(403, 'User tidak memiliki akses ke company manapun.');
        }

        return $user->user_auths->first()->company_id;
    }

    public function index()
    {
        $companyId = $this->getCurrentUserCompanyId();
        $company = Company::find($companyId);

        $transaksis = MasterTransaksi::with(['aplikasi', 'company'])
            ->where('company_id', $companyId)
            ->orderBy('created_at', 'desc')
            ->get();

        $aplikasis = Aplikasi::where('company_id', $companyId)->get();

        $userWithAuth = \App\Models\User::with('userAuths.role', 'userAuths.company')
            ->find(Auth::id());

        return Inertia::render('super-admin/transaksi-management', [
            'transaksis' => $transaksis,
            'aplikasis'  => $aplikasis,
            'company'    => $company,
            'auth'       => [
                'user' => $userWithAuth,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $companyId = $this->getCurrentUserCompanyId();

        $validated = $request->validate([
            'aplikasi_id'    => 'required|exists:aplikasis,id',
            'kode_transaksi' => 'required|string|max:50',
            'nama_transaksi' => 'required|string|max:255',
            'kategori'       => 'required|in:manual,transaksi',
            'deskripsi'      => 'nullable|string',
            'is_active'      => 'boolean',
        ]);

        MasterTransaksi::create([
            'company_id'     => $companyId,
            'aplikasi_id'    => $validated['aplikasi_id'],
            'kode_transaksi' => strtoupper($validated['kode_transaksi']),
            'nama_transaksi' => $validated['nama_transaksi'],
            'kategori'       => $validated['kategori'],
            'deskripsi'      => $validated['deskripsi'] ?? null,
            'is_active'      => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('super-admin.transaksi-management.index')
            ->with('success', 'Master Transaksi berhasil ditambahkan.');
    }

    public function update(Request $request, string $id)
    {
        $companyId = $this->getCurrentUserCompanyId();
        $transaksi = MasterTransaksi::where('company_id', $companyId)->findOrFail($id);

        $validated = $request->validate([
            'aplikasi_id'    => 'required|exists:aplikasis,id',
            'kode_transaksi' => 'required|string|max:50',
            'nama_transaksi' => 'required|string|max:255',
            'kategori'       => 'required|in:manual,transaksi',
            'deskripsi'      => 'nullable|string',
            'is_active'      => 'boolean',
        ]);

        $transaksi->update([
            'aplikasi_id'    => $validated['aplikasi_id'],
            'kode_transaksi' => strtoupper($validated['kode_transaksi']),
            'nama_transaksi' => $validated['nama_transaksi'],
            'kategori'       => $validated['kategori'],
            'deskripsi'      => $validated['deskripsi'] ?? null,
            'is_active'      => $validated['is_active'] ?? true,
        ]);

        return redirect()->route('super-admin.transaksi-management.index')
            ->with('success', 'Master Transaksi berhasil diperbarui.');
    }

    public function destroy(string $id)
    {
        $companyId = $this->getCurrentUserCompanyId();
        $transaksi = MasterTransaksi::where('company_id', $companyId)->findOrFail($id);
        $transaksi->delete();

        return redirect()->route('super-admin.transaksi-management.index')
            ->with('success', 'Master Transaksi berhasil dihapus.');
    }
}