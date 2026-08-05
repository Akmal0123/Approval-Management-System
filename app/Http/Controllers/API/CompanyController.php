<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class CompanyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $companies = Company::orderBy('created_at', 'asc')->get();

        return response()->json([
            'companies' => $companies,
            'message' => 'Companies retrieved successfully'
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:companies,name',
                'address' => 'nullable|string',
                'phone_number' => 'nullable|string|max:20',
            ]);

            $company = Company::create($validated);

            return response()->json([
                'company' => $company,
                'message' => 'Company created successfully'
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
            $company = Company::findOrFail($id);

            return response()->json([
                'company' => $company,
                'message' => 'Company retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Company not found'
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        try {
            $company = Company::findOrFail($id);

            $validated = $request->validate([
                'name' => 'required|string|max:255|unique:companies,name,' . $id,
                'address' => 'nullable|string',
                'phone_number' => 'nullable|string|max:20',
            ]);

            $company->update($validated);

            return response()->json([
                'company' => $company,
                'message' => 'Company updated successfully'
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Company not found or something went wrong'
            ], 404);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $company = Company::findOrFail($id);
            $companyName = $company->name;

            $company->delete();

            return response()->json([
                'message' => "Company '{$companyName}' deleted successfully"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Company not found or cannot be deleted'
            ], 404);
        }
    }
}
