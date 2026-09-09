<?php

namespace App\Http\Controllers;

use App\Services\JwtService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * Controller ini merepresentasikan simulasi Server Aplikasi Luar (Mock ERP / Tisera API).
 * Meniru alur otentikasi JWT dan pengambilan dokumen menggunakan ID + Token.
 */
class MockExternalApiController extends Controller
{
    protected JwtService $jwtService;

    public function __construct(JwtService $jwtService)
    {
        $this->jwtService = $jwtService;
    }

    /**
     * Data master dokumen mock yang tersimpan di server luar.
     */
    private function getMockDocuments(): array
    {
        return [
            'DOC-RQE-22001433' => [
                'id' => 'DOC-RQE-22001433',
                'nomor_dokumen' => 'RQE-22001433/100000',
                'judul' => 'Pengadaan Printer Epson L3250 Operasional BO Kediri - MDC Solo TD',
                'nominal' => '2850000',
                'tanggal' => '2026-07-07',
                'template_file' => 'RQE-22001433',
            ],
            'DOC-RQE-22001434' => [
                'id' => 'DOC-RQE-22001434',
                'nomor_dokumen' => 'RQE-22001434/100000',
                'judul' => 'Pengadaan Kertas HVS SiDU A4 Surat Jalan & Faktur - MDC Solo TD',
                'nominal' => '2500000',
                'tanggal' => '2026-08-01',
                'template_file' => 'RQE-22001434',
            ],
            'DOC-RQE-22001435' => [
                'id' => 'DOC-RQE-22001435',
                'nomor_dokumen' => 'RQE-22001435/100000',
                'judul' => 'Pengadaan Barcode Scanner Honeywell Wireless - Gudang TD Yogya',
                'nominal' => '4200000',
                'tanggal' => '2026-08-15',
                'template_file' => 'RQE-22001435',
            ],
            'DOC-POE-22005020' => [
                'id' => 'DOC-POE-22005020',
                'nomor_dokumen' => 'POE-22005020/100000',
                'judul' => 'PO GRENGSENG Basa Jawa SMP 7, 8, 9 - MEDIA KARYA PUTRA. CV',
                'nominal' => '9446640',
                'tanggal' => '2026-08-10',
                'template_file' => 'POE-22005020',
            ],
            'DOC-POE-22005021' => [
                'id' => 'DOC-POE-22005021',
                'nomor_dokumen' => 'POE-22005021/100000',
                'judul' => 'PO Buku Siswa SMP Kurikulum Merdeka - PT Tiga Serangkai Pustaka Mandiri',
                'nominal' => '19425000',
                'tanggal' => '2026-08-12',
                'template_file' => 'POE-22005021',
            ],
            'DOC-POE-22005022' => [
                'id' => 'DOC-POE-22005022',
                'nomor_dokumen' => 'POE-22005022/100000',
                'judul' => 'PO Cetak Continuous Form Faktur & Surat Jalan 3-Ply - PT Wangsa Jatra Lestari',
                'nominal' => '12250000',
                'tanggal' => '2026-08-20',
                'template_file' => 'POE-22005022',
            ],
            'DOC-CCA-00000002' => [
                'id' => 'DOC-CCA-00000002',
                'nomor_dokumen' => 'CCA-00000002/110303',
                'judul' => 'Meja Siswa Kayu Jati SD NEGERI 22 MURANTE - UD Kembang Jati (Cab. Pare-Pare)',
                'nominal' => '9000000',
                'tanggal' => '2026-08-08',
                'template_file' => 'CCA-00000002',
            ],
            'DOC-CCA-00000003' => [
                'id' => 'DOC-CCA-00000003',
                'nomor_dokumen' => 'CCA-00000003/110303',
                'judul' => 'Pengadaan Kursi Siswa SMPN 1 Enrekang - CV Meubel Jati Indah (Cab. Pare-Pare)',
                'nominal' => '10000000',
                'tanggal' => '2026-08-15',
                'template_file' => 'CCA-00000003',
            ],
            'DOC-CCA-00000004' => [
                'id' => 'DOC-CCA-00000004',
                'nomor_dokumen' => 'CCA-00000004/100000',
                'judul' => 'Paket Modul Muatan Lokal Budaya Solo - Dinas Pendidikan Kota Surakarta',
                'nominal' => '25000000',
                'tanggal' => '2026-08-25',
                'template_file' => 'CCA-00000004',
            ],
            'DOC-PO-991' => [
                'id' => 'DOC-PO-991',
                'nomor_dokumen' => 'PO-991',
                'judul' => 'Pembelian Kertas A4 - Kebutuhan Kantor',
                'nominal' => '4500000',
                'tanggal' => '2026-09-01',
                'template_file' => null,
            ],
        ];
    }

