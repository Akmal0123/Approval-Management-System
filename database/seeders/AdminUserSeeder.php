<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create or find Super Admin user
        $superAdmin = DB::table('users')->where('email', 'superadmin@gmail.com')->first();

        if (!$superAdmin) {
            $superAdminId = DB::table('users')->insertGetId([
                'name' => 'Super Administrator',
                'email' => 'superadmin@gmail.com',
                'password' => Hash::make('password123'),
                'pin' => '12345678',
                'email_verified_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } else {
            $superAdminId = $superAdmin->id;
        }

        // Create or update profile
        $existingProfile = DB::table('usersprofiles')->where('user_id', $superAdminId)->first();
        if (!$existingProfile) {
            DB::table('usersprofiles')->insert([
                [
                    'user_id' => $superAdminId,
                    'address' => 'Jl. Super Admin No. 1, Jakarta',
                    'phone_number' => '081234567890',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        // Get IDs for foreign keys
        $superAdminRoleId = DB::table('usersroles')->where('role_name', 'super admin')->first()->id;
        $firstCompanyId = DB::table('companies')->first()->id;
        $firstJabatanId = DB::table('jabatans')->first()->id ?? 1; // fallback if no jabatan exists
        $firstAplikasiId = DB::table('aplikasis')->first()->id ?? 1; // fallback if no aplikasi exists

        // Create or update user auth assignments
        $existingAuth = DB::table('usersauth')->where('user_id', $superAdminId)->first();
        if (!$existingAuth) {
            DB::table('usersauth')->insert([
                [
                    'user_id' => $superAdminId,
                    'role_id' => $superAdminRoleId,
                    'company_id' => $firstCompanyId,
                    'jabatan_id' => $firstJabatanId,
                    'aplikasi_id' => $firstAplikasiId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        } else {
            // Update existing auth record
            DB::table('usersauth')->where('user_id', $superAdminId)->update([
                'role_id' => $superAdminRoleId,
                'company_id' => $firstCompanyId,
                'jabatan_id' => $firstJabatanId,
                'aplikasi_id' => $firstAplikasiId,
                'updated_at' => now(),
            ]);
        }

        $this->command->info('Admin users seeded successfully!');
        $this->command->info("Super Admin: superadmin@example.com / password123");
    }
}
