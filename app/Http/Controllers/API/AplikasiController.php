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
    public function index(): JsonResponse
    {
        $aplikasis = Aplikasi::with('company')->orderBy('created_at', 'asc')->get();
        $companies = Company::orderBy('name', 'asc')->get();

        return response()->json([
            'aplikasis' => $aplikasis,
            'companies' => $companies,
            'message' => 'Aplikasis retrieved successfully'
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
}
