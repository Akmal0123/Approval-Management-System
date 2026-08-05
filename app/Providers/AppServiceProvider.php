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
    }
}
