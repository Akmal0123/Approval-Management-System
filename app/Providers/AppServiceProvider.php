<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use App\Models\Dokumen;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Fix Laravel's pluralization issue with "dokumen" -> "dokuman"
        // Explicitly bind the route parameter to the Dokumen model
        Route::bind('dokuman', function ($value) {
            return Dokumen::findOrFail($value);
        });

        // Ensure Tiga Serangkai logo exists in public/images
        $sourceLogo = 'C:/Users/Administrator/.gemini/antigravity-ide/brain/eb48d24b-2149-4d61-9be4-4aa92012bc17/uploaded_media_1786438475137.png';
        $destLogo = public_path('images/logo-tiga-serangkai.png');
        if (file_exists($sourceLogo) && !file_exists($destLogo)) {
            @mkdir(public_path('images'), 0777, true);
            @copy($sourceLogo, $destLogo);
        }
    }
}
