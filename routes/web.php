<?php

use App\Http\Controllers\RoleManagementController;
use App\Http\Controllers\UserDashboardController;
use App\Http\Controllers\AdminDashboardController;
use App\Http\Controllers\DokumenController;
use App\Http\Controllers\DokumenVersionController;
use App\Http\Controllers\DokumenApprovalController;
use App\Http\Controllers\CommentController;
use App\Models\Masterflow;
use App\Services\ContextService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

Route::get('/', function () {
    if (Auth::check()) {
        return redirect('/dashboard');
    }
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        // Use ContextService to get the current context's role
        $contextService = app(ContextService::class);
        $context = $contextService->getContext();

        if ($context && $context->role) {
            $roleName = strtolower($context->role->role_name);

            // Redirect based on current context's role
            switch ($roleName) {
                case 'super admin':
                    return redirect()->route('super-admin.dashboard');
                case 'admin':
                    return redirect()->route('admin.dashboard');
                case 'user':
                    return redirect()->route('user.dashboard');
                default:
                    return redirect()->route('user.dashboard');
            }
        }

        // Fallback to user dashboard
        return redirect()->route('user.dashboard');
    })->name('dashboard');

    // Role Management
    Route::get('/role-management', function () {
        return Inertia::render('management/role-management');
    })->name('role-management');

    // Context Management Routes
    Route::get('/contexts', [\App\Http\Controllers\ContextController::class, 'index'])->name('context.index');
    Route::get('/contexts/current', [\App\Http\Controllers\ContextController::class, 'current'])->name('context.current');
    Route::post('/contexts/switch', [\App\Http\Controllers\ContextController::class, 'switch'])->name('context.switch');
    Route::get('/context/select', [\App\Http\Controllers\ContextController::class, 'select'])->name('context.select');
});


// Role-based Routes (No middleware - handle auth via Sanctum in frontend)

// Super Admin Routes
Route::middleware(['auth', 'check.role:Super Admin'])->group(function () {
    Route::get('/super-admin/dashboard', function () {
        return Inertia::render('super-admin/dashboard');
    })->name('super-admin.dashboard');

    Route::get('/super-admin/role-management', function () {
        return Inertia::render('super-admin/role-management');
    })->name('super-admin.role-management');

    Route::get('/super-admin/company-management', function () {
        return Inertia::render('super-admin/company-management');
    })->name('super-admin.company-management');

    Route::get('/super-admin/jabatan-management', function () {
        return Inertia::render('super-admin/jabatan-management');
    })->name('super-admin.jabatan-management');

    Route::get('/super-admin/aplikasi-management', function () {
        return Inertia::render('super-admin/aplikasi-management');
    })->name('super-admin.aplikasi-management');

    Route::get('/super-admin/user-management', function () {
        return Inertia::render('super-admin/user-management');
    })->name('super-admin.user-management');
});

// Admin Routes  
Route::middleware(['auth', 'check.role:Admin'])->group(function () {
    Route::get('/admin/dashboard', [AdminDashboardController::class, 'index'])->name('admin.dashboard');

    Route::get('/admin/dokumen', function () {
        return Inertia::render('admin/dokumen');
    })->name('admin.dokumen');

    // Masterflow Management Routes
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::resource('masterflows', \App\Http\Controllers\Admin\MasterflowController::class);
        Route::patch('masterflows/{masterflow}/toggle-status', [\App\Http\Controllers\Admin\MasterflowController::class, 'toggleStatus'])
            ->name('masterflows.toggle-status');
    });
});

// User Routes
Route::middleware(['auth', 'check.role:User'])->group(function () {
    Route::get('/user/dashboard', [UserDashboardController::class, 'index'])->name('user.dashboard');
    Route::get('/user/statistics', [UserDashboardController::class, 'getStatistics'])->name('user.statistics');
    Route::get('/user/recent-documents', [UserDashboardController::class, 'getRecentDocuments'])->name('user.recent-documents');
    Route::get('/user/masterflows', [UserDashboardController::class, 'getMasterflows'])->name('user.masterflows');
});

