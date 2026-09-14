<?php

use App\Models\User;
use App\Models\UserRole;
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\Aplikasi;
use App\Models\Masterflow;
use App\Models\MasterflowStep;
use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\DokumenApproval;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Hash;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('guest can verify signature using public token', function () {
    // 1. Create dependencies
    $role = UserRole::create([
        'role_name' => 'User',
    ]);
    
    $company = Company::create([
        'name' => 'Test Company',
    ]);
    
    $jabatan = Jabatan::create([
        'name' => 'Test Jabatan',
    ]);
    
    $aplikasi = Aplikasi::create([
        'name' => 'Test Aplikasi',
        'company_id' => $company->id,
    ]);

    $masterflow = Masterflow::create([
        'name' => 'Test Flow',
        'company_id' => $company->id,
    ]);

    $masterflowStep = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'step_order' => 1,
        'step_name' => 'Manager Step',
        'role_id' => $role->id,
        'jabatan_id' => $jabatan->id,
    ]);

    // 2. Create users
    $owner = User::create([
        'name' => 'Owner Name',
        'email' => 'owner@example.com',
        'password' => Hash::make('password'),
    ]);

    $approver = User::create([
        'name' => 'Approver Name',
        'email' => 'approver@example.com',
        'password' => Hash::make('password'),
    ]);

    // 3. Create document & version
    $dokumen = Dokumen::create([
        'nomor_dokumen' => 'DOC-2026-001',
        'judul_dokumen' => 'Test Document for QR',
        'status' => 'under_review',
        'tgl_pengajuan' => now(),
        'user_id' => $owner->id,
        'company_id' => $company->id,
        'aplikasi_id' => $aplikasi->id,
        'masterflow_id' => $masterflow->id,
    ]);

    $version = DokumenVersion::create([
        'dokumen_id' => $dokumen->id,
        'version' => '1.0',
        'nama_file' => 'test.pdf',
        'tgl_upload' => now(),
        'tipe_file' => 'pdf',
        'file_url' => 'dokumen/original/test.pdf',
        'size_file' => 1024,
    ]);

    // 4. Create approval with QR signature method & verification token
    $token = Str::uuid()->toString();
    $approval = DokumenApproval::create([
        'dokumen_id' => $dokumen->id,
        'user_id' => $approver->id,
        'dokumen_version_id' => $version->id,
        'masterflow_step_id' => $masterflowStep->id,
        'approval_order' => 1,
        'approval_status' => 'approved',
        'tgl_approve' => now(),
        'signature_method' => 'qr',
        'verification_token' => $token,
    ]);

    // 5. Access the verification endpoint
    $response = $this->get("/verify/signature/{$token}");

    // Assert status 200 and correct Inertia rendering
    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('verify/show')
        ->where('isValid', true)
        ->where('approval.nomor_dokumen', 'DOC-2026-001')
        ->where('approval.judul_dokumen', 'Test Document for QR')
        ->where('approval.approver_name', 'Approver Name')
        ->where('approval.signature_method', 'qr')
    );
});

test('invalid token returns invalid status on verify page', function () {
    $response = $this->get('/verify/signature/non-existent-token');

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('verify/show')
        ->where('isValid', false)
        ->where('approval', null)
    );
});
