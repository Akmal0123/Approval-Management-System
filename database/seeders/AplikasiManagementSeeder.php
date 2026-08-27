<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;
use App\Models\AplikasiManagement;

class AplikasiManagementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Nonaktifkan foreign key checks (kompatibel untuk MySQL & PostgreSQL)
        Schema::disableForeignKeyConstraints();

        // 2. Kosongkan tabel menggunakan Model Eloquent
        AplikasiManagement::truncate();

        // 3. Aktifkan kembali foreign key checks
        Schema::enableForeignKeyConstraints();

        // 4. Masukkan data dummy aplikasi menggunakan Eloquent Model
        $aplikasis = [
            ['nama_aplikasi' => 'Curious Fashion'],
            ['nama_aplikasi' => 'Holding Unit'],
        ];

        foreach ($aplikasis as $aplikasi) {
            AplikasiManagement::create($aplikasi);
        }
    }
}