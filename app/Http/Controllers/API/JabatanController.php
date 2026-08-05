<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Jabatan;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class JabatanController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $jabatans = Jabatan::orderBy('created_at', 'asc')->get();

        return response()->json([
            'jabatans' => $jabatans,
            'message' => 'Jabatans retrieved successfully'
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:jabatans,name',
            ]);

            $jabatan = Jabatan::create($validated);

            return response()->json([
                'jabatan' => $jabatan,
                'message' => 'Jabatan created successfully'
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
            $jabatan = Jabatan::findOrFail($id);

            return response()->json([
                'jabatan' => $jabatan,
                'message' => 'Jabatan retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Jabatan not found'
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $jabatan = Jabatan::findOrFail($id);

            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:jabatans,name,' . $id,
            ]);

            $jabatan->update($validated);

            return response()->json([
                'jabatan' => $jabatan,
                'message' => 'Jabatan updated successfully'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Jabatan not found or something went wrong'
            ], 404);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $jabatan = Jabatan::findOrFail($id);
            $jabatanName = $jabatan->name;

            $jabatan->delete();

            return response()->json([
                'message' => "Jabatan '{$jabatanName}' deleted successfully"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Jabatan not found or cannot be deleted'
            ], 404);
        }
    }
}
