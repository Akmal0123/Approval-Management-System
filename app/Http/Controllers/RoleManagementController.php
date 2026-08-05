<?php

namespace App\Http\Controllers;

use App\Events\RoleUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RoleManagementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $roles = DB::table('usersroles')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('management/role-management', [
            'roles' => $roles
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

        return redirect()->back()->with('success', 'Role berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'role_name' => 'required|string|max:255|unique:usersroles,role_name,' . $id,
        ]);

        DB::table('usersroles')
            ->where('id', $id)
            ->update([
                'role_name' => $request->role_name,
                'updated_at' => now(),
            ]);

        // Get the updated role for broadcasting
        $role = DB::table('usersroles')->where('id', $id)->first();

        // Broadcast the role update
        broadcast(new RoleUpdated('updated', $role));

        return redirect()->back()->with('success', 'Role berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        // Check if role is being used by any user
        $isRoleInUse = DB::table('usersauth')
            ->where('role_id', $id)
            ->exists();

        if ($isRoleInUse) {
            return redirect()->back()->with('error', 'Role tidak dapat dihapus karena sedang digunakan oleh pengguna.');
        }

        // Get role data before deletion for broadcasting
        $role = DB::table('usersroles')->where('id', $id)->first();

        DB::table('usersroles')
            ->where('id', $id)
            ->delete();

        // Broadcast the role deletion
        broadcast(new RoleUpdated('deleted', $role));

        return redirect()->back()->with('success', 'Role berhasil dihapus.');
    }
}
