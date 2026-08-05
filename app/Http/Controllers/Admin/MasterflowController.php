<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Masterflow;
use App\Models\MasterflowStep;
use App\Models\Jabatan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class MasterflowController extends Controller
{
    /**
     * Get current user's company ID
     */
    private function getCurrentUserCompanyId()
    {
        $user = Auth::user();
        if (!$user || $user->user_auths->isEmpty()) {
            abort(403, 'User tidak memiliki akses ke company manapun.');
        }

        return $user->user_auths->first()->company_id;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $companyId = $this->getCurrentUserCompanyId();
        $company = Company::find($companyId);

        $masterflows = Masterflow::with(['company', 'steps.jabatan'])
            ->where('company_id', $companyId)
            ->orderBy('created_at', 'desc')
            ->get();

        // Get user with full auth relationships for sidebar
        $userWithAuth = \App\Models\User::with('userAuths.role', 'userAuths.company')
            ->find(Auth::id());

        return Inertia::render('admin/Masterflow/Index', [
            'masterflows' => $masterflows,
            'company' => $company,
            'auth' => [
                'user' => $userWithAuth
            ],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $jabatans = Jabatan::orderBy('name')->get();
        $companyId = $this->getCurrentUserCompanyId();
        $company = Company::find($companyId);

        // Get user with full auth relationships for sidebar
        $userWithAuth = \App\Models\User::with('userAuths.role', 'userAuths.company')
            ->find(Auth::id());

        return Inertia::render('admin/Masterflow/Create', [
            'jabatans' => $jabatans,
            'company' => $company,
            'auth' => [
                'user' => $userWithAuth
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $companyId = $this->getCurrentUserCompanyId();

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'steps' => 'required|array|min:1',
            'steps.*.jabatan_id' => 'required|exists:jabatans,id',
            'steps.*.step_name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.is_required' => 'boolean',
            'steps.*.group_index' => 'nullable|string|max:255',
            'steps.*.jenis_group' => 'nullable|in:all_required,any_one,majority',
            'steps.*.users_in_group' => 'nullable|array',
            'steps.*.users_in_group.*' => 'exists:users,id',
        ]);

        DB::transaction(function () use ($request, $companyId) {
            // Create masterflow
            $masterflow = Masterflow::create([
                'company_id' => $companyId,
                'name' => $request->name,
                'description' => $request->description,
                'is_active' => true,
                'total_steps' => count($request->steps),
            ]);

            // Create steps
            foreach ($request->steps as $index => $stepData) {
                MasterflowStep::create([
                    'masterflow_id' => $masterflow->id,
                    'jabatan_id' => $stepData['jabatan_id'],
                    'step_order' => $index + 1,
                    'step_name' => $stepData['step_name'],
                    'description' => $stepData['description'] ?? null,
                    'is_required' => $stepData['is_required'] ?? true,
                    'group_index' => $stepData['group_index'] ?? null,
                    'jenis_group' => $stepData['jenis_group'] ?? null,
                    'users_in_group' => $stepData['users_in_group'] ?? null,
                ]);
            }
        });

        return redirect()->route('admin.masterflows.index')
            ->with('success', 'Masterflow berhasil dibuat.');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $companyId = $this->getCurrentUserCompanyId();

        $masterflow = Masterflow::with(['company', 'steps.jabatan'])
            ->where('company_id', $companyId)
            ->findOrFail($id);

        // Get user with full auth relationships for sidebar
        $userWithAuth = \App\Models\User::with('userAuths.role', 'userAuths.company')
            ->find(Auth::id());

        return Inertia::render('admin/Masterflow/Show', [
            'masterflow' => $masterflow,
            'auth' => [
                'user' => $userWithAuth
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        $companyId = $this->getCurrentUserCompanyId();

        $masterflow = Masterflow::with(['steps.jabatan'])
            ->where('company_id', $companyId)
            ->findOrFail($id);

        $jabatans = Jabatan::orderBy('name')->get();

        $companyId = $this->getCurrentUserCompanyId();
        $company = Company::find($companyId);

        // Get user with full auth relationships for sidebar
        $userWithAuth = \App\Models\User::with('userAuths.role', 'userAuths.company')
            ->find(Auth::id());

        return Inertia::render('admin/Masterflow/Edit', [
            'masterflow' => $masterflow,
            'jabatans' => $jabatans,
            'company' => $company,
            'auth' => [
                'user' => $userWithAuth
            ],
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $companyId = $this->getCurrentUserCompanyId();

        $masterflow = Masterflow::where('company_id', $companyId)->findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'steps' => 'required|array|min:1',
            'steps.*.jabatan_id' => 'required|exists:jabatans,id',
            'steps.*.step_name' => 'required|string|max:255',
            'steps.*.description' => 'nullable|string',
            'steps.*.is_required' => 'boolean',
            'steps.*.group_index' => 'nullable|string|max:255',
            'steps.*.jenis_group' => 'nullable|in:all_required,any_one,majority',
            'steps.*.users_in_group' => 'nullable|array',
            'steps.*.users_in_group.*' => 'exists:users,id',
        ]);

        DB::transaction(function () use ($request, $masterflow) {
            // Update masterflow
            $masterflow->update([
                'name' => $request->name,
                'description' => $request->description,
                'is_active' => $request->is_active ?? true,
                'total_steps' => count($request->steps),
            ]);

            // Delete existing steps
            $masterflow->steps()->delete();

            // Create new steps
            foreach ($request->steps as $index => $stepData) {
                MasterflowStep::create([
                    'masterflow_id' => $masterflow->id,
                    'jabatan_id' => $stepData['jabatan_id'],
                    'step_order' => $index + 1,
                    'step_name' => $stepData['step_name'],
                    'description' => $stepData['description'] ?? null,
                    'is_required' => $stepData['is_required'] ?? true,
                    'group_index' => $stepData['group_index'] ?? null,
                    'jenis_group' => $stepData['jenis_group'] ?? null,
                    'users_in_group' => $stepData['users_in_group'] ?? null,
                ]);
            }
        });

        return redirect()->route('admin.masterflows.index')
            ->with('success', 'Masterflow berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $companyId = $this->getCurrentUserCompanyId();

        $masterflow = Masterflow::where('company_id', $companyId)->findOrFail($id);

        $masterflow->delete();

        return redirect()->route('admin.masterflows.index')
            ->with('success', 'Masterflow berhasil dihapus.');
    }

    /**
     * Toggle masterflow active status
     */
    public function toggleStatus(string $id)
    {
        $companyId = $this->getCurrentUserCompanyId();

        $masterflow = Masterflow::where('company_id', $companyId)->findOrFail($id);

        $masterflow->update([
            'is_active' => !$masterflow->is_active
        ]);

        $status = $masterflow->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return redirect()->route('admin.masterflows.index')
            ->with('success', "Masterflow berhasil {$status}.");
    }

    /**
     * Get masterflow steps for approval flow
     */
    public function getSteps(Masterflow $masterflow)
    {
        $steps = $masterflow->steps()
            ->with('jabatan:id,name')
            ->orderBy('step_order', 'asc')
            ->get(['id', 'masterflow_id', 'step_order', 'step_name', 'jabatan_id']);

        return response()->json([
            'steps' => $steps
        ]);
    }
}
