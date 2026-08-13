<?php

namespace Database\Seeders;

use App\Models\Aplikasi;
use App\Models\Company;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AplikasiSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get existing companies from seeder
        $companies = Company::whereIn('name', [
            'PT. Digital Approval Indonesia',
            'PT. K33 Distribusi',
            'PT. Assalaam Niaga Utama'
        ])->get();

        if ($companies->isEmpty()) {
            $this->command->error('No companies found! Please run CompanySeeder first.');
            return;
        }

        $aplikasis = [
            [
                'name' => 'DocuFlow Engine',
                'company_id' => $companies->where('name', 'PT. Digital Approval Indonesia')->first()?->id ?? $companies->first()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Approval Portal',
                'company_id' => $companies->where('name', 'PT. Digital Approval Indonesia')->first()?->id ?? $companies->first()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Assalaam Hypermarket',
                'company_id' => $companies->where('name', 'PT. Assalaam Niaga Utama')->first()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($aplikasis as $aplikasi) {
            Aplikasi::firstOrCreate(
                [
                    'name' => $aplikasi['name'],
                    'company_id' => $aplikasi['company_id']
                ],
                $aplikasi
            );
        }

        $this->command->info('Aplikasi seeder completed successfully!');
        $this->command->info('Created 3 aplikasi records across 3 companies.');
    }
}
