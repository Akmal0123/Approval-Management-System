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
            TransaksiSeeder::class,     // 4. Seed transaksis (depends on aplikasis)
            MasterDataSeeder::class,    // 5. Seed jabatans, other master data
            // MasterflowSeeder::class,    // 6. Seed masterflows (depends on companies & jabatans)
            AdminUserSeeder::class,     // 7. Seed admin users with complete data
            JabatanPamToMdSeeder::class, // 8. Seed PAM to MD jabatans and user accounts
        ]);

        // Optional: Create additional test users
        // User::factory(10)->create();
    }
}
