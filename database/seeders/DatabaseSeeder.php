<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed in correct order due to foreign key dependencies
        $this->call([
            UsersRolesSeeder::class,    // 1. Seed roles first
            CompanySeeder::class,       // 2. Seed companies
            AplikasiSeeder::class,      // 3. Seed aplikasis (depends on companies)
            MasterDataSeeder::class,    // 4. Seed jabatans, other master data
            // MasterflowSeeder::class,    // 5. Seed masterflows (depends on companies & jabatans)
            AdminUserSeeder::class,     // 6. Seed admin users with complete data
        ]);

        // Optional: Create additional test users
        // User::factory(10)->create();
    }
}
