<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Aplikasi;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class AplikasiController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = \Illuminate\Support\Facades\Auth::user();

        // Trik Cerdas: Deteksi apakah API ini dipanggil dari URL halaman Super Admin
        $isSuperAdminPanel = str_contains(request()->headers->get('referer'), '/super-admin');

        // Jika dipanggil dari panel Super Admin, ATAU rolenya memang cocok, tampilkan SEMUA
        if ($isSuperAdminPanel || $user->role === 'super-admin' || $user->role === 'Super Administrator') {
            $aplikasi = \App\Models\Aplikasi::with('company')->get();
        } else {
            // Jika dipanggil oleh user biasa (misal di form Buat Dokumen), aktifkan filter
            $allowedAplikasiIds = \App\Models\UsersAuth::where('user_id', $user->id)
                ->pluck('aplikasi_id');

            $aplikasi = \App\Models\Aplikasi::with('company')
                ->whereIn('id', $allowedAplikasiIds)
                ->get();
        }

        // AMBIL DATA SELURUH PERUSAHAAN UNTUK DROPDOWN DI MODAL TAMBAH/EDIT
        $companies = \App\Models\Company::select('id', 'name')->orderBy('name')->get();

        return response()->json([
            'status' => 'success',
            'aplikasis' => $aplikasi,
            'companies' => $companies // <-- TAMBAHKAN BARIS INI
        ]);
    }
    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'company_id' => 'required|exists:companies,id',
            ]);

            $aplikasi = Aplikasi::create($validated);
            $aplikasi->load('company');

            return response()->json([
                'aplikasi' => $aplikasi,
                'message' => 'Aplikasi created successfully'
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Something went wrong. Please try again.'
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        try {
            $aplikasi = Aplikasi::with('company')->findOrFail($id);

            return response()->json([
                'aplikasi' => $aplikasi,
                'message' => 'Aplikasi retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Aplikasi not found'
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $aplikasi = Aplikasi::findOrFail($id);

            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'company_id' => 'required|exists:companies,id',
            ]);

            $aplikasi->update($validated);
            $aplikasi->load('company');

            return response()->json([
                'aplikasi' => $aplikasi,
                'message' => 'Aplikasi updated successfully'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Aplikasi not found or something went wrong'
            ], 404);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $aplikasi = Aplikasi::findOrFail($id);
            $aplikasiName = $aplikasi->name;

            $aplikasi->delete();

            return response()->json([
                'message' => "Aplikasi '{$aplikasiName}' deleted successfully"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Aplikasi not found or cannot be deleted'
            ], 404);
        }
    }

    public function getByCompany($companyId)
{
    $aplikasis = Aplikasi::where('company_id', $companyId)->get();

    return response()->json([
        'aplikasis' => $aplikasis
    ]);
}
}
