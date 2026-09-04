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

// Auto-generate transparent & white Tiga Serangkai logo files if not present
(function () {
    $srcPath = public_path('images/logo-tiga-serangkai.png');
    $whitePath = public_path('images/logo-tiga-serangkai-white.png');
    $transparentPath = public_path('images/logo-tiga-serangkai-transparent.png');

    if (file_exists($srcPath) && (!file_exists($whitePath) || !file_exists($transparentPath))) {
        try {
            $img = @imagecreatefrompng($srcPath);
            if ($img) {
                $w = imagesx($img);
                $h = imagesy($img);

                // Create transparent original logo
                $transImg = imagecreatetruecolor($w, $h);
                imagealphablending($transImg, false);
                imagesavealpha($transImg, true);
                $transColor = imagecolorallocatealpha($transImg, 0, 0, 0, 127);
                imagefill($transImg, 0, 0, $transColor);

                // Create white logo for dark background
                $whiteImg = imagecreatetruecolor($w, $h);
                imagealphablending($whiteImg, false);
                imagesavealpha($whiteImg, true);
                imagefill($whiteImg, 0, 0, $transColor);
                $pureWhite = imagecolorallocatealpha($whiteImg, 255, 255, 255, 0);

                for ($x = 0; $x < $w; $x++) {
                    for ($y = 0; $y < $h; $y++) {
                        $rgb = imagecolorat($img, $x, $y);
                        $r = ($rgb >> 16) & 0xFF;
                        $g = ($rgb >> 8) & 0xFF;
                        $b = $rgb & 0xFF;

                        if ($r > 235 && $g > 235 && $b > 235) {
                            imagesetpixel($transImg, $x, $y, $transColor);
                            imagesetpixel($whiteImg, $x, $y, $transColor);
                        } else {
                            imagesetpixel($transImg, $x, $y, $rgb);
                            imagesetpixel($whiteImg, $x, $y, $pureWhite);
                        }
                    }
                }

                @imagepng($transImg, $transparentPath);
                @imagepng($whiteImg, $whitePath);

                @imagedestroy($img);
                @imagedestroy($transImg);
                @imagedestroy($whiteImg);
            }
        } catch (\Throwable $e) {
            // Ignore GD processing errors
        }
    }
})();

Route::get('/test-db', function () {
    try {
        \Illuminate\Support\Facades\DB::connection('sqlsrv_local')->getPdo();
        return 'Koneksi ke sqlsrv_local berhasil! 🎉';
    } catch (\Exception $e) {
        return 'Koneksi gagal: ' . $e->getMessage();
    }
});

Route::get('/', function () {
    if (Auth::check()) {
        return redirect('/dashboard');
    }
    return redirect()->route('login');
})->name('home');

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

    // Waiting Room Route
    Route::get('/waiting-room', function () {
        return Inertia::render('auth/waiting-room');
    })->name('waiting-room');

    // Context Management Routes
    Route::get('/contexts', [\App\Http\Controllers\ContextController::class, 'index'])->name('context.index');
    Route::get('/contexts/current', [\App\Http\Controllers\ContextController::class, 'current'])->name('context.current');
    Route::post('/contexts/switch', [\App\Http\Controllers\ContextController::class, 'switch'])->name('context.switch');
    Route::get('/context/select', [\App\Http\Controllers\ContextController::class, 'select'])->name('context.select');
});


// Role-based Routes (No middleware - handle auth via Sanctum in frontend)

