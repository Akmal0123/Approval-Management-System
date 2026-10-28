<?php

use App\Models\Dokumen;
use App\Models\DokumenVersion;
use App\Models\User;
use App\Models\UserRole;
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\Aplikasi;
use App\Models\UsersAuth;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createTestUserContext(string $roleName = 'User'): array
{
    $role = UserRole::firstOrCreate(['role_name' => $roleName]);
    $company = Company::create(['name' => 'Company ' . uniqid()]);
    $jabatan = Jabatan::create(['name' => 'Jabatan ' . uniqid()]);
    $aplikasi = Aplikasi::create(['name' => 'App ' . uniqid(), 'company_id' => $company->id]);

    $user = User::factory()->create();
    $auth = UsersAuth::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'company_id' => $company->id,
        'jabatan_id' => $jabatan->id,
        'aplikasi_id' => $aplikasi->id,
    ]);
    $user->update(['last_context_id' => $auth->id]);
    $user->refresh();

    return compact('user', 'company', 'jabatan', 'aplikasi', 'auth');
}

test('accessing non-existent document ID returns 404 not found page with custom design', function () {
    $ctx = createTestUserContext('User');

    $response = $this->actingAs($ctx['user'])->get('/dokumen/999999');

    $response->assertStatus(404);
    $response->assertSee('PAGE NOT FOUND');
    $response->assertSee('404');
    $response->assertSee('We looked everywhere for this page');
    $response->assertSee('Go Back Home');
});

test('accessing unauthorized document returns 403 access denied page', function () {
    $ownerCtx = createTestUserContext('User');
    $otherCtx = createTestUserContext('User');

    $dokumen = Dokumen::create([
        'user_id' => $ownerCtx['user']->id,
        'company_id' => $ownerCtx['company']->id,
        'aplikasi_id' => $ownerCtx['aplikasi']->id,
        'nomor_dokumen' => 'DOC-' . uniqid(),
        'judul_dokumen' => 'Confidential Document',
        'status' => 'draft',
        'status_current' => 'draft',
        'tgl_pengajuan' => now(),
    ]);

    // Other user attempts to access owner's document
    $response = $this->actingAs($otherCtx['user'])->get('/dokumen/' . $dokumen->id);

    $response->assertStatus(403);
    $response->assertSee('ACCESS DENIED');
    $response->assertSee('403');
    $response->assertSee('Go Back Home');
});

test('inertia request for non-existent document receives 404 response', function () {
    $ctx = createTestUserContext('User');

    $response = $this->actingAs($ctx['user'])->get('/dokumen/999999', ['X-Inertia' => 'true']);

    $response->assertStatus(404);
});

test('inertia request for unauthorized document receives 403 response', function () {
    $ownerCtx = createTestUserContext('User');
    $otherCtx = createTestUserContext('User');

    $dokumen = Dokumen::create([
        'user_id' => $ownerCtx['user']->id,
        'company_id' => $ownerCtx['company']->id,
        'aplikasi_id' => $ownerCtx['aplikasi']->id,
        'nomor_dokumen' => 'DOC-' . uniqid(),
        'judul_dokumen' => 'Confidential Document',
        'status' => 'draft',
        'status_current' => 'draft',
        'tgl_pengajuan' => now(),
    ]);

    $response = $this->actingAs($otherCtx['user'])->get('/dokumen/' . $dokumen->id, ['X-Inertia' => 'true']);

    $response->assertStatus(403);
});
