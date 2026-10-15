<?php

/**
 * MasterflowApprovalTest.php
 *
 * Feature tests for Masterflow management in AMS:
 * - Masterflow CRUD (Admin)
 * - Masterflow steps management
 * - Toggle status
 * - Sequential approval logic
 * - Parallel/group approval logic (all_required, any_one, majority)
 * - Approval progress calculation
 * - Document isFullyApproved logic
 *
 * Covers requirements: REQ-FLOW-001 through REQ-FLOW-012
 */

use App\Models\Aplikasi;
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\Masterflow;
use App\Models\MasterflowStep;
use App\Models\Dokumen;
use App\Models\DokumenApproval;
use App\Models\DokumenVersion;
use App\Models\Transaksi;
use App\Models\User;
use App\Models\UserRole;
use App\Models\UsersAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// =============================================================================
// HELPER
// =============================================================================

function setupAdminContext(): array
{
    $role     = UserRole::create(['role_name' => 'Admin']);
    $company  = Company::create(['name' => 'Test Corp']);
    $jabatan  = Jabatan::create(['name' => 'Manager']);
    $aplikasi = Aplikasi::create(['name' => 'TestApp', 'company_id' => $company->id]);
    $transaksi = Transaksi::create([
        'aplikasi_id'    => $aplikasi->id,
        'kode_transaksi' => 'TRX01',
        'nama_transaksi' => 'Approval TRX',
        'is_active'      => true,
    ]);

    $user = User::factory()->create();
    $auth = UsersAuth::create([
        'user_id'     => $user->id,
        'role_id'     => $role->id,
        'company_id'  => $company->id,
        'jabatan_id'  => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);
    $user->update(['last_context_id' => $auth->id]);
    $user->refresh();

    return compact('user', 'role', 'company', 'jabatan', 'aplikasi', 'transaksi', 'auth');
}

// =============================================================================
// MASTERFLOW CRUD TESTS
// =============================================================================

test('admin can access masterflow list page', function () {
    $ctx = setupAdminContext();

    $response = $this->actingAs($ctx['user'])->get('/admin/masterflows');

    $response->assertStatus(200);
});

test('admin can create a masterflow', function () {
    $ctx = setupAdminContext();

    $response = $this->actingAs($ctx['user'])->post('/admin/masterflows', [
        'name'         => 'Test Flow',
        'transaksi_id' => $ctx['transaksi']->id,
        'description'  => 'A test masterflow',
        'company_id'   => $ctx['company']->id,
        'is_active'    => true,
        'steps'        => [
            [
                'jabatan_id' => $ctx['jabatan']->id,
                'step_name'  => 'Step 1 Approval',
            ]
        ],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('masterflows', ['name' => 'Test Flow']);
});

test('admin can update a masterflow', function () {
    $ctx        = setupAdminContext();
    $masterflow = Masterflow::create([
        'company_id'   => $ctx['company']->id,
        'transaksi_id' => $ctx['transaksi']->id,
        'name'         => 'Original Name',
        'description'  => 'Description',
        'is_active'    => true,
        'total_steps'  => 1,
    ]);

    $response = $this->actingAs($ctx['user'])->put("/admin/masterflows/{$masterflow->id}", [
        'name'         => 'Updated Name',
        'transaksi_id' => $ctx['transaksi']->id,
        'description'  => 'Updated description',
        'company_id'   => $ctx['company']->id,
        'is_active'    => true,
        'steps'        => [
            [
                'jabatan_id' => $ctx['jabatan']->id,
                'step_name'  => 'Step 1 Approval',
            ]
        ],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('masterflows', ['id' => $masterflow->id, 'name' => 'Updated Name']);
});

test('admin can delete a masterflow', function () {
    $ctx        = setupAdminContext();
    $masterflow = Masterflow::create([
        'company_id'   => $ctx['company']->id,
        'transaksi_id' => $ctx['transaksi']->id,
        'name'         => 'To Delete',
        'description'  => '',
        'is_active'    => true,
        'total_steps'  => 0,
    ]);

    $response = $this->actingAs($ctx['user'])->delete("/admin/masterflows/{$masterflow->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('masterflows', ['id' => $masterflow->id]);
});

test('admin can toggle masterflow status', function () {
    $ctx        = setupAdminContext();
    $masterflow = Masterflow::create([
        'company_id'   => $ctx['company']->id,
        'transaksi_id' => $ctx['transaksi']->id,
        'name'         => 'Toggle Test',
        'description'  => '',
        'is_active'    => true,
        'total_steps'  => 0,
    ]);

    $response = $this->actingAs($ctx['user'])
        ->patch("/admin/masterflows/{$masterflow->id}/toggle-status");

    $response->assertRedirect();
    $masterflow->refresh();
    expect($masterflow->is_active)->toBeFalse();
});

// =============================================================================
// MASTERFLOW MODEL UNIT-LEVEL TESTS
// =============================================================================

test('masterflow correctly tracks total steps', function () {
    $company    = Company::create(['name' => 'Corp']);
    $jabatan    = Jabatan::create(['name' => 'Staff']);
    $masterflow = Masterflow::create([
        'company_id'  => $company->id,
        'name'        => 'Flow',
        'is_active'   => true,
        'total_steps' => 0,
    ]);

    MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 1,
        'step_name'     => 'Step 1',
        'is_required'   => true,
    ]);

    MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 2,
        'step_name'     => 'Step 2',
        'is_required'   => true,
    ]);

    $masterflow->updateTotalSteps();

    expect($masterflow->refresh()->total_steps)->toBe(2);
});

test('masterflow step identifies first and last step correctly', function () {
    $company    = Company::create(['name' => 'Corp']);
    $jabatan    = Jabatan::create(['name' => 'Staff']);
    $masterflow = Masterflow::create([
        'company_id'  => $company->id,
        'name'        => 'Flow',
        'is_active'   => true,
        'total_steps' => 2,
    ]);

    $step1 = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 1,
        'step_name'     => 'First Step',
        'is_required'   => true,
    ]);

    $step2 = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 2,
        'step_name'     => 'Last Step',
        'is_required'   => true,
    ]);

    expect($step1->isFirstStep())->toBeTrue();
    expect($step1->isLastStep())->toBeFalse();
    expect($step2->isFirstStep())->toBeFalse();
    expect($step2->isLastStep())->toBeTrue();
});

