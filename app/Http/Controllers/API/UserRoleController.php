<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class UserRoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = UserRole::query();

        // Search functionality
        if ($request->has('search') && $request->search) {
            $query->search($request->search);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');

        if (in_array($sortBy, ['id', 'role_name', 'created_at', 'updated_at'])) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Pagination
        $perPage = $request->get('per_page', 10);
        $roles = $query->withCount('users')->paginate($perPage);

        // Transform data to include formatted names
        $roles->getCollection()->transform(function ($role) {
            $role->formatted_role_name = ucwords(str_replace('_', ' ', $role->role_name));
            return $role;
        });

        return response()->json([
            'success' => true,
            'data' => $roles,
            'message' => 'User roles retrieved successfully'
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'role_name' => [
                'required',
                'string',
                'max:255',
                'unique:usersroles,role_name',
                'regex:/^[a-zA-Z0-9\s_-]+$/',
            ],
        ], [
            'role_name.required' => 'Role name is required.',
            'role_name.unique' => 'This role name already exists.',
            'role_name.regex' => 'Role name can only contain letters, numbers, spaces, underscores, and hyphens.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $role = UserRole::create([
                'role_name' => trim($request->role_name),
            ]);

            $role->formatted_role_name = ucwords(str_replace('_', ' ', $role->role_name));

            return response()->json([
                'success' => true,
                'data' => $role,
                'message' => 'User role created successfully'
            ], Response::HTTP_CREATED);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create user role: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(UserRole $userRole)
    {
        try {
            $role = $userRole->loadCount('users');
            $role->formatted_role_name = ucwords(str_replace('_', ' ', $role->role_name));

            return response()->json([
                'success' => true,
                'data' => $role,
                'message' => 'User role retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'User role not found'
            ], Response::HTTP_NOT_FOUND);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, UserRole $userRole)
    {
        $validator = Validator::make($request->all(), [
            'role_name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('usersroles', 'role_name')->ignore($userRole->id),
                'regex:/^[a-zA-Z0-9\s_-]+$/',
            ],
        ], [
            'role_name.required' => 'Role name is required.',
            'role_name.unique' => 'This role name already exists.',
            'role_name.regex' => 'Role name can only contain letters, numbers, spaces, underscores, and hyphens.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
                'message' => 'Validation failed'
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $userRole->update([
                'role_name' => trim($request->role_name),
            ]);

            $userRole->formatted_role_name = ucwords(str_replace('_', ' ', $userRole->role_name));

            return response()->json([
                'success' => true,
                'data' => $userRole->fresh(),
                'message' => 'User role updated successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user role: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(UserRole $userRole)
    {
        try {
            // Check if role is being used by any users
            $usersCount = $userRole->users()->count();

            if ($usersCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete role '{$userRole->role_name}' because it is assigned to {$usersCount} user(s). Please reassign or remove these users first."
                ], Response::HTTP_CONFLICT);
            }

            // Check if it's a system role that shouldn't be deleted
            $systemRoles = ['super_admin', 'admin', 'user'];
            if (in_array(strtolower($userRole->role_name), $systemRoles)) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete system role '{$userRole->role_name}'. This role is required for system operation."
                ], Response::HTTP_FORBIDDEN);
            }

            $roleName = $userRole->role_name;
            $userRole->delete();

            return response()->json([
                'success' => true,
                'message' => "User role '{$roleName}' deleted successfully"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user role: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get roles for dropdown/select options
     */
    public function options()
    {
        try {
            $roles = UserRole::select('id', 'role_name')
                ->orderBy('role_name')
                ->get()
                ->map(function ($role) {
                    return [
                        'value' => $role->id,
                        'label' => ucwords(str_replace('_', ' ', $role->role_name)),
                        'name' => $role->role_name,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => $roles,
                'message' => 'User role options retrieved successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve user role options: ' . $e->getMessage()
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}
