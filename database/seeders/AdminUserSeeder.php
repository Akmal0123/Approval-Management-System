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

        // Get IDs for foreign keys (case-insensitive for PostgreSQL compatibility)
        $superAdminRole = DB::table('usersroles')
            ->whereRaw('LOWER(role_name) = ?', ['super admin'])
            ->first();
        $superAdminRoleId = $superAdminRole?->id ?? DB::table('usersroles')->first()?->id ?? 1;

        $firstCompanyId = DB::table('companies')->first()?->id ?? 1;
        $firstJabatanId = DB::table('jabatans')->first()?->id ?? 1; // fallback if no jabatan exists
        $firstAplikasiId = DB::table('aplikasis')->first()?->id ?? 1; // fallback if no aplikasi exists

        // Create or update user auth assignments
        $existingAuth = DB::table('usersauth')->where('user_id', $superAdminId)->first();
        if (!$existingAuth) {
            $authId = DB::table('usersauth')->insertGetId([
                'user_id' => $superAdminId,
                'role_id' => $superAdminRoleId,
                'company_id' => $firstCompanyId,
                'jabatan_id' => $firstJabatanId,
                'aplikasi_id' => $firstAplikasiId,
                'created_at' => now(),
                'updated_at' => now(),
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
            $authId = $existingAuth->id;
        }

        // Set last_context_id on user if column exists
        if ($authId && \Illuminate\Support\Facades\Schema::hasColumn('users', 'last_context_id')) {
            DB::table('users')->where('id', $superAdminId)->update(['last_context_id' => $authId]);
        }

        $this->command->info('Admin users seeded successfully!');
        $this->command->info("Super Admin: superadmin@example.com / password123");
    }
}