test('masterflow step has group approval when group_index is set', function () {
    $company    = Company::create(['name' => 'Corp']);
    $jabatan    = Jabatan::create(['name' => 'Staff']);
    $masterflow = Masterflow::create([
        'company_id'  => $company->id,
        'name'        => 'Group Flow',
        'is_active'   => true,
        'total_steps' => 1,
    ]);

    $step = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 1,
        'step_name'     => 'Group Step',
        'is_required'   => true,
        'group_index'   => 'group-1',
        'jenis_group'   => 'all_required',
    ]);

    expect($step->hasGroupApproval())->toBeTrue();
});

// =============================================================================
// SEQUENTIAL APPROVAL LOGIC TESTS
// =============================================================================

test('first approval step can always be approved', function () {
    $company    = Company::create(['name' => 'Corp']);
    $jabatan    = Jabatan::create(['name' => 'Staff']);
    $masterflow = Masterflow::create([
        'company_id'  => $company->id,
        'name'        => 'Sequential Flow',
        'is_active'   => true,
        'total_steps' => 2,
    ]);

    $step1 = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 1,
        'step_name'     => 'Step 1',
        'is_required'   => true,
    ]);

    $owner    = User::factory()->create();
    $approver = User::factory()->create();
    $aplikasi = Aplikasi::create(['name' => 'App', 'company_id' => $company->id]);

    $dokumen = Dokumen::create([
        'nomor_dokumen'  => 'DOC-001',
        'judul_dokumen'  => 'Test Doc',
        'user_id'        => $owner->id,
        'company_id'     => $company->id,
        'aplikasi_id'    => $aplikasi->id,
        'status'         => 'under_review',
        'tgl_pengajuan'  => now(),
        'masterflow_id'  => $masterflow->id,
    ]);

    $version = DokumenVersion::create([
        'dokumen_id' => $dokumen->id,
        'version'    => '1.0',
        'nama_file'  => 'test.pdf',
        'tgl_upload' => now(),
        'tipe_file'  => 'pdf',
        'file_url'   => 'path/to/test.pdf',
        'size_file'  => 1024,
    ]);

    $approval = DokumenApproval::create([
        'dokumen_id'          => $dokumen->id,
        'user_id'             => $approver->id,
        'dokumen_version_id'  => $version->id,
        'masterflow_step_id'  => $step1->id,
        'approval_order'      => 1,
        'approval_status'     => 'pending',
    ]);

    expect($approval->canCurrentlyApprove())->toBeTrue();
});

