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

            // Pending Approvals - safely check if status column exists
            $pendingApprovals = 0;
            try {
                $pendingApprovals = Dokumen::where('status', 'pending')->count();
            } catch (\Exception $e) {
                // Status column might not exist
            }

            // Total Roles
            $totalRoles = UserRole::count();

            // Total Companies
            $totalCompanies = Company::count();

            // Total Jabatans
            $totalJabatans = Jabatan::count();

            // Total Aplikasis
            $totalAplikasis = Aplikasi::count();

            // Recent Documents (last 10) - very simple without complex relations
            $recentDocuments = [];
            try {
                $recentDocuments = Dokumen::orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get();
            } catch (\Exception $e) {
                // If fails, return empty
            }

            // Document Status Distribution
            $documentsByStatus = [];

            // Approvals by Status
            $approvalsByStatus = [];

            // System Health - default to 100%
            $systemHealth = 100;

            // Calculate storage - default to 0
            $storageDisplay = '0 B';

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
