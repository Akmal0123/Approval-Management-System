<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\CompanyController;
use App\Http\Controllers\API\JabatanController;
use App\Http\Controllers\API\AplikasiController;
use App\Http\Controllers\API\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UserDashboardController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DokumenController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);


// Protected routes - support both web session and sanctum token
Route::middleware(['auth:sanctum,web'])->group(function () {
    // Authentication
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Role Management
    Route::apiResource('roles', RoleController::class);

    // Company Management  
    Route::apiResource('companies', CompanyController::class);

    // Jabatan Management
    Route::apiResource('jabatans', JabatanController::class);

    // Aplikasi Management
    Route::apiResource('aplikasis', AplikasiController::class);
    Route::get('/aplikasi-by-company/{company_id}', [AplikasiController::class, 'getByCompany']);

    // Transaksi Management
    Route::apiResource('transaksis', \App\Http\Controllers\API\TransaksiController::class);
    Route::patch('transaksis/{transaksi}/toggle-status', [\App\Http\Controllers\API\TransaksiController::class, 'toggleStatus']);
    Route::get('/transaksi-by-aplikasi/{aplikasi_id}', [\App\Http\Controllers\API\TransaksiController::class, 'getByAplikasi']);

    // User Management
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
    Route::get('/dokumen/{dokumen}/signature-positions', [\App\Http\Controllers\SignaturePositionController::class, 'index']);
    Route::post('/dokumen/{dokumen}/signature-positions', [\App\Http\Controllers\SignaturePositionController::class, 'store']);

    // Lookup Dokumen
    Route::post('/dokumen/lookup-external', [DokumenController::class, 'lookupExternal']);
    
    // Masterflow API Routes (via UserDashboardController)
    Route::get('/masterflows', [UserDashboardController::class, 'getMasterflowsApi']);
    Route::get('/masterflows/{masterflow}/steps', [\App\Http\Controllers\Admin\MasterflowController::class, 'getSteps']);
    Route::get('/masterflows-by-transaksi/{transaksi_id}', [\App\Http\Controllers\Admin\MasterflowController::class, 'getByTransaksi']);

    // User API Routes for approval flow
    Route::get('/users-by-jabatan/{jabatan}', [UserController::class, 'getByJabatan']);
});

/*
|--------------------------------------------------------------------------
| Mock External ERP / Tisera API Routes (Simulasi Server Eksternal)
|--------------------------------------------------------------------------
| Endpoints ini mensimulasikan server luar yang diproteksi dengan API Key & JWT.
| 1. POST /api/mock-external/oauth/token (Dapatkan JWT via API Key & Secret)
| 2. GET  /api/mock-external/documents/lookup (Cari data & dapatkan ID, butuh JWT)
| 3. GET  /api/mock-external/documents/{id}/detail (Tarik detail & PDF, butuh JWT)
*/
Route::prefix('mock-external')->group(function () {
    Route::post('/oauth/token', [\App\Http\Controllers\MockExternalApiController::class, 'issueToken']);
    Route::get('/documents/lookup', [\App\Http\Controllers\MockExternalApiController::class, 'lookup']);
    Route::get('/documents/{id}/detail', [\App\Http\Controllers\MockExternalApiController::class, 'getDocumentDetail']);
});

