<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MasterDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Seed Jabatans
        $jabatans = [
            [
                'id' => 1,
                'name' => 'Direktur Utama',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'name' => 'Direktur',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3,
                'name' => 'Kepala Divisi',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 4,
                'name' => 'Manager',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 5,
                'name' => 'Supervisor',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 6,
                'name' => 'Staff',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($jabatans as $jabatan) {
            DB::table('jabatans')->updateOrInsert(
                ['id' => $jabatan['id']],
                $jabatan
            );
        }

        // Sync sequence in PostgreSQL so subsequent auto-increment inserts don't collide
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("SELECT setval(pg_get_serial_sequence('jabatans', 'id'), coalesce(max(id), 1)) FROM jabatans");
        }
    }
}
