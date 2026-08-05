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
                'name' => 'PT. Tiga Serangkai Pustaka Mandiri',
                'address' => 'Jl. Prof. DR. Supomo No.23, Sriwedari, Kec. Laweyan, Surakarta, Jawa Tengah 57126',
                'phone_number' => '(0271) 354313',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'PT. K33 Distribusi',
                'address' => 'Gumpang Lor, Pabelan, Kec. Kartasura, Kabupaten Sukoharjo, Jawa Tengah 57169',
                'phone_number' => '(0271) 354313',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'PT. Assalaam Niaga Utama',
                'address' => 'Jl. A. Yani No.308, Kerten, Kec. Laweyan, Kota Surakarta, Jawa Tengah 57143',
                'phone_number' => '(0271) 354563',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($companies as $company) {
            Company::firstOrCreate(
                ['name' => $company['name']],
                $company
            );
        }

        $this->command->info('Company seeder completed successfully!');
        $this->command->info('Created 3 company records.');
    }
}
