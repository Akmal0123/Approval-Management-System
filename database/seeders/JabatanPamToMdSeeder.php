<?php

namespace Database\Seeders;

use App\Models\Aplikasi;
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\UserRole;
use App\Models\UsersAuth;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class JabatanPamToMdSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Data Jabatan dari PAM sampai MD sesuai gambar flow approval
        $jabatanList = [
            'PAM',
            'FAM',
            'GM',
            'DMD',
            'MD',
        ];

        // 2. Data Role, Company, dan Aplikasi sesuai gambar authorization
        $roleName = 'User';
        $companyName = 'PT. Tiga Serangkai Pustaka Mandiri';
        $aplikasiName = 'Tisera';

        // Ambil atau buat Role
        $role = UserRole::firstOrCreate(
            ['role_name' => $roleName],
            ['created_at' => now(), 'updated_at' => now()]
        );

        // Ambil atau buat Company
        $company = Company::firstOrCreate(
            ['name' => $companyName],
            [
                'address' => 'Jl. Prof. DR. Supomo No.23, Sriwedari, Kec. Laweyan, Surakarta, Jawa Tengah 57126',
                'phone_number' => '(0271) 354313',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        // Ambil atau buat Aplikasi
        $aplikasi = Aplikasi::firstOrCreate(
            [
                'name' => $aplikasiName,
                'company_id' => $company->id,
            ],
            [
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        $createdUsers = [];

        foreach ($jabatanList as $jabatanName) {
            // Buat atau dapatkan Jabatan
            $jabatan = Jabatan::firstOrCreate(
                ['name' => $jabatanName],
                ['created_at' => now(), 'updated_at' => now()]
            );

            // Format nama user dan email
            // Contoh email: user.(nama jabatan)@example.com (lowercase)
            $userName = 'User ' . $jabatanName;
            $email = 'user.' . strtolower($jabatanName) . '@example.com';
            $password = 'password123';
            $pin = '12345678';

            // Buat atau update User
            $user = User::firstOrCreate(
                ['email' => $email],
                [
                    'name' => $userName,
                    'password' => Hash::make($password),
                    'pin' => $pin,
                    'email_verified_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Pastikan password tetap sesuai jika user sudah ada sebelumnya
            if (!$user->wasRecentlyCreated) {
                $user->update([
                    'name' => $userName,
                    'password' => Hash::make($password),
                    'pin' => $pin,
                ]);
            }

            // Buat atau update Profil User
            UserProfile::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'address' => 'Jl. Prof. DR. Supomo No.23, Surakarta',
                    'phone_number' => '08' . rand(1111111111, 9999999999),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Buat atau update UserAuth (Role, Company, Jabatan, Aplikasi)
            $userAuth = UsersAuth::firstOrCreate(
                [
                    'user_id' => $user->id,
                    'role_id' => $role->id,
                    'company_id' => $company->id,
                    'jabatan_id' => $jabatan->id,
                    'aplikasi_id' => $aplikasi->id,
                ],
                [
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            // Set last_context_id agar context aktif langsung tersedia saat login
            $user->update(['last_context_id' => $userAuth->id]);

            $createdUsers[] = [
                'Name' => $userName,
                'Email' => $email,
                'Password' => $password,
                'Role' => $role->role_name,
                'Jabatan' => $jabatan->name,
                'Company' => $company->name,
                'Aplikasi' => $aplikasi->name,
            ];
        }

        $this->command->newLine();
        $this->command->info('================================================================');
        $this->command->info(' Seeder Jabatan (PAM - MD) & Akun User Berhasil Dijalankan!');
        $this->command->info('================================================================');
        $this->command->table(
            ['Name', 'Email', 'Password', 'Role', 'Jabatan', 'Company', 'Aplikasi'],
            $createdUsers
        );
        $this->command->info('Default PIN: 12345678');
        $this->command->newLine();
    }
}
