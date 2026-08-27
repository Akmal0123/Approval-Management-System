<?php

namespace Database\Seeders;

use App\Models\Aplikasi;
use App\Models\Company;
use Illuminate\Database\Seeder;

class AplikasiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $assalam = Company::where('name', 'Assalam Hypermarket')->first();
        $perpus  = Company::where('name', 'Perpus Kita')->first();
        $tisera  = Company::where('name', 'Tisera')->first();

        $aplikasis = [
            [
                'nama_aplikasi'        => 'Assalam Hypermarket',
                'transaksi_management' => 'PO (Purchase Order)',
                'company_id'           => $assalam?->id,
            ],
            [
                'nama_aplikasi'        => 'Perpus Kita',
                'transaksi_management' => 'Internal Memo',
                'company_id'           => $perpus?->id,
            ],
            [
                'nama_aplikasi'        => 'Tisera',
                'transaksi_management' => 'PR (Purchase Requisition)',
                'company_id'           => $tisera?->id,
            ],
        ];

        foreach ($aplikasis as $aplikasi) {
            Aplikasi::updateOrCreate(
                ['nama_aplikasi' => $aplikasi['nama_aplikasi']],
                [
                    'transaksi_management' => $aplikasi['transaksi_management'],
                    'company_id'           => $aplikasi['company_id'],
                    'created_at'           => now(),
                    'updated_at'           => now(),
                ]
            );
        }

        $this->command->info('Aplikasi seeder completed successfully!');
    }
}