// Public Document Verification Portal Route (Scanned QR Code)
Route::get('/verify/{hash}', [\App\Http\Controllers\VerificationPortalController::class, 'verify'])->name('document.verify');

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

    Route::get('/super-admin/transaksi-management', [\App\Http\Controllers\API\TransaksiController::class, 'index'])
        ->name('super-admin.transaksi-management');

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

    Route::get('/admin/transaksi-management', [\App\Http\Controllers\API\TransaksiController::class, 'index'])
        ->name('admin.transaksi-management');

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

    Route::get('/dokumen/create', function () {
        return redirect('/dokumen?create=true');
    })->name('dokumen.create');

    // Document API endpoints with /api prefix to avoid conflicts with page routes
    Route::prefix('api/dokumen')->group(function () {
        Route::get('/', [\App\Http\Controllers\DokumenController::class, 'index'])->name('dokumen.index');
        Route::post('/', [\App\Http\Controllers\DokumenController::class, 'store'])->name('dokumen.store');
        Route::get('/{dokumen}', [\App\Http\Controllers\DokumenController::class, 'show'])->name('api.dokumen.show');
        Route::put('/{dokumen}', [\App\Http\Controllers\DokumenController::class, 'update'])->name('dokumen.update');
        Route::delete('/{dokumen}', [\App\Http\Controllers\DokumenController::class, 'destroy'])->name('dokumen.destroy');

        // Document workflow actions
        Route::post('/{dokumen}/submit', [\App\Http\Controllers\DokumenController::class, 'submit'])->name('dokumen.submit');
        Route::post('/{dokumen}/cancel', [\App\Http\Controllers\DokumenController::class, 'cancel'])->name('dokumen.cancel');
        Route::get('/{dokumen}/download/{version}', [\App\Http\Controllers\DokumenController::class, 'download'])->name('dokumen.download');

        // Stream signed PDF (on-demand generation for preview)
        Route::get('/{dokumen}/signed-pdf/{version?}', [\App\Http\Controllers\DokumenController::class, 'streamSignedPdf'])->name('dokumen.signed-pdf');

        // Document revision history & comparison
        Route::get('/{dokumen}/history', [\App\Http\Controllers\RevisionHistoryController::class, 'index'])->name('api.dokumen.history');
        Route::get('/{dokumen}/compare', [\App\Http\Controllers\RevisionHistoryController::class, 'compare'])->name('api.dokumen.compare');
    });

    // Masterflows API endpoint for document creation
    Route::get('/api/masterflows', [\App\Http\Controllers\UserDashboardController::class, 'getMasterflowsApi'])->name('api.masterflows');

    // Document detail & edit pages
    Route::get('/dokumen/{dokumen}', [\App\Http\Controllers\DokumenController::class, 'show'])->where('dokumen', '[0-9]+')->name('dokumen.show');
    Route::get('/dokumen/{dokumen}/detail', [\App\Http\Controllers\DokumenController::class, 'show'])->where('dokumen', '[0-9]+')->name('dokumen.detail');
    Route::get('/dokumen/{dokumen}/edit', [\App\Http\Controllers\DokumenController::class, 'show'])->where('dokumen', '[0-9]+')->name('dokumen.edit');
    Route::match(['post', 'put'], '/dokumen/{dokumen}', [\App\Http\Controllers\DokumenController::class, 'update'])->where('dokumen', '[0-9]+')->name('dokumen.web_update');
    Route::delete('/dokumen/{dokumen}', [\App\Http\Controllers\DokumenController::class, 'destroy'])->where('dokumen', '[0-9]+')->name('dokumen.web_destroy');
    Route::post('/dokumen/{dokumen}/submit', [\App\Http\Controllers\DokumenController::class, 'submit'])->where('dokumen', '[0-9]+')->name('dokumen.web_submit');
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
    Route::post('approvals/bulk-approve', [\App\Http\Controllers\DokumenApprovalController::class, 'bulkApprove'])->name('approvals.bulk-approve');
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
    Route::get('signatures/{signature}/file', [\App\Http\Controllers\SignatureController::class, 'file'])->name('signatures.file');
    Route::post('signatures/{signature}/set-default', [\App\Http\Controllers\SignatureController::class, 'setDefault'])->name('signatures.setDefault');
    Route::delete('signatures/{signature}', [\App\Http\Controllers\SignatureController::class, 'destroy'])->name('signatures.destroy');

    // Helper routes
    Route::get('masterflows/{masterflow}/steps', function (\App\Models\Masterflow $masterflow) {
        return response()->json([
            'steps' => $masterflow->steps()->with('jabatan')->orderBy('step_order')->get()->map(function ($detail) {
                return [
                    'id' => $detail->id,
                    'step_order' => $detail->step_order,
                    'step_name' => $detail->step_name ?? 'N/A',
                    'jabatan_name' => $detail->jabatan->name ?? 'N/A',
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

use App\Services\StorageTokenService;

// Storage fallback route for Windows / missing storage symlink with token security
Route::get('/storage/{path}', function (\Illuminate\Http\Request $request, $path) {
    $diskPath = \Illuminate\Support\Facades\Storage::disk('public')->path($path);
    $filePath = file_exists($diskPath) ? $diskPath : storage_path('app/public/' . $path);

    if (!file_exists($filePath)) {
        abort(404, 'Berkas tidak ditemukan.');
    }

    $token = $request->query('token');
    $user = Auth::user();
    $isSuperAdmin = false;
    if ($user) {
        try {
            $contextService = app(ContextService::class);
            $isSuperAdmin = $contextService->isSuperAdmin();
        } catch (\Throwable $e) {
            $isSuperAdmin = false;
        }
    }

    if (!StorageTokenService::validateToken($path, $token, $user ? $user->id : null, $isSuperAdmin)) {
        abort(403, 'Akses ditolak: Token storage tidak valid, kadaluarsa, atau Anda tidak berhak mengakses berkas ini.');
    }

    return response()->file($filePath);
})->where('path', '.*')->name('storage.fallback');
