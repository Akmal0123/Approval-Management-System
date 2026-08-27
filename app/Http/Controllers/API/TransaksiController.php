<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Transaksi;
use App\Models\Aplikasi;
use App\Services\ContextService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class TransaksiController extends Controller
{
    protected ContextService $contextService;

    public function __construct(ContextService $contextService)
    {
        $this->contextService = $contextService;
    }

    /**
     * Display a listing of transaksis.
     */
    public function index(Request $request)
    {
        $query = Transaksi::with(['aplikasi.company'])->orderBy('created_at', 'desc');

        if (!$this->contextService->isSuperAdmin()) {
            $companyId = $this->contextService->getCurrentCompanyId();
            $aplikasiId = $this->contextService->getCurrentAplikasiId();

            if ($aplikasiId) {
                $query->where('aplikasi_id', $aplikasiId);
            } elseif ($companyId) {
                $query->whereHas('aplikasi', function ($q) use ($companyId) {
                    $q->where('company_id', $companyId);
                });
            }
        }

        if ($request->filled('aplikasi_id')) {
            $query->where('aplikasi_id', $request->aplikasi_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nama_transaksi', 'like', "%{$search}%")
                    ->orWhere('kode_transaksi', 'like', "%{$search}%")
                    ->orWhere('departemen', 'like', "%{$search}%");
            });
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $transaksis = $query->get();

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'data' => $transaksis,
            ]);
        }

        $aplikasis = $this->contextService->isSuperAdmin()
            ? Aplikasi::with('company')->get()
            : Aplikasi::where('company_id', $this->contextService->getCurrentCompanyId())->get();

        return Inertia::render('super-admin/transaksi-management', [
            'transaksis' => $transaksis,
            'aplikasis' => $aplikasis,
        ]);
    }

    /**
     * Store a newly created transaksi.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'aplikasi_id' => 'required|exists:aplikasis,id',
            'kode_transaksi' => 'required|string|max:50|unique:transaksis,kode_transaksi',
            'nama_transaksi' => 'required|string|max:255',
            'departemen' => 'nullable|string|max:255',
            'deskripsi' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }
            return back()->withErrors($validator)->withInput();
        }

        $transaksi = Transaksi::create([
            'aplikasi_id' => $request->aplikasi_id,
            'kode_transaksi' => strtoupper($request->kode_transaksi),
            'nama_transaksi' => $request->nama_transaksi,
            'departemen' => $request->departemen,
            'deskripsi' => $request->deskripsi,
            'is_active' => $request->is_active ?? true,
        ]);

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil ditambahkan.',
                'data' => $transaksi->load('aplikasi'),
            ], 201);
        }

        return redirect()->back()->with('success', 'Transaksi berhasil ditambahkan.');
    }

    /**
     * Display the specified transaksi.
     */
    public function show(Transaksi $transaksi)
    {
        return response()->json([
            'success' => true,
            'data' => $transaksi->load(['aplikasi.company', 'masterflows.steps.jabatan']),
        ]);
    }

    /**
     * Update the specified transaksi.
     */
    public function update(Request $request, Transaksi $transaksi)
    {
        $validator = Validator::make($request->all(), [
            'aplikasi_id' => 'required|exists:aplikasis,id',
            'kode_transaksi' => 'required|string|max:50|unique:transaksis,kode_transaksi,' . $transaksi->id,
            'nama_transaksi' => 'required|string|max:255',
            'departemen' => 'nullable|string|max:255',
            'deskripsi' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            if ($request->expectsJson() || $request->wantsJson()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }
            return back()->withErrors($validator)->withInput();
        }

        $transaksi->update([
            'aplikasi_id' => $request->aplikasi_id,
            'kode_transaksi' => strtoupper($request->kode_transaksi),
            'nama_transaksi' => $request->nama_transaksi,
            'departemen' => $request->departemen,
            'deskripsi' => $request->deskripsi,
            'is_active' => $request->is_active ?? $transaksi->is_active,
        ]);

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil diperbarui.',
                'data' => $transaksi->load('aplikasi'),
            ]);
        }

        return redirect()->back()->with('success', 'Transaksi berhasil diperbarui.');
    }

    /**
     * Remove the specified transaksi.
     */
    public function destroy(Transaksi $transaksi)
    {
        $transaksi->delete();

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Transaksi berhasil dihapus.',
            ]);
        }

        return redirect()->back()->with('success', 'Transaksi berhasil dihapus.');
    }

    /**
     * Toggle active status.
     */
    public function toggleStatus(Transaksi $transaksi)
    {
        $transaksi->update([
            'is_active' => !$transaksi->is_active,
        ]);

        $status = $transaksi->is_active ? 'diaktifkan' : 'dinonaktifkan';

        if (request()->expectsJson() || request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Transaksi berhasil {$status}.",
                'data' => $transaksi,
            ]);
        }

        return redirect()->back()->with('success', "Transaksi berhasil {$status}.");
    }
}
