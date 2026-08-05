<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\UsersAuth;

class DebugUserData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'debug:user-data {user_id=1}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Debug user dashboard data';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $userId = $this->argument('user_id');

        $user = User::find($userId);
        if (!$user) {
            $this->error("User with ID {$userId} not found");
            return 1;
        }

        $this->info("Testing UserDashboard Data for User: {$user->name} ({$user->email})");
        $this->line("==============================================");

        // Get user auth data directly
        $userAuth = UsersAuth::with(['company', 'jabatan', 'role'])
            ->where('user_id', $user->id)
            ->first();

        if (!$userAuth) {
            $this->error("No UserAuth found for this user");
            return 1;
        }

        $this->info("UserAuth Data:");
        $this->line("- Company ID: " . ($userAuth->company_id ?? 'null'));
        $this->line("- Jabatan ID: " . ($userAuth->jabatan_id ?? 'null'));
        $this->line("- Role ID: " . ($userAuth->role_id ?? 'null'));

        if ($userAuth->company) {
            $this->line("- Company Object: " . json_encode($userAuth->company->toArray()));
            $this->line("- Company Name: '" . $userAuth->company->nama_company . "'");
        } else {
            $this->line("- Company: null");
        }

        if ($userAuth->jabatan) {
            $this->line("- Jabatan Object: " . json_encode($userAuth->jabatan->toArray()));
            $this->line("- Jabatan Name: '" . $userAuth->jabatan->nama_jabatan . "'");
        } else {
            $this->line("- Jabatan: null");
        }

        if ($userAuth->role) {
            $this->line("- Role Name: " . $userAuth->role->role_name);
        } else {
            $this->line("- Role: null");
        }

        $this->info("\nController Logic Test:");
        $companyName = 'No Company Assigned';
        $jabatanName = 'No Position Assigned';

        if ($userAuth->company) {
            $companyName = $userAuth->company->name;
        }

        if ($userAuth->jabatan) {
            $jabatanName = $userAuth->jabatan->name;
        }

        $this->line("- Final Company Name: $companyName");
        $this->line("- Final Jabatan Name: $jabatanName");

        return 0;
    }
}