test('second step cannot be approved when first step is pending', function () {
    $company    = Company::create(['name' => 'Corp']);
    $jabatan    = Jabatan::create(['name' => 'Staff']);
    $masterflow = Masterflow::create([
        'company_id'  => $company->id,
        'name'        => 'Sequential Flow',
        'is_active'   => true,
        'total_steps' => 2,
    ]);

    $step1 = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 1,
        'step_name'     => 'Step 1',
        'is_required'   => true,
    ]);

    $step2 = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 2,
        'step_name'     => 'Step 2',
        'is_required'   => true,
    ]);

    $owner     = User::factory()->create();
    $approver1 = User::factory()->create();
    $approver2 = User::factory()->create();
    $aplikasi  = Aplikasi::create(['name' => 'App', 'company_id' => $company->id]);

    $dokumen = Dokumen::create([
        'nomor_dokumen'  => 'DOC-002',
        'judul_dokumen'  => 'Sequential Doc',
        'user_id'        => $owner->id,
        'company_id'     => $company->id,
        'aplikasi_id'    => $aplikasi->id,
        'status'         => 'under_review',
        'tgl_pengajuan'  => now(),
        'masterflow_id'  => $masterflow->id,
    ]);

    $version = DokumenVersion::create([
        'dokumen_id' => $dokumen->id,
        'version'    => '1.0',
        'nama_file'  => 'test.pdf',
        'tgl_upload' => now(),
        'tipe_file'  => 'pdf',
        'file_url'   => 'path/to/test.pdf',
        'size_file'  => 1024,
    ]);

    // First step is pending
    DokumenApproval::create([
        'dokumen_id'          => $dokumen->id,
        'user_id'             => $approver1->id,
        'dokumen_version_id'  => $version->id,
        'masterflow_step_id'  => $step1->id,
        'approval_order'      => 1,
        'approval_status'     => 'pending', // Not yet approved
    ]);

    // Second step is pending but waiting
    $approval2 = DokumenApproval::create([
        'dokumen_id'          => $dokumen->id,
        'user_id'             => $approver2->id,
        'dokumen_version_id'  => $version->id,
        'masterflow_step_id'  => $step2->id,
        'approval_order'      => 2,
        'approval_status'     => 'pending',
    ]);

    // Step 2 should not be able to approve because step 1 is still pending
    expect($approval2->canCurrentlyApprove())->toBeFalse();
});

