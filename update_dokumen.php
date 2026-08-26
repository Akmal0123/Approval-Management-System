<?php
$file = __DIR__ . '/app/Http/Controllers/DokumenController.php';
$content = file_get_contents($file);

// Replace public with local
$content = str_replace(
    'path = $file->storeAs($folderPath, $filename, \'public\')',
    'path = $file->storeAs($folderPath, $filename, \'local\')',
    $content
);
$content = str_replace(
    'Storage::disk(\'public\')',
    'Storage::disk(\'local\')',
    $content
);

// Add auth checks to download
$downloadMethodStart = '    public function download(Dokumen $dokumen, $versionId = null, PdfSignatureService $pdfSignatureService)' . "\n" . '    {' . "\n" . '        $version = $versionId' . "\n" . '            ? $dokumen->versions()->findOrFail($versionId)' . "\n" . '            : $dokumen->latestVersion;' . "\n\n" . '        if (!$version) {' . "\n" . '            return back()->withErrors([\'error\' => \'Versi dokumen tidak ditemukan.\']);' . "\n" . '        }';

$downloadMethodWithCheck = $downloadMethodStart . "\n\n" . '        if (!$this->canAccessDokumen($dokumen)) {' . "\n" . '            abort(403, \'Anda tidak memiliki akses ke dokumen ini.\');' . "\n" . '        }';

$content = str_replace($downloadMethodStart, $downloadMethodWithCheck, $content);

// Add auth checks to streamSignedPdf
$streamMethodStart = '    public function streamSignedPdf(Dokumen $dokumen, PdfSignatureService $pdfSignatureService, $versionId = null)' . "\n" . '    {' . "\n" . '        $version = $versionId' . "\n" . '            ? $dokumen->versions()->findOrFail($versionId)' . "\n" . '            : $dokumen->latestVersion;' . "\n\n" . '        if (!$version) {' . "\n" . '            abort(404, \'Versi dokumen tidak ditemukan.\');' . "\n" . '        }';

$streamMethodWithCheck = $streamMethodStart . "\n\n" . '        if (!$this->canAccessDokumen($dokumen)) {' . "\n" . '            abort(403, \'Anda tidak memiliki akses ke dokumen ini.\');' . "\n" . '        }';

$content = str_replace($streamMethodStart, $streamMethodWithCheck, $content);

$authMethod = <<<'PHP'

    /**
     * Check if user has access to view/download this document
     */
    private function canAccessDokumen(\App\Models\Dokumen $dokumen)
    {
        if ($this->contextService->isSuperAdmin()) {
            return true;
        }

        $userId = \Illuminate\Support\Facades\Auth::id();
        
        // Is creator?
        if ($dokumen->user_id === $userId) {
            return true;
        }

        // Is approver?
        $isApprover = $dokumen->approvals()->where('user_id', $userId)->exists();
        if ($isApprover) {
            return true;
        }
        
        // Or Admin in the same context
        $context = $this->contextService->getContext();
        if ($context && $context->role && strtolower($context->role->role_name) === 'admin') {
            if ($dokumen->company_id === $context->company_id && $dokumen->aplikasi_id === $context->aplikasi_id) {
                return true;
            }
        }

        return false;
    }
}
PHP;

$content = preg_replace('/}\s*$/', $authMethod, $content);
file_put_contents($file, $content);
echo 'DokumenController updated.';
