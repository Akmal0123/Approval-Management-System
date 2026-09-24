<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Tymon\JWTAuth\Facades\JWTAuth;

class ApiDocsController extends Controller
{
    /**
     * Render Scalar API Documentation & Testing Console
     */
    public function scalar(): Response
    {
        $html = <<<'HTML'
<!doctype html>
<html lang="id">
  <head>
    <title>Approval Management System (AMS) — API Documentation & Testing</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234f46e5'><path d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'/></svg>">
    <style>
      body { margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; }
      .quick-bar {
        background: #1e1b4b;
        color: #e0e7ff;
        padding: 8px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        border-bottom: 1px solid #312e81;
      }
      .quick-bar a {
        color: #a5b4fc;
        text-decoration: none;
        font-weight: 500;
        margin-left: 12px;
      }
      .quick-bar a:hover {
        text-decoration: underline;
      }
      .badge {
        background: #4338ca;
        color: #ffffff;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <div class="quick-bar">
      <div>
        <span class="badge">AMS PORT 8000</span>
        <strong style="margin-left: 8px;">Approval Management System API</strong>
      </div>
      <div>
        <a href="/api/dev/tokens" target="_blank">🔑 Get Test Tokens & Credentials</a>
        <a href="/swagger">Swagger UI View</a>
        <a href="http://localhost:5000/docs/hub" target="_blank">🌐 Unified API Hub</a>
        <a href="http://localhost:5000/docs" target="_blank">Fastify Docs (:5000)</a>
        <a href="http://localhost:9000/docs" target="_blank">EIS Docs (:9000)</a>
      </div>
    </div>
    <script
      id="api-reference"
      data-url="/docs/openapi.json"
      data-configuration='{
        "theme": "indigo",
        "darkMode": true,
        "searchHotKey": "k",
        "metaData": {
          "title": "AMS API Reference"
        }
      }'>
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>
HTML;

        return response($html, 200, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    /**
     * Render Swagger UI alternative
     */
    public function swagger(): Response
    {
        $html = <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Approval Management System — Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui.css" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234f46e5'><path d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'/></svg>">
  <style>
    body { margin: 0; background: #fafafa; font-family: sans-serif; }
    .top-nav {
      background: #1e1b4b;
      color: #fff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
    }
    .top-nav a { color: #a5b4fc; text-decoration: none; margin-left: 15px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="top-nav">
    <div><strong>Approval Management System (AMS)</strong> &mdash; Swagger UI</div>
    <div>
      <a href="/docs">Scalar Docs</a>
      <a href="/api/dev/tokens" target="_blank">🔑 Get Test Tokens</a>
      <a href="http://localhost:5000/docs/hub" target="_blank">🌐 Unified API Hub</a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.18.2/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/docs/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>
HTML;

        return response($html, 200, ['Content-Type' => 'text/html; charset=utf-8']);
    }

    /**
     * Return OpenAPI 3.1 specification for AMS
     */
    public function openapi(): JsonResponse
    {
        $spec = [
            'openapi' => '3.1.0',
            'info' => [
                'title' => 'Approval Management System (AMS) API',
                'version' => '1.0.0',
                'description' => "
### Approval Management System (AMS) REST API Reference

Sistem persetujuan dokumen perusahaan terintegrasi (**Tiga Serangkai**) yang mencakup manajemen dokumen, alur approval bertingkat (*masterflow*), delegasi, riwayat revisi dokumen, pembubuhan tanda tangan digital (digital signature PDF), serta integrasi data dengan Fastify & External Inventory System (EIS).

#### Metode Otentikasi:
1. **Sanctum Token / Session Auth** — Digunakan oleh antarmuka web SPA. Endpoint: `POST /api/login`.
2. **JWT Auth** — Digunakan untuk integrasi sistem eksternal atau service-to-service. Endpoint: `POST /api/auth/jwt/login`.
3. **Boundary JWT A** — Token rahasia yang diterbitkan AMS saat memanggil Fastify Integration Service (`FASTIFY_JWT_SECRET`).
                ",
            ],
            'servers' => [
                ['url' => 'http://localhost:8000', 'description' => 'Local AMS Server (Port 8000)'],
            ],
            'tags' => [
                ['name' => 'Sanctum Authentication', 'description' => 'Login & Register untuk Web SPA'],
                ['name' => 'JWT Authentication', 'description' => 'Login, Refresh & Profil untuk Integrasi Eksternal'],
                ['name' => 'Document Management', 'description' => 'Pembuatan, pencarian, dan pengelolaan berkas dokumen'],
                ['name' => 'Approval Workflow', 'description' => 'Persetujuan, penolakan, delegasi, dan revisi approval'],
                ['name' => 'Master Data Management', 'description' => 'Kelola Perusahaan, Jabatan, Role, Aplikasi, dan Transaksi'],
                ['name' => 'v1 External API', 'description' => 'Endpoint eksternal yang diproteksi JWT'],
                ['name' => 'Dev Helpers', 'description' => 'Token & Credential Generators'],
            ],
            'paths' => [
                '/api/dev/tokens' => [
                    'get' => [
                        'tags' => ['Dev Helpers'],
                        'summary' => 'Ambil Kredensial Testing & Generate JWT Token',
                        'description' => 'Menghasilkan token JWT siap pakai untuk testing endpoint AMS dan Fastify tanpa perlu login manual.',
                        'responses' => ['200' => ['description' => 'Token berhasil digenerate']],
                    ],
                ],
                '/api/login' => [
                    'post' => [
                        'tags' => ['Sanctum Authentication'],
                        'summary' => 'Login Pengguna (Sanctum SPA)',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['email', 'password'],
                                        'properties' => [
                                            'email' => ['type' => 'string', 'example' => 'superadmin@gmail.com'],
                                            'password' => ['type' => 'string', 'example' => 'password123'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => [
                            '200' => ['description' => 'Login berhasil, token Sanctum dikembalikan'],
                            '401' => ['description' => 'Email atau password salah'],
                        ],
                    ],
                ],
                '/api/register' => [
                    'post' => [
                        'tags' => ['Sanctum Authentication'],
                        'summary' => 'Registrasi Akun Baru',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['name', 'email', 'password', 'password_confirmation'],
                                        'properties' => [
                                            'name' => ['type' => 'string', 'example' => 'John Doe'],
                                            'email' => ['type' => 'string', 'example' => 'john@example.com'],
                                            'password' => ['type' => 'string', 'example' => 'password123'],
                                            'password_confirmation' => ['type' => 'string', 'example' => 'password123'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['200' => ['description' => 'Registrasi berhasil']],
                    ],
                ],
                '/api/user' => [
                    'get' => [
                        'tags' => ['Sanctum Authentication'],
                        'summary' => 'Ambil Data Profil User yang Sedang Login',
                        'security' => [['SanctumAuth' => []]],
                        'responses' => ['200' => ['description' => 'Data user aktif']],
                    ],
                ],
                '/api/auth/jwt/login' => [
                    'post' => [
                        'tags' => ['JWT Authentication'],
                        'summary' => 'Login via JWT untuk Integrasi Eksternal',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['email', 'password'],
                                        'properties' => [
                                            'email' => ['type' => 'string', 'example' => 'superadmin@gmail.com'],
                                            'password' => ['type' => 'string', 'example' => 'password123'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['200' => ['description' => 'Token JWT dikembalikan']],
                    ],
                ],
                '/api/auth/jwt/me' => [
                    'get' => [
                        'tags' => ['JWT Authentication'],
                        'summary' => 'Ambil Data Akun dari Bearer JWT',
                        'security' => [['JwtAuth' => []]],
                        'responses' => ['200' => ['description' => 'Profil pengguna']],
                    ],
                ],
                '/api/dokumen' => [
                    'get' => [
                        'tags' => ['Document Management'],
                        'summary' => 'Daftar Dokumen Pengajuan',
                        'security' => [['SanctumAuth' => []]],
                        'parameters' => [
                            ['name' => 'status', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string']],
                            ['name' => 'search', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string']],
                            ['name' => 'my_documents', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'boolean']],
                        ],
                        'responses' => ['200' => ['description' => 'Daftar dokumen berhasil diambil']],
                    ],
                    'post' => [
                        'tags' => ['Document Management'],
                        'summary' => 'Buat Dokumen Pengajuan Baru',
                        'security' => [['SanctumAuth' => []]],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'multipart/form-data' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['nomor_dokumen', 'judul_dokumen', 'tgl_pengajuan', 'tgl_deadline', 'file', 'submit_type', 'masterflow_id'],
                                        'properties' => [
                                            'nomor_dokumen' => ['type' => 'string', 'example' => 'DOC/2026/09/001'],
                                            'judul_dokumen' => ['type' => 'string', 'example' => 'Pengajuan Pengadaan Komputer Workstation'],
                                            'tgl_pengajuan' => ['type' => 'string', 'format' => 'date', 'example' => '2026-09-24'],
                                            'tgl_deadline' => ['type' => 'string', 'format' => 'date', 'example' => '2026-09-30'],
                                            'deskripsi' => ['type' => 'string', 'example' => 'Pengadaan unit kerja dev'],
                                            'file' => ['type' => 'string', 'format' => 'binary'],
                                            'submit_type' => ['type' => 'string', 'enum' => ['draft', 'submit'], 'example' => 'draft'],
                                            'masterflow_id' => ['type' => 'integer', 'example' => 1],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['201' => ['description' => 'Dokumen berhasil dibuat']],
                    ],
                ],
                '/api/dokumen/lookup-external' => [
                    'post' => [
                        'tags' => ['Document Management'],
                        'summary' => 'Tarik Data Dokumen dari Fastify Integration Service',
                        'description' => 'Memanggil Fastify Integration Service untuk menarik data PO/PR dari EIS ke dalam form pembuatan dokumen AMS.',
                        'security' => [['SanctumAuth' => []]],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['keyword'],
                                        'properties' => [
                                            'keyword' => ['type' => 'string', 'example' => 'PO-2026-0001'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['200' => ['description' => 'Data eksternal berhasil ditarik']],
                    ],
                ],
                '/api/dokumen/lookup-external-suggestions' => [
                    'get' => [
                        'tags' => ['Document Management'],
                        'summary' => 'Autocomplete Dokumen Eksternal (PO & PR)',
                        'security' => [['SanctumAuth' => []]],
                        'parameters' => [
                            ['name' => 'q', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'example' => '2026']],
                        ],
                        'responses' => ['200' => ['description' => 'Daftar saran dokumen']],
                    ],
                ],
                '/approvals' => [
                    'get' => [
                        'tags' => ['Approval Workflow'],
                        'summary' => 'Daftar Dokumen yang Menunggu Persetujuan Pengguna',
                        'security' => [['SanctumAuth' => []]],
                        'parameters' => [
                            ['name' => 'status', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'string', 'enum' => ['pending', 'approved', 'rejected', 'history']]],
                            ['name' => 'overdue', 'in' => 'query', 'required' => false, 'schema' => ['type' => 'boolean']],
                        ],
                        'responses' => ['200' => ['description' => 'Daftar approval task']],
                    ],
                ],
                '/approvals/{approval}/approve' => [
                    'post' => [
                        'tags' => ['Approval Workflow'],
                        'summary' => 'Setujui Dokumen (Approve Step)',
                        'security' => [['SanctumAuth' => []]],
                        'parameters' => [
                            ['name' => 'approval', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']],
                        ],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['signature'],
                                        'properties' => [
                                            'signature' => ['type' => 'string', 'description' => 'Base64 image signature atau URL path', 'example' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...'],
                                            'comment' => ['type' => 'string', 'example' => 'Disetujui untuk diproses'],
                                            'signature_position' => ['type' => 'string', 'enum' => ['bottom_right', 'bottom_left', 'bottom_center'], 'example' => 'bottom_right'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['200' => ['description' => 'Approval berhasil']],
                    ],
                ],
                '/approvals/{approval}/reject' => [
                    'post' => [
                        'tags' => ['Approval Workflow'],
                        'summary' => 'Tolak Dokumen (Reject Step)',
                        'security' => [['SanctumAuth' => []]],
                        'parameters' => [
                            ['name' => 'approval', 'in' => 'path', 'required' => true, 'schema' => ['type' => 'integer']],
                        ],
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['alasan_reject'],
                                        'properties' => [
                                            'alasan_reject' => ['type' => 'string', 'example' => 'Budget belum disetujui manajemen'],
                                            'comment' => ['type' => 'string'],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['200' => ['description' => 'Dokumen ditolak']],
                    ],
                ],
                '/api/v1/dokumen' => [
                    'get' => [
                        'tags' => ['v1 External API'],
                        'summary' => 'Daftar Dokumen via JWT Eksternal',
                        'security' => [['JwtAuth' => []]],
                        'responses' => ['200' => ['description' => 'Daftar dokumen']],
                    ],
                ],
                '/api/v1/user/statistics' => [
                    'get' => [
                        'tags' => ['v1 External API'],
                        'summary' => 'Statistik Approval User via JWT Eksternal',
                        'security' => [['JwtAuth' => []]],
                        'responses' => ['200' => ['description' => 'Statistik approval user']],
                    ],
                ],
                '/api/companies' => [
                    'get' => [
                        'tags' => ['Master Data Management'],
                        'summary' => 'Daftar Entitas Perusahaan',
                        'security' => [['SanctumAuth' => []]],
                        'responses' => ['200' => ['description' => 'Daftar perusahaan']],
                    ],
                ],
                '/api/masterflows' => [
                    'get' => [
                        'tags' => ['Master Data Management'],
                        'summary' => 'Daftar Masterflow Alur Persetujuan',
                        'security' => [['SanctumAuth' => []]],
                        'responses' => ['200' => ['description' => 'Daftar masterflow']],
                    ],
                ],
            ],
            'components' => [
                'securitySchemes' => [
                    'SanctumAuth' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                        'description' => 'Bearer token dari endpoint POST /api/login.',
                    ],
                    'JwtAuth' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                        'bearerFormat' => 'JWT',
                        'description' => 'Bearer JWT token dari endpoint POST /api/auth/jwt/login atau dari /api/dev/tokens.',
                    ],
                ],
            ],
        ];

        return response()->json($spec, 200, ['Content-Type' => 'application/json; charset=utf-8'], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    }

    /**
     * Generate dev tokens & test credentials
     */
    public function tokens(): JsonResponse
    {
        $superAdmin = DB::table('users')->where('email', 'superadmin@gmail.com')->first();
        $jwtToken = null;

        if ($superAdmin) {
            try {
                $userModel = \App\Models\User::find($superAdmin->id);
                if ($userModel) {
                    $jwtToken = JWTAuth::fromUser($userModel);
                }
            } catch (\Throwable $e) {
                // fallback if JWTAuth fails
            }
        }

        // Generate JWT A (AMS -> Fastify)
        $fastifySecret = env('FASTIFY_JWT_SECRET', 'ams-fastify-secret-key-super-secure-token-a');
        $fastifyIssuer = env('FASTIFY_JWT_ISSUER', 'ams');
        $fastifyAudience = env('FASTIFY_JWT_AUDIENCE', 'integration-service');

        $header = ['alg' => 'HS256', 'typ' => 'JWT'];
        $now = time();
        $payload = [
            'iss' => $fastifyIssuer,
            'aud' => $fastifyAudience,
            'sub' => 'ams-service',
            'scope' => ['integration:purchase-order:read', 'integration:purchase-request:read'],
            'iat' => $now,
            'exp' => $now + 86400,
        ];

        $b64Header = $this->base64UrlEncode(json_encode($header));
        $b64Payload = $this->base64UrlEncode(json_encode($payload));
        $sig = hash_hmac('sha256', "{$b64Header}.{$b64Payload}", $fastifySecret, true);
        $jwtA = "{$b64Header}.{$b64Payload}." . $this->base64UrlEncode($sig);

        return response()->json([
            'success' => true,
            'message' => 'Kredensial dan token pengujian AMS berhasil disiapkan.',
            'generated_at' => date('c'),
            'default_test_account' => [
                'name' => 'Super Administrator',
                'email' => 'superadmin@gmail.com',
                'password' => 'password123',
                'login_sanctum_url' => 'POST http://localhost:8000/api/login',
                'login_jwt_url' => 'POST http://localhost:8000/api/auth/jwt/login',
            ],
            'ams_external_jwt_token' => [
                'description' => 'Token JWT untuk mengakses endpoint /api/v1/... di AMS',
                'token' => $jwtToken,
                'header' => $jwtToken ? "Authorization: Bearer {$jwtToken}" : 'N/A',
            ],
            'jwt_a_ams_to_fastify' => [
                'description' => 'Token JWT A yang digunakan AMS saat memanggil Fastify Integration Service (Port 5000)',
                'token' => $jwtA,
                'scopes' => $payload['scope'],
                'header' => "Authorization: Bearer {$jwtA}",
            ],
        ]);
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
