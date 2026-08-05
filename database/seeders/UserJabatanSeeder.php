<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserJabatanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Creates 2 users per jabatan:
     * - 1 Admin user
     * - 1 Regular user
     * 
     * Total: 12 users (6 jabatan x 2 users)
     */
    public function run(): void
    {
        // Get role IDs
        $adminRoleId = DB::table('usersroles')->where('role_name', 'Admin')->first()->id;
        $userRoleId = DB::table('usersroles')->where('role_name', 'User')->first()->id;

        // Get first company and aplikasi for default assignment
        $firstCompanyId = DB::table('companies')->first()->id;
        $firstAplikasiId = DB::table('aplikasis')->first()->id;

        // Get all jabatans
        $jabatans = DB::table('jabatans')->get();

        // Define user templates per jabatan
        $userTemplates = [
            'Direktur Utama' => [
                ['name' => 'Admin Direktur Utama', 'email' => 'admin.dirut@example.com', 'role' => 'admin'],
                ['name' => 'User Direktur Utama', 'email' => 'user.dirut@example.com', 'role' => 'user'],
            ],
            'Direktur' => [
                ['name' => 'Admin Direktur', 'email' => 'admin.direktur@example.com', 'role' => 'admin'],
                ['name' => 'User Direktur', 'email' => 'user.direktur@example.com', 'role' => 'user'],
            ],
            'Kepala Divisi' => [
                ['name' => 'Admin Kepala Divisi', 'email' => 'admin.kadiv@example.com', 'role' => 'admin'],
                ['name' => 'User Kepala Divisi', 'email' => 'user.kadiv@example.com', 'role' => 'user'],
            ],
            'Manager' => [
                ['name' => 'Admin Manager', 'email' => 'admin.manager@example.com', 'role' => 'admin'],
                ['name' => 'User Manager', 'email' => 'user.manager@example.com', 'role' => 'user'],
            ],
            'Supervisor' => [
                ['name' => 'Admin Supervisor', 'email' => 'admin.supervisor@example.com', 'role' => 'admin'],
                ['name' => 'User Supervisor', 'email' => 'user.supervisor@example.com', 'role' => 'user'],
            ],
            'Staff' => [
                ['name' => 'Admin Staff', 'email' => 'admin.staff@example.com', 'role' => 'admin'],
                ['name' => 'User Staff', 'email' => 'user.staff@example.com', 'role' => 'user'],
            ],
        ];

        $createdUsers = [];

        foreach ($jabatans as $jabatan) {
            if (!isset($userTemplates[$jabatan->name])) {
                continue;
            }

            foreach ($userTemplates[$jabatan->name] as $template) {
                // Check if user already exists
                $existingUser = DB::table('users')->where('email', $template['email'])->first();

                if ($existingUser) {
                    $this->command->info("User {$template['email']} already exists, skipping...");
                    continue;
                }

                // Create user
                $userId = DB::table('users')->insertGetId([
                    'name' => $template['name'],
                    'email' => $template['email'],
                    'password' => Hash::make('password123'),
                    'pin' => '12345678',
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Create user profile
                DB::table('usersprofiles')->insert([
                    'user_id' => $userId,
                    'address' => 'Jl. ' . $template['name'] . ' No. 1, Jakarta',
                    'phone_number' => '08' . rand(1000000000, 9999999999),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                // Create user auth (role assignment)
                $roleId = $template['role'] === 'admin' ? $adminRoleId : $userRoleId;
                DB::table('usersauth')->insert([
                    'user_id' => $userId,
                    'role_id' => $roleId,
                    'company_id' => $firstCompanyId,
                    'jabatan_id' => $jabatan->id,
                    'aplikasi_id' => $firstAplikasiId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                $createdUsers[] = [
                    'email' => $template['email'],
                    'jabatan' => $jabatan->name,
                    'role' => $template['role'],
                ];

                $this->command->info("Created user: {$template['name']} ({$template['email']}) - {$jabatan->name} - " . ucfirst($template['role']));
            }
        }

        $this->command->newLine();
        $this->command->info('===========================================');
        $this->command->info('User Jabatan Seeder completed!');
        $this->command->info('===========================================');
        $this->command->info('Total users created: ' . count($createdUsers));
        $this->command->info('Default password: password123');
        $this->command->info('Default PIN: 12345678');
        $this->command->newLine();

        // Display created users summary
        $this->command->table(
            ['Email', 'Jabatan', 'Role'],
            $createdUsers
        );
    }
}
