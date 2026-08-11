<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Dokumen;
use App\Models\UserRole;
use App\Models\Company;
use App\Models\Jabatan;
use App\Models\Aplikasi;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    /**
     * Get Super Admin Dashboard Statistics
     */
    public function superAdminStats()
    {
        try {
            // Total Users
            $totalUsers = User::count();

            // Total Documents
            $totalDocuments = Dokumen::count();

            // Pending Approvals - count pending approval records
            $pendingApprovals = \App\Models\DokumenApproval::where('approval_status', 'pending')->count();
            if ($pendingApprovals === 0) {
                $pendingApprovals = Dokumen::whereIn('status', ['submitted', 'under_review'])->count();
            }

            // Total Roles
            $totalRoles = UserRole::count();

            // Total Companies
            $totalCompanies = Company::count();

            // Total Jabatans
            $totalJabatans = Jabatan::count();

            // Total Aplikasis
            $totalAplikasis = Aplikasi::count();

            // Recent Documents (last 10) with user and version relations
            $recentDocuments = [];
            try {
                $recentDocuments = Dokumen::with(['user', 'latestVersion', 'masterflow'])
                    ->orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get();
            } catch (\Exception $e) {
                Log::warning('Failed to load recent documents: ' . $e->getMessage());
            }

            // Document Status Distribution
            $documentsByStatus = [
                'draft' => Dokumen::where('status', 'draft')->count(),
                'submitted' => Dokumen::whereIn('status', ['submitted', 'under_review'])->count(),
                'approved' => Dokumen::where('status', 'approved')->count(),
                'rejected' => Dokumen::where('status', 'rejected')->count(),
            ];

            // Approvals by Status
            $approvalsByStatus = [
                'pending' => \App\Models\DokumenApproval::where('approval_status', 'pending')->count(),
                'approved' => \App\Models\DokumenApproval::where('approval_status', 'approved')->count(),
                'rejected' => \App\Models\DokumenApproval::where('approval_status', 'rejected')->count(),
            ];

            // System Health - default to 100%
            $systemHealth = 100;

            // Calculate storage - calculate sum of file sizes
            $totalSizeBytes = \App\Models\DokumenVersion::sum('size_file');
            if ($totalSizeBytes > 1073741824) {
                $storageDisplay = number_format($totalSizeBytes / 1073741824, 2) . ' GB';
            } else if ($totalSizeBytes > 1048576) {
                $storageDisplay = number_format($totalSizeBytes / 1048576, 2) . ' MB';
            } else if ($totalSizeBytes > 1024) {
                $storageDisplay = number_format($totalSizeBytes / 1024, 2) . ' KB';
            } else {
                $storageDisplay = $totalSizeBytes . ' B';
            }

            return response()->json([
                'stats' => [
                    'total_users' => $totalUsers,
                    'total_documents' => $totalDocuments,
                    'pending_approvals' => $pendingApprovals,
                    'system_health' => $systemHealth,
                    'total_storage' => $storageDisplay,
                    'total_roles' => $totalRoles,
                    'total_companies' => $totalCompanies,
                    'total_jabatans' => $totalJabatans,
                    'total_aplikasis' => $totalAplikasis,
                ],
                'recent_documents' => $recentDocuments,
                'charts' => [
                    'documents_by_status' => $documentsByStatus,
                    'approvals_by_status' => $approvalsByStatus,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Dashboard stats error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'message' => 'Failed to fetch dashboard statistics',
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ], 500);
        }
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes($bytes, $precision = 2)
    {
        if ($bytes == 0) return '0 B';

        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $pow = floor(log($bytes) / log(1024));
        $pow = min($pow, count($units) - 1);

        $bytes /= pow(1024, $pow);

        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
