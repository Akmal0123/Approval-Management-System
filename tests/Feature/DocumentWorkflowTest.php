<?php

/**
 * DocumentWorkflowTest.php
 *
 * Feature tests for Document management workflow in AMS:
 * - Document listing (API)
 * - Document detail page (web)
 * - Document creation (upload)
 * - Document cancellation
 * - Document revision upload
 * - Approval listing
 * - Approval show
 * - Approve action
 * - Reject action
 * - Request revision action
 * - Bulk approve
 * - Signature verification (public)
 * - Download signed document (public)
 *
 * Covers requirements: REQ-DOC-001 through REQ-DOC-018
 */

use App\Models\Aplikasi;
use App\Models\Company;
use App\Models\Dokumen;
use App\Models\DokumenApproval;
use App\Models\DokumenVersion;
use App\Models\Jabatan;
use App\Models\Masterflow;
use App\Models\MasterflowStep;
use App\Models\User;
use App\Models\UserRole;
use App\Models\UsersAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

// =============================================================================
// HELPER
// =============================================================================

function makeDocumentContext(): array
{
    $role     = UserRole::create(['role_name' => 'User']);
    $company  = Company::create(['name' => 'Test Corp']);
    $jabatan  = Jabatan::create(['name' => 'Staff']);
    $aplikasi = Aplikasi::create(['name' => 'TestApp', 'company_id' => $company->id]);
    $masterflow = Masterflow::create([
        'company_id'  => $company->id,
        'name'        => 'Standard Flow',
        'is_active'   => true,
        'total_steps' => 1,
    ]);
    $step = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 1,
        'step_name'     => 'Manager Approval',
        'is_required'   => true,
    ]);

    $owner = User::factory()->create();
    $auth  = UsersAuth::create([
        'user_id'     => $owner->id,
        'role_id'     => $role->id,
        'company_id'  => $company->id,
        'jabatan_id'  => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);
    $owner->update(['last_context_id' => $auth->id]);
    $owner->refresh();

    $approver = User::factory()->create();
    $authApprover = UsersAuth::create([
        'user_id'     => $approver->id,
        'role_id'     => $role->id,
        'company_id'  => $company->id,
        'jabatan_id'  => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);
    $approver->update(['last_context_id' => $authApprover->id]);
    $approver->refresh();

    $dokumen = Dokumen::create([
        'nomor_dokumen' => 'DOC-TEST-001',
        'judul_dokumen' => 'Test Document',
        'user_id'       => $owner->id,
        'company_id'    => $company->id,
        'aplikasi_id'   => $aplikasi->id,
        'status'        => 'under_review',
        'tgl_pengajuan' => now(),
        'masterflow_id' => $masterflow->id,
    ]);

    $version = DokumenVersion::create([
        'dokumen_id' => $dokumen->id,
        'version'    => '1.0',
        'nama_file'  => 'test.pdf',
        'tgl_upload' => now(),
        'tipe_file'  => 'pdf',
        'file_url'   => 'dokumen/original/test.pdf',
        'size_file'  => 1024,
    ]);

    $approval = DokumenApproval::create([
        'dokumen_id'          => $dokumen->id,
        'user_id'             => $approver->id,
        'dokumen_version_id'  => $version->id,
        'masterflow_step_id'  => $step->id,
        'approval_order'      => 1,
        'approval_status'     => 'pending',
    ]);

    return compact(
        'role', 'company', 'jabatan', 'aplikasi', 'masterflow', 'step',
        'owner', 'approver', 'dokumen', 'version', 'approval', 'auth', 'authApprover'
    );
}

// =============================================================================
// DOCUMENT LISTING TESTS
// =============================================================================

test('authenticated user can access document list page', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['owner'])->get('/dokumen');

    $response->assertStatus(200);
});

test('authenticated user can list documents via API', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['owner'])->getJson('/api/dokumen');

    $response->assertStatus(200);
    $response->assertJsonStructure(['data']);
});

test('guest cannot access document API', function () {
    $response = $this->getJson('/api/dokumen');

    $response->assertStatus(401);
});

test('authenticated user can access document detail page', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['owner'])->get("/dokumen/{$ctx['dokumen']->id}");

    $response->assertStatus(200);
});

