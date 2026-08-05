<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\RevisionLog;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RevisionHistoryController extends Controller
{
    /**
     * Get revision history for a document.
     */
    public function index(Dokumen $dokumen): JsonResponse
    {
        $versions = $dokumen->versions()
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($version) {
                return [
                    'id' => $version->id,
                    'version' => $version->version,
                    'nama_file' => $version->nama_file,
                    'tgl_upload' => $version->tgl_upload,
                    'tipe_file' => $version->tipe_file,
                    'file_url' => $version->file_url,
                    'size_file' => $version->size_file,
                    'status' => $version->status,
                    'created_at' => $version->created_at,
                ];
            });

        $timeline = RevisionLog::where('dokumen_id', $dokumen->id)
            ->with(['user:id,name,email', 'version:id,version'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'action' => $log->action,
                    'action_label' => $log->action_label,
                    'notes' => $log->notes,
                    'changes' => $log->changes,
                    'created_at' => $log->created_at,
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->name,
                    ] : null,
                    'version' => $log->version ? [
                        'id' => $log->version->id,
                        'version' => $log->version->version,
                    ] : null,
                ];
            });

        return response()->json([
            'versions' => $versions,
            'timeline' => $timeline,
        ]);
    }

    /**
     * Compare two versions.
     */
    public function compare(Request $request, Dokumen $dokumen): JsonResponse
    {
        $validated = $request->validate([
            'version_a' => 'required|exists:dokumen_version,id',
            'version_b' => 'required|exists:dokumen_version,id',
        ]);

        $versionA = DokumenVersion::find($validated['version_a']);
        $versionB = DokumenVersion::find($validated['version_b']);

        // Ensure both versions belong to the same document
        if ($versionA->dokumen_id !== $dokumen->id || $versionB->dokumen_id !== $dokumen->id) {
            return response()->json([
                'error' => 'Versions do not belong to this document',
            ], 400);
        }

        return response()->json([
            'version_a' => [
                'id' => $versionA->id,
                'version' => $versionA->version,
                'nama_file' => $versionA->nama_file,
                'tgl_upload' => $versionA->tgl_upload,
                'size_file' => $versionA->size_file,
            ],
            'version_b' => [
                'id' => $versionB->id,
                'version' => $versionB->version,
                'nama_file' => $versionB->nama_file,
                'tgl_upload' => $versionB->tgl_upload,
                'size_file' => $versionB->size_file,
            ],
            'differences' => $this->calculateDifferences($versionA, $versionB),
        ]);
    }

    /**
     * Calculate differences between two versions.
     */
    private function calculateDifferences(DokumenVersion $versionA, DokumenVersion $versionB): array
    {
        $sizeDiff = $versionB->size_file - $versionA->size_file;
        $sizeDiffPercent = $versionA->size_file > 0
            ? round(($sizeDiff / $versionA->size_file) * 100, 2)
            : 0;

        return [
            'file_name_changed' => $versionA->nama_file !== $versionB->nama_file,
            'file_type_changed' => $versionA->tipe_file !== $versionB->tipe_file,
            'size_difference' => $sizeDiff,
            'size_difference_percent' => $sizeDiffPercent,
            'size_increased' => $sizeDiff > 0,
            'time_between' => $versionA->created_at->diffForHumans($versionB->created_at, true),
        ];
    }
}
