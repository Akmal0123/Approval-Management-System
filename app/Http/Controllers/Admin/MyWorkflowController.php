<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Masterflow;
use App\Services\ContextService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class MyWorkflowController extends Controller
{
    public function __construct(
        protected ContextService $contextService
    ) {}

    public function index()
    {
        $context = $this->contextService->getContext();
        $companyId = $context?->company_id;
        $aplikasiId = $context?->aplikasi_id;
        
        $query = Masterflow::with(['company', 'steps.jabatan', 'transaksi.aplikasi'])
            ->where('is_active', true);
            
        if ($companyId) {
            $query->where('company_id', $companyId);
        }

        if ($aplikasiId) {
            $query->whereHas('transaksi', function ($q) use ($aplikasiId) {
                $q->where('aplikasi_id', $aplikasiId);
            });
        }
        
        // Include context user auth
        $userWithAuth = \App\Models\User::with('userAuths.role', 'userAuths.company')
            ->find(Auth::id());

        $masterflows = $query->orderBy('name')->get();

        return Inertia::render('admin/MyWorkflows', [
            'masterflows' => $masterflows,
            'auth' => [
                'user' => $userWithAuth
            ]
        ]);
    }
}
