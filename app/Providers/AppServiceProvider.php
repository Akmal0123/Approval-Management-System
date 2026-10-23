<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\View;
use App\Models\Dokumen;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Custom Vite resolver for local network & localhost access
        $this->app->singleton(\Illuminate\Foundation\Vite::class, function () {
            return new class extends \Illuminate\Foundation\Vite {
                protected function hotAsset($asset)
                {
                    $url = rtrim(file_get_contents($this->hotFile()));
                    try {
                        $requestHost = request()->hasHeader('host') ? request()->getHost() : null;
                    } catch (\Throwable) {
                        $requestHost = null;
                    }

                    if ($requestHost) {
                        $parsed = parse_url($url);
                        $port = isset($parsed['port']) ? ':' . $parsed['port'] : ':5173';
                        $scheme = $parsed['scheme'] ?? 'http';
                        return "{$scheme}://{$requestHost}{$port}/{$asset}";
                    }

                    return $url . '/' . $asset;
                }
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Share $message variable across email components for inline CID embeds
        View::composer('*', function ($view) {
            if ($view->offsetExists('message')) {
                View::share('message', $view->offsetGet('message'));
            }
        });

        // Fix Laravel's pluralization issue with "dokumen" -> "dokuman"
        // Explicitly bind the route parameter to the Dokumen model
        Route::bind('dokuman', function ($value) {
            return Dokumen::findOrFail($value);
        });
    }
}
