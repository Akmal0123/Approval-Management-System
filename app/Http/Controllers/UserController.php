<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserProfile;
use App\Models\UsersAuth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
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
            $query->whereHas('userAuths', function ($q) use ($request) {
                $q->where('role_id', $request->role_id);
            });
        }

        // Filter by jabatan
        if ($request->has('jabatan_id') && $request->jabatan_id !== '') {
            $query->whereHas('userAuths', function ($q) use ($request) {
                $q->where('jabatan_id', $request->jabatan_id);
            });
        }

        $users = $query->get();

        // Define role hierarchy (lower number = higher priority)
        $roleHierarchy = [
            'Super Admin' => 1,
            'Admin' => 2,
            'User' => 3,
        ];

        // Sort users by highest role they have
        $users = $users->sort(function ($a, $b) use ($roleHierarchy) {
            // Get the highest role (lowest hierarchy number) for each user
            $aHighestRole = 999;
            if ($a->userAuths && $a->userAuths->count() > 0) {
                foreach ($a->userAuths as $auth) {
                    if ($auth->role && isset($roleHierarchy[$auth->role->role_name])) {
                        $aHighestRole = min($aHighestRole, $roleHierarchy[$auth->role->role_name]);
                    }
                }
            }

            $bHighestRole = 999;
            if ($b->userAuths && $b->userAuths->count() > 0) {
                foreach ($b->userAuths as $auth) {
                    if ($auth->role && isset($roleHierarchy[$auth->role->role_name])) {
                        $bHighestRole = min($bHighestRole, $roleHierarchy[$auth->role->role_name]);
                    }
                }
            }

            // If same role level, sort by name
            if ($aHighestRole === $bHighestRole) {
                return strcmp($a->name, $b->name);
            }

            return $aHighestRole - $bHighestRole;
        })->values();

        // Pagination settings
        $perPage = $request->get('per_page', 10);
        $currentPage = $request->get('page', 1);
        $total = $users->count();

        // Manual pagination
        $paginatedUsers = $users->slice(($currentPage - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $paginatedUsers,
            'meta' => [
                'current_page' => (int) $currentPage,
                'per_page' => (int) $perPage,
                'total' => $total,
                'last_page' => (int) ceil($total / $perPage),
                'from' => ($currentPage - 1) * $perPage + 1,
                'to' => min($currentPage * $perPage, $total),
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
            'pin' => 'required|string|size:8',
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
                'pin' => $request->pin,
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
            'pin' => 'required|string|size:8',
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
                'pin' => $request->pin,
            ];

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

            // Delete existing user auths and create new ones
            $user->userAuths()->delete();

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
        $users = User::whereHas('userAuths', function ($query) use ($jabatan_id) {
            $query->where('jabatan_id', $jabatan_id);
        })
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json($users);
    }
}