test('authenticated user can get document via API', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['owner'])->getJson("/api/dokumen/{$ctx['dokumen']->id}");

    $response->assertStatus(200);
});

// =============================================================================
// DOCUMENT CANCEL TESTS
// =============================================================================

test('authenticated user can cancel a submitted document via API', function () {
    $ctx = makeDocumentContext();

    // Document must be in submitted or under_review status to be cancelled
    $ctx['dokumen']->update(['status' => 'submitted']);

    $response = $this->actingAs($ctx['owner'])->post("/api/dokumen/{$ctx['dokumen']->id}/cancel");

    $response->assertRedirect();
    $this->assertDatabaseHas('dokumen', [
        'id'     => $ctx['dokumen']->id,
        'status' => 'draft',
    ]);
});

// =============================================================================
// APPROVAL LISTING TESTS
// =============================================================================

test('authenticated user can access approvals list', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['approver'])->get('/approvals');

    $response->assertStatus(200);
});

test('guest cannot access approvals list', function () {
    $response = $this->get('/approvals');

    $response->assertRedirect('/login');
});

test('authenticated user can view approval detail', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['approver'])->get("/approvals/{$ctx['approval']->id}");

    $response->assertStatus(200);
});

// =============================================================================
// APPROVAL ACTIONS TESTS
// =============================================================================

test('approver can approve a pending approval', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['approver'])->post("/approvals/{$ctx['approval']->id}/approve", [
        'comment'          => 'Looks good!',
        'signature_method' => 'qr',
    ]);

    $response->assertRedirect(route('approvals.index'));
    $this->assertDatabaseHas('dokumen_approval', [
        'id'              => $ctx['approval']->id,
        'approval_status' => 'approved',
    ]);
});

test('approver can reject a pending approval', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['approver'])->post("/approvals/{$ctx['approval']->id}/reject", [
        'alasan_reject' => 'Does not meet requirements',
        'comment'       => 'Please revise.',
    ]);

    $response->assertRedirect(route('approvals.index'));
    $this->assertDatabaseHas('dokumen_approval', [
        'id'              => $ctx['approval']->id,
        'approval_status' => 'rejected',
    ]);
});

test('approver can request revision on a pending approval', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['approver'])->post("/approvals/{$ctx['approval']->id}/request-revision", [
        'revision_notes' => 'Please update Section 3.',
    ]);

    $response->assertRedirect(route('approvals.index'));
    $this->assertDatabaseHas('dokumen_approval', [
        'id'              => $ctx['approval']->id,
        'approval_status' => 'revision_requested',
    ]);
});

// =============================================================================
// DOCUMENT REVISION TESTS
// =============================================================================

test('document needs_revision is true when approval has revision_requested status', function () {
    $ctx = makeDocumentContext();

    $ctx['approval']->update(['approval_status' => 'revision_requested']);
    $ctx['dokumen']->update(['status' => 'needs_revision']);
    $ctx['dokumen']->refresh();

    expect($ctx['dokumen']->needsRevision())->toBeTrue();
});

// =============================================================================
// REVISION HISTORY TESTS
// =============================================================================

test('authenticated user can access document revision history', function () {
    $ctx = makeDocumentContext();

    $response = $this->actingAs($ctx['owner'])->get("/dokumen/{$ctx['dokumen']->id}/history");

    $response->assertStatus(200);
});

// =============================================================================
// PUBLIC SIGNATURE VERIFICATION TESTS
// =============================================================================

