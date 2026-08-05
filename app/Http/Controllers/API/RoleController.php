<?php

namespace App\Http\Controllers\API;

use App\Events\RoleUpdated;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $roles = DB::table('usersroles')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'roles' => $roles,
            'message' => 'Roles retrieved successfully'
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'role_name' => 'required|string|max:255|unique:usersroles,role_name',
        ]);

        $roleId = DB::table('usersroles')->insertGetId([
            'role_name' => $request->role_name,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Get the created role for broadcasting
        $role = DB::table('usersroles')->where('id', $roleId)->first();

        // Broadcast the role creation
        broadcast(new RoleUpdated('created', $role));

        return response()->json([
            'role' => $role,
            'message' => 'Role created successfully'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $role = DB::table('usersroles')->where('id', $id)->first();

        if (!$role) {
            return response()->json([
                'message' => 'Role not found'
            ], 404);
        }

        return response()->json([
            'role' => $role
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $request->validate([
            'role_name' => 'required|string|max:255|unique:usersroles,role_name,' . $id,
        ]);

        $affected = DB::table('usersroles')
            ->where('id', $id)
            ->update([
                'role_name' => $request->role_name,
                'updated_at' => now(),
            ]);

        if (!$affected) {
            return response()->json([
                'message' => 'Role not found'
            ], 404);
        }

        // Get the updated role for broadcasting
        $role = DB::table('usersroles')->where('id', $id)->first();

        // Broadcast the role update
        broadcast(new RoleUpdated('updated', $role));

        return response()->json([
            'role' => $role,
            'message' => 'Role updated successfully'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        // Check if role is being used by any user
        $isRoleInUse = DB::table('usersauth')
            ->where('role_id', $id)
            ->exists();

        if ($isRoleInUse) {
            return response()->json([
                'message' => 'Role cannot be deleted because it is currently in use by users.'
            ], 422);
        }

        // Get role data before deletion for broadcasting
        $role = DB::table('usersroles')->where('id', $id)->first();

        if (!$role) {
            return response()->json([
                'message' => 'Role not found'
            ], 404);
        }

        DB::table('usersroles')->where('id', $id)->delete();

        // Broadcast the role deletion
        broadcast(new RoleUpdated('deleted', $role));

        return response()->json([
            'message' => 'Role deleted successfully'
        ]);
    }
}
