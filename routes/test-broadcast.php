<?php

use Illuminate\Support\Facades\Route;
use App\Events\UserDokumenUpdated;
use App\Models\Dokumen;

Route::post('/api/test-broadcast', function () {
    $userId = request('user_id', 4);
    $dokumenJudul = request('dokumen_judul', 'Test Dokumen');

    // Ambil dokumen pertama atau buat dummy
    $dokumen = Dokumen::where('user_id', $userId)->first();

    if (!$dokumen) {
        $dokumen = Dokumen::first();
        if ($dokumen) {
            $dokumen->user_id = $userId; // Override user_id untuk testing
        }
    }

    if (!$dokumen) {
        return response()->json([
            'success' => false,
            'message' => 'No dokumen found in database'
        ], 404);
    }

    // Load relations
    $dokumen->load([
        'user',
        'company',
        'aplikasi',
        'masterflow.steps.jabatan',
        'versions',
        'approvals.user.profile',
        'approvals.masterflowStep.jabatan',
    ]);

    // Override judul for testing
    $dokumen->judul_dokumen = $dokumenJudul;

    // Broadcast event
    broadcast(new UserDokumenUpdated($dokumen));

    return response()->json([
        'success' => true,
        'message' => 'Event broadcasted successfully',
        'data' => [
            'channel' => 'user.' . $dokumen->user_id . '.dokumen',
            'event' => 'dokumen.updated',
            'dokumen' => [
                'id' => $dokumen->id,
                'judul_dokumen' => $dokumen->judul_dokumen,
                'user_id' => $dokumen->user_id,
            ]
        ]
    ]);
})->middleware(['web']);