    /**
     * 1. ENDPOINT: Create Token (Generate JWT)
     * POST /api/mock-external/oauth/token
     */
    public function issueToken(Request $request): JsonResponse
    {
        $apiKey = $request->input('api_key') ?? $request->header('X-API-KEY');
        $apiSecret = $request->input('api_secret') ?? $request->header('X-API-SECRET');

        $expectedKey = config('services.external_api.key', 'tisera_app_key_2026');
        $expectedSecret = config('services.external_api.secret', 'tisera_jwt_secret_key_secure_approval_2026');

        if ($apiKey !== $expectedKey || $apiSecret !== $expectedSecret) {
            return response()->json([
                'status' => 'error',
                'message' => 'Autentikasi Gagal: API Key atau API Secret eksternal tidak valid.'
            ], 401);
        }

        // Buat payload JWT
        $payload = [
            'iss' => 'External-ERP-Tisera',
            'aud' => 'Approval-Management-System',
            'sub' => $apiKey,
            'client_name' => 'PT Tiga Serangkai AMS Client',
        ];

        $token = $this->jwtService->encode($payload, $expectedSecret, 3600); // Masa berlaku 1 jam

        return response()->json([
            'status' => 'success',
            'token_type' => 'Bearer',
            'access_token' => $token,
            'expires_in' => 3600,
            'created_at' => now()->toIso8601String()
        ]);
    }

    /**
     * Helper verifikasi Authorization: Bearer <token>
     */
    private function verifyBearerToken(Request $request): ?JsonResponse
    {
        $authHeader = $request->header('Authorization');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Akses ditolak. Header "Authorization: Bearer <JWT_TOKEN>" diperlukan.'
            ], 401);
        }

        $token = substr($authHeader, 7);
        $expectedSecret = config('services.external_api.secret', 'tisera_jwt_secret_key_secure_approval_2026');
        $decoded = $this->jwtService->decode($token, $expectedSecret);

        if (!$decoded) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized: Token JWT eksternal tidak valid atau telah kadaluwarsa.'
            ], 401);
        }

        return null;
    }

    /**
     * 2. ENDPOINT: Lookup Dokumen (Wajib Header Bearer JWT)
     * GET /api/mock-external/documents/lookup?keyword=...
     */
    public function lookup(Request $request): JsonResponse
    {
        // Proteksi token JWT
        if ($authError = $this->verifyBearerToken($request)) {
            return $authError;
        }

        $keyword = trim((string) $request->query('keyword', ''));
        if (empty($keyword)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Parameter keyword diperlukan.'
            ], 400);
        }

        $documents = $this->getMockDocuments();
        $matched = null;

        foreach ($documents as $doc) {
            if (
                stripos($doc['id'], $keyword) !== false ||
                stripos($doc['nomor_dokumen'], $keyword) !== false ||
                stripos($doc['judul'], $keyword) !== false
            ) {
                $matched = $doc;
                break;
            }
        }

        if (!$matched) {
            return response()->json([
                'status' => 'error',
                'message' => "Dokumen dengan kata kunci '{$keyword}' tidak ditemukan di sistem eksternal."
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Dokumen ditemukan di sistem eksternal.',
            'data' => [
                'document_id' => $matched['id'], // <- ID didapat di sini!
                'nomor_dokumen' => $matched['nomor_dokumen'],
                'judul' => $matched['judul'],
            ]
        ]);
    }

    /**
     * 3. ENDPOINT: Get Dokumen by ID (Wajib Header Bearer JWT)
     * GET /api/mock-external/documents/{id}/detail
     * Sesuai arahan mentor: "get dokumen, dapat id, ditambah token"
     */
    public function getDocumentDetail(Request $request, string $id): JsonResponse
    {
        // Proteksi token JWT
        if ($authError = $this->verifyBearerToken($request)) {
            return $authError;
        }

        $documents = $this->getMockDocuments();

        if (!isset($documents[$id])) {
            return response()->json([
                'status' => 'error',
                'message' => "Dokumen dengan ID '{$id}' tidak ditemukan di sistem eksternal."
            ], 404);
        }

        $doc = $documents[$id];

        // Ambil file PDF template asli
        $pdfBase64 = $this->loadPdfBase64($doc['template_file']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'document_id' => $doc['id'],
                'nomor_dokumen' => $doc['nomor_dokumen'],
                'judul' => $doc['judul'],
                'nominal' => $doc['nominal'],
                'tanggal' => $doc['tanggal'],
                'pdf_base64' => $pdfBase64,
            ]
        ]);
    }

    private function loadPdfBase64(?string $templateFile): string
    {
        if ($templateFile) {
            $path = storage_path("app/dummy_templates/{$templateFile}.pdf");
            if (file_exists($path)) {
                return base64_encode(file_get_contents($path));
            }
        }

        // Fallback default PDF
        return 'JVBERi0xLjQKJcOkw7zDtsO5CjEgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+CmVuZG9iagoyIDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL1Jlc291cmNlcyA0IDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUuMjggODQxLjg5XSAvQ29udGVudHMgNSAwIFIgPj4KZW5kb2JqCjQgMCBvYmoKPDwgL0ZvbnQgPDwgL0YxIDYgMCBSID4+ID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggNDQgPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRkCihUZXN0IFBERiBmcm9tIEFQSSkgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago2IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwNjAgMDAwMDAgbiAKMDAwMDAwMDExNyAwMDAwMCBuIAowMDAwMDAwMjI0IDAwMDAwIG4gCjAwMDAwMDAwMjY4IDAwMDAwIG4gCjAwMDAwMDAzNjIgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA3IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo0NTEKJSVFT0YK';
    }
}