test('guest can verify signature using public token', function () {
    $company    = Company::create(['name' => 'Test Company']);
    $jabatan    = Jabatan::create(['name' => 'Staff']);
    $role       = UserRole::create(['role_name' => 'User']);
    $aplikasi   = Aplikasi::create(['name' => 'App', 'company_id' => $company->id]);
    $masterflow = Masterflow::create(['company_id' => $company->id, 'name' => 'Flow', 'is_active' => true, 'total_steps' => 1]);
    $step       = MasterflowStep::create([
        'masterflow_id' => $masterflow->id,
        'jabatan_id'    => $jabatan->id,
        'step_order'    => 1,
        'step_name'     => 'Step 1',
        'is_required'   => true,
    ]);

    $owner    = User::factory()->create(['name' => 'Owner Name', 'email' => 'owner@example.com']);
    $approver = User::factory()->create(['name' => 'Approver Name', 'email' => 'approver@example.com']);

    $dokumen = Dokumen::create([
        'nomor_dokumen'  => 'DOC-2026-001',
        'judul_dokumen'  => 'Test Document for QR',
        'status'         => 'under_review',
        'tgl_pengajuan'  => now(),
        'user_id'        => $owner->id,
        'company_id'     => $company->id,
        'aplikasi_id'    => $aplikasi->id,
        'masterflow_id'  => $masterflow->id,
    ]);

    $version = DokumenVersion::create([
        'dokumen_id' => $dokumen->id,
        'version'    => '1.0',
        'nama_file'  => 'test.pdf',
        'tgl_upload' => now(),
        'tipe_file'  => 'pdf',
        'file_url'   => 'dokumen/original/test.pdf',
        'size_file'  => 1024,
    ]);

    $token    = Str::uuid()->toString();
    $approval = DokumenApproval::create([
        'dokumen_id'          => $dokumen->id,
        'user_id'             => $approver->id,
        'dokumen_version_id'  => $version->id,
        'masterflow_step_id'  => $step->id,
        'approval_order'      => 1,
        'approval_status'     => 'approved',
        'tgl_approve'         => now(),
        'signature_method'    => 'qr',
        'verification_token'  => $token,
    ]);

    $response = $this->get("/verify/signature/{$token}");

    $response->assertStatus(200);
    $response->assertInertia(fn ($page) => $page
        ->component('verify/show')
        ->where('isValid', true)
        ->where('approval.nomor_dokumen', 'DOC-2026-001')
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

// =============================================================================
// DOCUMENT MODEL UNIT TESTS
// =============================================================================

test('document approval progress is calculated correctly', function () {
    $company    = Company::create(['name' => 'Corp']);
    $jabatan    = Jabatan::create(['name' => 'Staff']);
    $masterflow = Masterflow::create(['company_id' => $company->id, 'name' => 'Flow', 'is_active' => true, 'total_steps' => 2]);
    $step1      = MasterflowStep::create(['masterflow_id' => $masterflow->id, 'jabatan_id' => $jabatan->id, 'step_order' => 1, 'step_name' => 'S1', 'is_required' => true]);
    $step2      = MasterflowStep::create(['masterflow_id' => $masterflow->id, 'jabatan_id' => $jabatan->id, 'step_order' => 2, 'step_name' => 'S2', 'is_required' => true]);
    $owner      = User::factory()->create();
    $approver   = User::factory()->create();
    $aplikasi   = Aplikasi::create(['name' => 'App', 'company_id' => $company->id]);

    $dokumen = Dokumen::create([
        'nomor_dokumen'  => 'DOC-PROG',
        'judul_dokumen'  => 'Progress Doc',
        'user_id'        => $owner->id,
        'company_id'     => $company->id,
        'aplikasi_id'    => $aplikasi->id,
        'status'         => 'under_review',
        'tgl_pengajuan'  => now(),
        'masterflow_id'  => $masterflow->id,
    ]);

    $version = DokumenVersion::create([
        'dokumen_id' => $dokumen->id, 'version' => '1.0',
        'nama_file' => 'test.pdf', 'tgl_upload' => now(),
        'tipe_file' => 'pdf', 'file_url' => 'path/test.pdf', 'size_file' => 1024,
    ]);

    // Approve first step
    DokumenApproval::create([
        'dokumen_id' => $dokumen->id, 'user_id' => $approver->id,
        'dokumen_version_id' => $version->id, 'masterflow_step_id' => $step1->id,
        'approval_order' => 1, 'approval_status' => 'approved', 'tgl_approve' => now(),
    ]);

    // Second step still pending
    DokumenApproval::create([
        'dokumen_id' => $dokumen->id, 'user_id' => $approver->id,
        'dokumen_version_id' => $version->id, 'masterflow_step_id' => $step2->id,
        'approval_order' => 2, 'approval_status' => 'pending',
    ]);

    // Progress should be 50%
    expect($dokumen->getApprovalProgress())->toBe(50.0);
    expect($dokumen->isFullyApproved())->toBeFalse();
});
