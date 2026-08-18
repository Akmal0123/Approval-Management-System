<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\StorageTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorageTokenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_can_generate_and_validate_storage_token()
    {
        $path = 'dokumen/test_document.pdf';
        $user = User::factory()->create();

        $token = StorageTokenService::generateToken($path, $user->id);

        $this->assertNotEmpty($token);
        $this->assertTrue(StorageTokenService::validateToken($path, $token, $user->id));
    }

    public function test_rejects_invalid_or_tampered_storage_token()
    {
        $path = 'dokumen/test_document.pdf';
        $user = User::factory()->create();

        $token = StorageTokenService::generateToken($path, $user->id);
        $tamperedToken = $token . 'invalid';

        $this->assertFalse(StorageTokenService::validateToken($path, $tamperedToken, $user->id));
        $this->assertFalse(StorageTokenService::validateToken('dokumen/other_file.pdf', $token, $user->id));
    }

    public function test_rejects_user_mismatch_for_storage_token()
    {
        $path = 'dokumen/test_document.pdf';
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $token = StorageTokenService::generateToken($path, $userA->id);

        // User A's token validated by User B should fail
        $this->assertFalse(StorageTokenService::validateToken($path, $token, $userB->id));
    }

    public function test_storage_route_allows_access_with_valid_token()
    {
        $path = 'dokumen/sample.pdf';
        Storage::disk('public')->put($path, 'Sample PDF content');

        $user = User::factory()->create();
        $url = StorageTokenService::generateUrl($path, $user->id);

        $response = $this->actingAs($user)->get($url);

        if ($response->status() !== 200) {
            parse_str(parse_url($url, PHP_URL_QUERY) ?? '', $query);
            $tokenParam = $query['token'] ?? null;
            $isValidDirect = StorageTokenService::validateToken($path, $tokenParam, $user->id);
            $this->fail("Got status " . $response->status() . ". Content: " . substr($response->getContent(), 0, 300) . ". Direct validateToken: " . ($isValidDirect ? 'true' : 'false') . ". TokenParam: " . var_export($tokenParam, true));
        }

        $response->assertStatus(200);
    }

    public function test_storage_route_denies_access_without_token()
    {
        $path = 'dokumen/sample.pdf';
        Storage::disk('public')->put($path, 'Sample PDF content');

        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/storage/' . $path);

        $response->assertStatus(403);
    }

    public function test_storage_route_denies_access_for_unauthorized_user()
    {
        $path = 'dokumen/sample.pdf';
        Storage::disk('public')->put($path, 'Sample PDF content');

        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $url = StorageTokenService::generateUrl($path, $userA->id);

        // User B attempts to access User A's tokenized URL
        $response = $this->actingAs($userB)->get($url);

        $response->assertStatus(403);
    }
}
