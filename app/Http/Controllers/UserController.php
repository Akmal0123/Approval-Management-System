<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserProfile;
use App\Models\UsersAuth;
use App\Services\ContextService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function __construct(
        protected ContextService $contextService
    ) {}
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = User::with([
            'profile',
            'userAuths.role',
            'userAuths.company',
            'userAuths.jabatan',
            'userAuths.aplikasi'
        ]);

        // Filter by role
        if ($request->has('role_id') && $request->role_id !== '') {
            if ($request->role_id === 'unassigned') {
                $query->doesntHave('userAuths');
            } else {
                $query->whereHas('userAuths', function ($q) use ($request) {
                    $q->where('role_id', $request->role_id);
                });
            }
        }

        // Filter by jabatan
        if ($request->has('jabatan_id') && $request->jabatan_id !== '') {
            $query->whereHas('userAuths', function ($q) use ($request) {
                $q->where('jabatan_id', $request->jabatan_id);
            });
        }

        // Search by name or email
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $users = $query->get();

        // Define role hierarchy (lower number = higher priority)
        // 0: Unassigned / Menunggu Penugasan Role (Highest priority for Super Admin)
        // 1: Super Admin
        // 2: Admin
        // 3: User
        $roleHierarchy = [
            'Super Admin' => 1,
            'Admin' => 2,
            'User' => 3,
        ];

        // Sort users: unassigned/pending users FIRST, then Super Admin, Admin, User
        $users = $users->sort(function ($a, $b) use ($roleHierarchy) {
            $aHasAuth = $a->userAuths && $a->userAuths->count() > 0;
            $bHasAuth = $b->userAuths && $b->userAuths->count() > 0;

            // Unassigned users get priority 0 so Super Admin can attend to them immediately
            $aPriority = 0;
            if ($aHasAuth) {
                $aPriority = 999;
                foreach ($a->userAuths as $auth) {
                    if ($auth->role && isset($roleHierarchy[$auth->role->role_name])) {
                        $aPriority = min($aPriority, $roleHierarchy[$auth->role->role_name]);
                    }
                }
            }

            $bPriority = 0;
            if ($bHasAuth) {
                $bPriority = 999;
                foreach ($b->userAuths as $auth) {
                    if ($auth->role && isset($roleHierarchy[$auth->role->role_name])) {
                        $bPriority = min($bPriority, $roleHierarchy[$auth->role->role_name]);
                    }
                }
            }

            // If same priority level:
            if ($aPriority === $bPriority) {
                // If both are unassigned, sort newest registration first
                if ($aPriority === 0) {
                    $timeA = $a->created_at ? $a->created_at->timestamp : 0;
                    $timeB = $b->created_at ? $b->created_at->timestamp : 0;
                    return $timeB - $timeA;
                }
                return strcmp(strtolower($a->name), strtolower($b->name));
            }

            return $aPriority - $bPriority;
        })->values();

        // Count unassigned users for UI badge
        $unassignedCount = User::doesntHave('userAuths')->count();

        // Pagination settings
        $perPage = (int) $request->get('per_page', 10);
        $currentPage = (int) $request->get('page', 1);
        $total = $users->count();

        // Manual pagination
        $paginatedUsers = $users->slice(($currentPage - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $paginatedUsers,
            'meta' => [
                'current_page' => $currentPage,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
                'from' => $total > 0 ? ($currentPage - 1) * $perPage + 1 : 0,
                'to' => min($currentPage * $perPage, $total),
                'unassigned_count' => $unassignedCount,
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'pin' => 'nullable|string|size:8',
            'address' => 'nullable|string',
            'phone_number' => 'nullable|string',
            'user_auths' => 'required|array|min:1',
            'user_auths.*.role_id' => 'required|integer|exists:usersroles,id',
            'user_auths.*.company_id' => 'required|integer|exists:companies,id',
            'user_auths.*.jabatan_id' => 'required|integer|exists:jabatans,id',
            'user_auths.*.aplikasi_id' => 'required|integer|exists:aplikasis,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'pin' => $request->pin ?: '12345678',
            ]);

            // Create user profile
            $user->profile()->create([
                'address' => $request->address,
                'phone_number' => $request->phone_number,
            ]);

            // Create user auths
            foreach ($request->user_auths as $authData) {
                $user->userAuths()->create([
                    'role_id' => $authData['role_id'],
                    'company_id' => $authData['company_id'],
                    'jabatan_id' => $authData['jabatan_id'],
                    'aplikasi_id' => $authData['aplikasi_id'],
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'User created successfully',
                'user' => $user->load(['profile', 'userAuths.role', 'userAuths.company', 'userAuths.jabatan', 'userAuths.aplikasi'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $user = User::with([
            'profile',
            'userAuths.role',
            'userAuths.company',
            'userAuths.jabatan',
            'userAuths.aplikasi'
        ])->find($id);

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        return response()->json($user);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $user = User::with(['profile', 'userAuths'])->find($id);

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'password' => 'nullable|string|min:6',
            'pin' => 'nullable|string|size:8',
            'address' => 'nullable|string',
            'phone_number' => 'nullable|string',
            'user_auths' => 'required|array|min:1',
            'user_auths.*.role_id' => 'required|integer|exists:usersroles,id',
            'user_auths.*.company_id' => 'required|integer|exists:companies,id',
            'user_auths.*.jabatan_id' => 'required|integer|exists:jabatans,id',
            'user_auths.*.aplikasi_id' => 'required|integer|exists:aplikasis,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $updateData = [
                'name' => $request->name,
                'email' => $request->email,
            ];

            if ($request->filled('pin')) {
                $updateData['pin'] = $request->pin;
            } elseif (!$user->pin) {
                // If user doesn't have a PIN yet, assign default 12345678
                $updateData['pin'] = '12345678';
            }

            // Only update password if provided
            if ($request->filled('password')) {
                $updateData['password'] = Hash::make($request->password);
            }

            $user->update($updateData);

            // Update or create profile
            if ($user->profile) {
                $user->profile->update([
                    'address' => $request->address,
                    'phone_number' => $request->phone_number,
                ]);
            } else {
                $user->profile()->create([
                    'address' => $request->address,
                    'phone_number' => $request->phone_number,
                ]);
            }

            $hadNoAuths = $user->userAuths()->count() === 0;

            // Delete existing user auths and create new ones
            $user->userAuths()->delete();

            $firstAuthId = null;
            foreach ($request->user_auths as $authData) {
                $newAuth = $user->userAuths()->create([
                    'role_id' => $authData['role_id'],
                    'company_id' => $authData['company_id'],
                    'jabatan_id' => $authData['jabatan_id'],
                    'aplikasi_id' => $authData['aplikasi_id'],
                ]);
                if (!$firstAuthId) {
                    $firstAuthId = $newAuth->id;
                }
            }

            if ((!$user->last_context_id || $hadNoAuths) && $firstAuthId) {
                $user->update(['last_context_id' => $firstAuthId]);
            }

            DB::commit();

            // Send registration approved email if this is their first role assignment
            if ($hadNoAuths && count($request->user_auths) > 0) {
                try {
                    $firstAuth = $user->userAuths()->with(['role', 'company', 'jabatan', 'aplikasi'])->first();
                    if ($firstAuth) {
                        $authDetails = [
                            'role' => $firstAuth->role->role_name ?? 'N/A',
                            'company' => $firstAuth->company->name ?? 'N/A',
                            'jabatan' => $firstAuth->jabatan->name ?? 'N/A',
                            'aplikasi' => $firstAuth->aplikasi->name ?? 'N/A',
                        ];
                        \Illuminate\Support\Facades\Mail::to($user->email)->send(new \App\Mail\UserRegistrationApprovedMail($user, $authDetails));
                    }
                } catch (\Throwable $mailError) {
                    \Illuminate\Support\Facades\Log::warning('Failed to send registration approved email: ' . $mailError->getMessage());
                }
            }

            return response()->json([
                'message' => 'User updated successfully',
                'user' => $user->fresh(['profile', 'userAuths.role', 'userAuths.company', 'userAuths.jabatan', 'userAuths.aplikasi'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        try {
            $user->delete(); // Profile will be deleted automatically due to cascade

            return response()->json([
                'message' => 'User deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get users by jabatan for approval flow
     */
    public function getByJabatan($jabatan_id)
    {
        // Ambil company_id dari context user yang sedang login
        // agar daftar approver hanya berasal dari PT yang sama
        $context = $this->contextService->getContext();
        $companyId = $context?->company_id;

        $query = User::whereHas('userAuths', function ($q) use ($jabatan_id, $companyId) {
            $q->where('jabatan_id', $jabatan_id);
            if ($companyId) {
                $q->where('company_id', $companyId);
            }
        })
            ->select('id', 'name', 'email')
            ->orderBy('name');

        return response()->json($query->get());
    }
}
