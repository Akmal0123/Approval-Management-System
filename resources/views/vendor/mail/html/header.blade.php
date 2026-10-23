@props(['url', 'message' => null])
<tr>
<td class="header" align="center" style="padding: 24px 20px 12px 20px; text-align: center;">
<a href="{{ $url }}" style="display: inline-block; text-decoration: none;">
@php
    $msg = $message ?? ($__env->getShared()['message'] ?? null);

    // Check if company has custom logo
    $companyObj = $company ?? ($dokumen->company ?? ($__env->getShared()['dokumen']->company ?? null));
    $logoFile = null;

    if ($companyObj && !empty($companyObj->logo)) {
        $potentialPath = public_path('storage/' . ltrim($companyObj->logo, '/'));
        if (file_exists($potentialPath)) {
            $logoFile = $potentialPath;
        }
    }

    if (!$logoFile) {
        $logoFile = public_path('images/tiga-serangkai-logo.png');
        if (!file_exists($logoFile)) {
            $logoFile = public_path('tspm-logo.png');
        }
    }

    $companyName = $companyObj?->name ?? 'Tiga Serangkai';
    $logoSrc = null;

    if ($logoFile && file_exists($logoFile)) {
        if ($msg && method_exists($msg, 'embed')) {
            $logoSrc = $msg->embed($logoFile);
        } else {
            $mime = mime_content_type($logoFile) ?: 'image/png';
            $logoSrc = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($logoFile));
        }
    }
@endphp
@if ($logoSrc)
    <img src="{{ $logoSrc }}" class="logo" alt="{{ $companyName }}" style="height: 50px; width: auto; max-width: 180px; display: block; margin: 0 auto; object-fit: contain;">
@else
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 24px; font-weight: 800; color: #0f766e; letter-spacing: -0.5px;">
        {{ strtoupper($companyName) }}
    </div>
@endif
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 6px;">
    Approval Management System
</div>
</a>
</td>
</tr>
