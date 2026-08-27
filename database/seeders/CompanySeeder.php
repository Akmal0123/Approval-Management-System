<?php

namespace Database\Seeders;

use App\Models\Company;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CompanySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $companies = [
            [
                'name'         => 'Assalam Hypermarket',
                'address'      => 'Gumpang Lor, Pabelan, Kec. Kartasura, Kabupaten Sukoharjo, Jawa Tengah 57169',
                'phone_number' => '(0271) 354313',
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'name'         => 'Perpus Kita',
                'address'      => 'Gedung Wisma Nusantara Lt. 12, Jl. M.H. Thamrin No. 59, Jakarta Pusat 10350',
                'phone_number' => '(021) 39835000',
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
            [
                'name'         => 'Tisera',
                'address'      => 'Jl. A. Yani No.308, Kerten, Kec. Laweyan, Kota Surakarta, Jawa Tengah 57143',
                'phone_number' => '(0271) 354563',
                'created_at'   => now(),
                'updated_at'   => now(),
            ],
        ];

        foreach ($companies as $company) {
            Company::updateOrCreate(
                ['name' => $company['name']],
                $company
            );
        }

        $this->command->info('Company seeder completed successfully!');
        $this->command->info('Created/Updated ' . count($companies) . ' company records.');
    }
}