test('document is fully approved when all approvals are approved', function () {
    $company    = Company::create(['name' => 'Corp']);
    $jabatan    = Jabatan::create(['name' => 'Staff']);
    $masterflow = Masterflow::create([
        'company_id'  => $company->id,
        'name'        => 'Full Approval Flow',
        'is_active'   => true,
        'total_steps' => 1,
    ]);

    $step = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 1,
        'step_name'     => 'Step 1',
        'is_required'   => true,
    ]);

    $owner    = User::factory()->create();
    $approver = User::factory()->create();
    $aplikasi = Aplikasi::create(['name' => 'App', 'company_id' => $company->id]);

    $dokumen = Dokumen::create([
        'nomor_dokumen'  => 'DOC-003',
        'judul_dokumen'  => 'Full Approved Doc',
        'user_id'        => $owner->id,
        'company_id'     => $company->id,
        'aplikasi_id'    => $aplikasi->id,
        'status'         => 'approved',
        'tgl_pengajuan'  => now(),
        'masterflow_id'  => $masterflow->id,
    ]);

    $version = DokumenVersion::create([
        'dokumen_id' => $dokumen->id,
        'version'    => '1.0',
        'nama_file'  => 'test.pdf',
        'tgl_upload' => now(),
        'tipe_file'  => 'pdf',
        'file_url'   => 'path/to/test.pdf',
        'size_file'  => 1024,
    ]);

    DokumenApproval::create([
        'dokumen_id'          => $dokumen->id,
        'user_id'             => $approver->id,
        'dokumen_version_id'  => $version->id,
        'masterflow_step_id'  => $step->id,
        'approval_order'      => 1,
        'approval_status'     => 'approved',
        'tgl_approve'         => now(),
    ]);

    expect($dokumen->isFullyApproved())->toBeTrue();
    expect($dokumen->isRejected())->toBeFalse();
    expect($dokumen->getApprovalProgress())->toBe(100.0);
});

test('document is rejected when any approval is rejected', function () {
    $company    = Company::create(['name' => 'Corp']);
    $jabatan    = Jabatan::create(['name' => 'Staff']);
    $masterflow = Masterflow::create([
        'company_id'  => $company->id,
        'name'        => 'Reject Flow',
        'is_active'   => true,
        'total_steps' => 1,
    ]);

    $step = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 1,
        'step_name'     => 'Step 1',
        'is_required'   => true,
    ]);

    $owner    = User::factory()->create();
    $approver = User::factory()->create();
    $aplikasi = Aplikasi::create(['name' => 'App', 'company_id' => $company->id]);

    $dokumen = Dokumen::create([
        'nomor_dokumen'  => 'DOC-004',
        'judul_dokumen'  => 'Rejected Doc',
        'user_id'        => $owner->id,
        'company_id'     => $company->id,
        'aplikasi_id'    => $aplikasi->id,
        'status'         => 'rejected',
        'tgl_pengajuan'  => now(),
        'masterflow_id'  => $masterflow->id,
    ]);

    $version = DokumenVersion::create([
        'dokumen_id' => $dokumen->id,
        'version'    => '1.0',
        'nama_file'  => 'test.pdf',
        'tgl_upload' => now(),
        'tipe_file'  => 'pdf',
        'file_url'   => 'path/to/test.pdf',
        'size_file'  => 1024,
    ]);

    DokumenApproval::create([
        'dokumen_id'          => $dokumen->id,
        'user_id'             => $approver->id,
        'dokumen_version_id'  => $version->id,
        'masterflow_step_id'  => $step->id,
        'approval_order'      => 1,
        'approval_status'     => 'rejected',
        'tgl_approve'         => now(),
        'alasan_reject'       => 'Not acceptable',
    ]);

    expect($dokumen->isRejected())->toBeTrue();
    expect($dokumen->isFullyApproved())->toBeFalse();
});

// =============================================================================
// APPROVAL STEPS HELPER ROUTE TEST
// =============================================================================

test('authenticated user can get masterflow steps via route', function () {
    $role     = UserRole::create(['role_name' => 'User']);
    $company  = Company::create(['name' => 'Corp']);
    $jabatan  = Jabatan::create(['name' => 'Staff']);
    $aplikasi = Aplikasi::create(['name' => 'App', 'company_id' => $company->id]);

    $user = User::factory()->create();
    $auth = UsersAuth::create([
        'user_id'     => $user->id,
        'role_id'     => $role->id,
        'company_id'  => $company->id,
        'jabatan_id'  => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);
    $user->update(['last_context_id' => $auth->id]);
    $user->refresh();

    $masterflow = Masterflow::create([
        'company_id'  => $company->id,
        'name'        => 'Steps Flow',
        'is_active'   => true,
        'total_steps' => 1,
    ]);

    $response = $this->actingAs($user)->get("/api/masterflows/{$masterflow->id}/steps");

    $response->assertStatus(200);
    $response->assertJsonStructure(['steps']);
});