// Document Management Routes (Available for all authenticated users)
Route::middleware(['auth'])->group(function () {
    // Document pages (Inertia) - Must be defined BEFORE API routes to avoid conflicts
    Route::get('/dokumen', function () {
        return Inertia::render('dokumen/index');
    })->name('dokumen.page');

    // Document API endpoints with /api prefix to avoid conflicts with page routes
    Route::prefix('api/dokumen')->group(function () {
        Route::get('/', [\App\Http\Controllers\DokumenController::class, 'index'])->name('dokumen.index');
        Route::post('/', [\App\Http\Controllers\DokumenController::class, 'store'])->name('dokumen.store');
        Route::get('/{dokumen}', [\App\Http\Controllers\DokumenController::class, 'show'])->name('dokumen.show');
        Route::put('/{dokumen}', [\App\Http\Controllers\DokumenController::class, 'update'])->name('dokumen.update');
        Route::delete('/{dokumen}', [\App\Http\Controllers\DokumenController::class, 'destroy'])->name('dokumen.destroy');

        // Document workflow actions
        Route::post('/{dokumen}/submit', [\App\Http\Controllers\DokumenController::class, 'submit'])->name('dokumen.submit');
        Route::post('/{dokumen}/cancel', [\App\Http\Controllers\DokumenController::class, 'cancel'])->name('dokumen.cancel');
        Route::get('/{dokumen}/download/{version}', [\App\Http\Controllers\DokumenController::class, 'download'])->name('dokumen.download');

        // Stream signed PDF (on-demand generation for preview)
        Route::get('/{dokumen}/signed-pdf/{version?}', [\App\Http\Controllers\DokumenController::class, 'streamSignedPdf'])->name('dokumen.signed-pdf');
    });

    // Document detail page
    Route::get('/dokumen/{id}', function ($id) {
        return Inertia::render('dokumen/show', ['id' => $id]);
    })->where('id', '[0-9]+')->name('dokumen.detail');
});

// Other Document Related Routes
Route::middleware(['auth'])->group(function () {
    // Document versions
    Route::resource('dokumen.versions', \App\Http\Controllers\DokumenVersionController::class)
        ->except(['index', 'show'])
        ->names([
            'create' => 'dokumen.versions.create',
            'store' => 'dokumen.versions.store',
            'edit' => 'dokumen.versions.edit',
            'update' => 'dokumen.versions.update',
            'destroy' => 'dokumen.versions.destroy'
        ]);

    // Document approvals
    Route::get('approvals', [\App\Http\Controllers\DokumenApprovalController::class, 'index'])->name('approvals.index');
    Route::get('approvals/{approval}', [\App\Http\Controllers\DokumenApprovalController::class, 'show'])->name('approvals.show');
    Route::post('approvals/{approval}/approve', [\App\Http\Controllers\DokumenApprovalController::class, 'approve'])->name('approvals.approve');
    Route::post('approvals/{approval}/reject', [\App\Http\Controllers\DokumenApprovalController::class, 'reject'])->name('approvals.reject');
    Route::post('approvals/{approval}/delegate', [\App\Http\Controllers\DokumenApprovalController::class, 'delegate'])->name('approvals.delegate');
    Route::post('approvals/{approval}/request-revision', [\App\Http\Controllers\DokumenApprovalController::class, 'requestRevision'])->name('approvals.request-revision');

    // Document revision history
    Route::get('dokumen/{dokumen}/history', [\App\Http\Controllers\RevisionHistoryController::class, 'index'])->name('dokumen.history');
    Route::get('dokumen/{dokumen}/compare', [\App\Http\Controllers\RevisionHistoryController::class, 'compare'])->name('dokumen.compare');

    // Document revision upload
    Route::post('dokumen/{dokumen}/upload-revision', [\App\Http\Controllers\DokumenController::class, 'uploadRevision'])->name('dokumen.upload-revision');

    // Comments
    Route::post('dokumen/{dokumen}/comments', [\App\Http\Controllers\CommentController::class, 'store'])->name('comments.store');
    Route::put('comments/{comment}', [\App\Http\Controllers\CommentController::class, 'update'])->name('comments.update');
    Route::delete('comments/{comment}', [\App\Http\Controllers\CommentController::class, 'destroy'])->name('comments.destroy');

    // Signatures
    Route::get('signatures', [\App\Http\Controllers\SignatureController::class, 'index'])->name('signatures.index');
    Route::post('signatures', [\App\Http\Controllers\SignatureController::class, 'store'])->name('signatures.store');
    Route::post('signatures/upload', [\App\Http\Controllers\SignatureController::class, 'upload'])->name('signatures.upload');
    Route::post('signatures/{signature}/set-default', [\App\Http\Controllers\SignatureController::class, 'setDefault'])->name('signatures.setDefault');
    Route::delete('signatures/{signature}', [\App\Http\Controllers\SignatureController::class, 'destroy'])->name('signatures.destroy');

    // Helper routes
    Route::get('masterflows/{masterflow}/steps', function (\App\Models\Masterflow $masterflow) {
        return response()->json([
            'steps' => $masterflow->masterflowDetails()->with(['approver', 'role'])->orderBy('step_order')->get()->map(function ($detail) {
                return [
                    'id' => $detail->id,
                    'step_order' => $detail->step_order,
                    'approver_name' => $detail->approver->name ?? 'N/A',
                    'role_name' => $detail->role->role_name ?? 'N/A',
                ];
            })
        ]);
    })->name('masterflows.steps');
});

// Legacy SPA Routes (redirect to appropriate role dashboards)
Route::get('/spa', function () {
    return redirect('/admin/dashboard');
})->name('spa');

Route::get('/spa/dashboard', function () {
    return redirect('/admin/dashboard');
})->name('spa.dashboard');

Route::get('/spa/role-management', function () {
    return redirect('/super-admin/role-management');
})->name('spa.role-management');

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/debug.php';
require __DIR__ . '/test-broadcast.php';
