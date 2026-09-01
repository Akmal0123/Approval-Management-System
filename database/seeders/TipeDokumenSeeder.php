<?php

namespace Database\Seeders;

use App\Models\TipeDokumen;
use Illuminate\Database\Seeder;

class TipeDokumenSeeder extends Seeder
{
    public function run()
    {
        $tipes = [
            'Dokumen Proposal',
            'Memo',
            'Surat Keterangan',
        ];

        foreach ($tipes as $tipe) {
            TipeDokumen::create(['nama_tipe' => $tipe]);
        }
    }
}
