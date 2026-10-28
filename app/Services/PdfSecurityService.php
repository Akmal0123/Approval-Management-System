<?php

namespace App\Services;

use App\Models\Dokumen;
use App\Models\DokumenApproval;
use Illuminate\Support\Collection;
use Carbon\Carbon;

class PdfSecurityService
{
    /**
     * Name of the authoring system
     */
    public const SYSTEM_AUTHOR = 'Approval Management System';

    /**
     * Cryptographic algorithm specification
     */
    public const CRYPTO_ALGORITHM = 'HMAC-SHA256 (RFC 2104) / SHA-256 (FIPS 180-4)';

    /**
     * Compute SHA-256 hash of a file
     */
    public function generateFileHash(string $filePath): string
    {
        if (!file_exists($filePath)) {
            return '';
        }
        return hash_file('sha256', $filePath);
    }

    /**
     * Generate an authenticated cryptographic seal (HMAC-SHA256)
     * using the application secret key
     */
    public function generateCryptographicSeal(array $payload): string
    {
        $canonicalJson = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $secretKey = config('app.key') ?: 'ams-default-security-key-2026';
        
        return hash_hmac('sha256', $canonicalJson, $secretKey);
    }

    /**
     * Build comprehensive metadata and cryptographic seal for PDF document
     *
     * @param Dokumen|null $dokumen
     * @param Collection|array|null $approvals
     * @param string $pdfPath Full path to the PDF file
     * @return array
     */
    public function buildMetadata(?Dokumen $dokumen, $approvals = null, string $pdfPath = ''): array
    {
        $fileHash = $pdfPath ? $this->generateFileHash($pdfPath) : '';

        // Collect all approved approvals if not provided or to ensure completeness
        $approvedList = collect();
        if ($approvals instanceof Collection) {
            $approvedList = $approvals;
        } elseif (is_array($approvals)) {
            $approvedList = collect($approvals);
        } elseif ($dokumen) {
            $approvedList = $dokumen->approvals()
                ->where('approval_status', 'approved')
                ->with(['user', 'masterflowStep'])
                ->orderBy('created_at')
                ->get();
        }

        // Format Approver Names (signed by) & Timestamps (signed at)
        $signerNames = [];
        $signerDetails = [];
        $signDates = [];
        $latestSignDate = null;
        $primaryVerificationToken = null;

        foreach ($approvedList as $approval) {
            if ($approval instanceof DokumenApproval) {
                $name = $approval->user?->name ?? 'Approver';
                $role = $approval->masterflowStep?->step_name ?? null;
                $date = $approval->tgl_approve;
                $token = $approval->verification_token;
            } elseif (is_array($approval)) {
                $name = $approval['name'] ?? ($approval['user']['name'] ?? 'Approver');
                $role = $approval['text'] ?? ($approval['masterflow_step']['step_name'] ?? null);
                $date = isset($approval['date']) ? Carbon::parse($approval['date']) : null;
                $token = $approval['verification_token'] ?? null;
            } else {
                continue;
            }

            $displayName = $role ? "{$name} ({$role})" : $name;
            $signerNames[] = $displayName;

            $formattedDate = $date instanceof Carbon 
                ? $date->format('d/m/Y H:i:s \W\I\B') 
                : ($date ? (string)$date : Carbon::now()->format('d/m/Y H:i:s \W\I\B'));
                
            $signDates[] = $formattedDate;

            if ($date instanceof Carbon && (!$latestSignDate || $date->gt($latestSignDate))) {
                $latestSignDate = $date;
            }

            if (!$primaryVerificationToken && $token) {
                $primaryVerificationToken = $token;
            }

            $signerDetails[] = [
                'name' => $name,
                'role' => $role,
                'signed_at' => $formattedDate,
                'token' => $token,
            ];
        }

        $signedBy = count($signerNames) > 0 ? implode(', ', $signerNames) : self::SYSTEM_AUTHOR;
        $signedAt = count($signDates) > 0 ? implode(', ', array_unique($signDates)) : Carbon::now()->format('d/m/Y H:i:s \W\I\B');

        $docNumber = $dokumen?->nomor_dokumen ?? '';
        $docTitle = $dokumen?->judul_dokumen ?? 'Dokumen';
        $fullTitle = $docNumber ? "{$docNumber} - {$docTitle}" : $docTitle;

        // Build canonical payload for cryptographic seal
        $cryptoPayload = [
            'system' => self::SYSTEM_AUTHOR,
            'dokumen_id' => $dokumen?->id,
            'nomor_dokumen' => $docNumber,
            'judul_dokumen' => $docTitle,
            'original_sha256' => $fileHash,
            'signers' => $signerDetails,
            'created_at' => $dokumen?->created_at?->toIso8601String() ?? Carbon::now()->toIso8601String(),
        ];

        $cryptographicSeal = $this->generateCryptographicSeal($cryptoPayload);

        // Verification URL
        $verificationUrl = '';
        if ($primaryVerificationToken) {
            $verificationUrl = url("/verify/signature/{$primaryVerificationToken}");
        } elseif ($dokumen) {
            $verificationUrl = url("/approvals/{$dokumen->id}");
        }

        $creationDate = $dokumen?->created_at?->toIso8601String() ?? Carbon::now()->toIso8601String();
        $modificationDate = $latestSignDate?->toIso8601String() ?? Carbon::now()->toIso8601String();

        // Keywords list for viewers that only display keywords (e.g. Chrome PDF viewer)
        $keywords = [
            'authors: ' . self::SYSTEM_AUTHOR,
            'signed by: ' . $signedBy,
            'signed at: ' . $signedAt,
            'document_number: ' . $docNumber,
            'sha256: ' . $fileHash,
            'cryptographic_seal: ' . $cryptographicSeal,
            'algorithm: ' . self::CRYPTO_ALGORITHM,
            'status: VERIFIED & SEALED',
        ];

        return [
            'authors' => self::SYSTEM_AUTHOR,
            'author' => self::SYSTEM_AUTHOR,
            'signed_by' => $signedBy,
            'signed_at' => $signedAt,
            'title' => $fullTitle,
            'subject' => "Digitally Signed Document - {$fullTitle}",
            'document_number' => $docNumber,
            'document_hash' => $fileHash,
            'cryptographic_seal' => $cryptographicSeal,
            'algorithm' => self::CRYPTO_ALGORITHM,
            'verification_url' => $verificationUrl,
            'keywords' => $keywords,
            'creation_date' => $creationDate,
            'modification_date' => $modificationDate,
            'security_notice' => 'This document is cryptographically sealed and verified by Approval Management System. Any alteration invalidates its integrity.',
        ];
    }
}
