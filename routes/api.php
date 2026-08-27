<?php

use App\Http\Controllers\AplikasiController;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\CompanyController;
use App\Http\Controllers\API\JabatanController;
use App\Http\Controllers\API\RoleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DokumenController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserDashboardController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes - support both web session and sanctum token
Route::middleware(['auth:sanctum,web'])->group(function () {
    // Authentication
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Master Management
    Route::apiResource('roles', RoleController::class);
    Route::apiResource('companies', CompanyController::class);
    Route::apiResource('jabatans', JabatanController::class);
    Route::apiResource('aplikasis', AplikasiController::class);
    Route::apiResource('users', UserController::class);

    // Dashboard Statistics
    Route::get('/dashboard/super-admin/stats', [DashboardController::class, 'superAdminStats']);

    // User Dashboard API Routes
    Route::prefix('user')->group(function () {
        Route::get('/statistics', [UserDashboardController::class, 'getStatisticsApi']);
        Route::get('/recent-documents', [UserDashboardController::class, 'getRecentDocumentsApi']);
    });

    // Dokumen API Routes
    Route::get('/dokumen', [DokumenController::class, 'apiIndex']);
    Route::post('/dokumen/{dokumen}/upload-revision', [DokumenController::class, 'uploadRevision']);
    Route::delete('/dokumen/{dokumen}', [DokumenController::class, 'destroy']);
    
    // Signed PDF streaming & download
    Route::get('/dokumen/{dokumen}/signed-pdf/{version?}', [DokumenController::class, 'streamSignedPdf']);
    Route::get('/dokumen/{dokumen}/download/{version?}', [DokumenController::class, 'download']);

    // Masterflow API Routes
    Route::get('/masterflows', [UserDashboardController::class, 'getMasterflowsApi']);
    Route::get('/masterflows/{masterflow}/steps', [\App\Http\Controllers\Admin\MasterflowController::class, 'getSteps']);

    // User API Routes for approval flow
    Route::get('/users-by-jabatan/{jabatan}', [UserController::class, 'getByJabatan']);
});

// Fallback response for unhandled API routes
Route::fallback(function () {
    return response()->json([
        'message' => 'Endpoint API tidak ditemukan.'
    ], 404);
});