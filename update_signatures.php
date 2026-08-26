<?php
$file = __DIR__ . '/app/Http/Controllers/SignatureController.php';
$content = file_get_contents($file);

// Replace public with local
$content = str_replace(
    'Storage::disk(\'public\')->put($path, $imageData)',
    'Storage::disk(\'local\')->put($path, $imageData)',
    $content
);
$content = str_replace(
    '$file->storeAs(\'signatures/user_\' . Auth::id(), $filename, \'public\')',
    '$file->storeAs(\'signatures/user_\' . Auth::id(), $filename, \'local\')',
    $content
);

$fileMethod = <<<'PHP'

    /**
     * Get signature file securely
     */
    public function file(Signature $signature)
    {
        // Ensure user owns this signature or is admin
        $contextService = app(\App\Services\ContextService::class);
        if ($signature->user_id !== Auth::id() && !$contextService->isSuperAdmin()) {
             abort(403, 'Unauthorized');
        }

        $path = Storage::disk('local')->path($signature->signature_path);
        
        // Fallback to public if not found (for backwards compatibility)
        if (!file_exists($path)) {
            $path = Storage::disk('public')->path($signature->signature_path);
            if (!file_exists($path)) {
                abort(404, 'Signature file not found');
            }
        }
        
        $mime = mime_content_type($path);
        return response()->file($path, ['Content-Type' => $mime]);
    }
}
PHP;

$content = preg_replace('/}\s*$/', $fileMethod, $content);
file_put_contents($file, $content);
echo 'SignatureController updated.';
