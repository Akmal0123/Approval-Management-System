<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use App\Models\UsersAuth;

Route::get('/debug-user-data', function () {
    $user = Auth::user();
    if (!$user) {
        return response()->json(['error' => 'Not authenticated']);
    }

    // Get user auth data directly
    $userAuth = UsersAuth::with(['company', 'jabatan'])
        ->where('user_id', $user->id)
        ->first();

    $data = [
        'user_id' => $user->id,
        'user_email' => $user->email,
        'userAuth' => $userAuth ? [
            'id' => $userAuth->id,
            'company_id' => $userAuth->company_id,
            'jabatan_id' => $userAuth->jabatan_id,
            'company' => $userAuth->company ? [
                'id' => $userAuth->company->id,
                'name' => $userAuth->company->name,
            ] : null,
            'jabatan' => $userAuth->jabatan ? [
                'id' => $userAuth->jabatan->id,
                'name' => $userAuth->jabatan->name,
            ] : null,
        ] : null,
    ];

    return response()->json($data);
})->middleware(['auth', 'check.role:User']);
