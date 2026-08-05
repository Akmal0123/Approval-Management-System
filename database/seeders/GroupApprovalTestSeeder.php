<?php

namespace Database\Seeders;

use App\Models\Masterflow;
use App\Models\MasterflowStep;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeder untuk testing Group Approval feature
 * 
 * Run dengan: php artisan db:seed --class=GroupApprovalTestSeeder
 */
class GroupApprovalTestSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get company_id from first user
        $user = User::first();
        if (!$user || !$user->userAuths->first()) {
            $this->command->error('❌ No user found with company access. Please run AdminUserSeeder first.');
            return;
        }

        $companyId = $user->userAuths->first()->company_id;

        // ========================================
        // Test Masterflow 1: All Required
        // ========================================
        $masterflow1 = Masterflow::create([
            'company_id' => $companyId,
            'name' => '[TEST] Budget Approval - All Required',
            'description' => 'Test masterflow dengan group approval type: all_required. Semua approver dalam group harus menyetujui.',
            'is_active' => true,
            'total_steps' => 1,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflow1->id,
            'jabatan_id' => 3, // Assuming jabatan_id 3 exists (Finance)
            'step_order' => 1,
            'step_name' => 'Finance Leadership Review',
            'description' => 'CFO dan Finance Manager harus approve semua',
            'is_required' => true,
            'group_index' => 'test_all_required_finance',
            'jenis_group' => 'all_required',
            'users_in_group' => $this->getUserIdsByRole(2), // Get 2 users
        ]);

        $this->command->info("✅ Created: {$masterflow1->name}");

        // ========================================
        // Test Masterflow 2: Any One
        // ========================================
        $masterflow2 = Masterflow::create([
            'company_id' => $companyId,
            'name' => '[TEST] Quick Approval - Any One',
            'description' => 'Test masterflow dengan group approval type: any_one. Salah satu approver saja yang approve sudah cukup.',
            'is_active' => true,
            'total_steps' => 1,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflow2->id,
            'jabatan_id' => 2, // Assuming jabatan_id 2 exists (Manager)
            'step_order' => 1,
            'step_name' => 'On-Duty Manager Approval',
            'description' => 'Salah satu dari shift manager yang approve',
            'is_required' => true,
            'group_index' => 'test_any_one_managers',
            'jenis_group' => 'any_one',
            'users_in_group' => $this->getUserIdsByRole(3), // Get 3 users
        ]);

        $this->command->info("✅ Created: {$masterflow2->name}");

        // ========================================
        // Test Masterflow 3: Majority
        // ========================================
        $masterflow3 = Masterflow::create([
            'company_id' => $companyId,
            'name' => '[TEST] Committee Decision - Majority',
            'description' => 'Test masterflow dengan group approval type: majority. Lebih dari 50% approver harus menyetujui.',
            'is_active' => true,
            'total_steps' => 1,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflow3->id,
            'jabatan_id' => 4, // Assuming jabatan_id 4 exists (Committee)
            'step_order' => 1,
            'step_name' => 'Board Committee Voting',
            'description' => 'Mayoritas committee members harus approve',
            'is_required' => true,
            'group_index' => 'test_majority_committee',
            'jenis_group' => 'majority',
            'users_in_group' => $this->getUserIdsByRole(5), // Get 5 users
        ]);

        $this->command->info("✅ Created: {$masterflow3->name}");

        // ========================================
        // Test Masterflow 4: Multi-Step Mixed
        // ========================================
        $masterflow4 = Masterflow::create([
            'company_id' => $companyId,
            'name' => '[TEST] Complex Approval - Multi-Step',
            'description' => 'Test masterflow dengan multiple steps menggunakan berbagai group types.',
            'is_active' => true,
            'total_steps' => 3,
        ]);

        // Step 1: Any One (Quick approval by managers)
        MasterflowStep::create([
            'masterflow_id' => $masterflow4->id,
            'jabatan_id' => 2,
            'step_order' => 1,
            'step_name' => 'Initial Manager Review',
            'description' => 'Salah satu manager review awal',
            'is_required' => true,
            'group_index' => 'test_multi_step1_managers',
            'jenis_group' => 'any_one',
            'users_in_group' => $this->getUserIdsByRole(3),
        ]);

        // Step 2: All Required (Finance must all approve)
        MasterflowStep::create([
            'masterflow_id' => $masterflow4->id,
            'jabatan_id' => 3,
            'step_order' => 2,
            'step_name' => 'Finance Team Approval',
            'description' => 'Semua finance team harus approve',
            'is_required' => true,
            'group_index' => 'test_multi_step2_finance',
            'jenis_group' => 'all_required',
            'users_in_group' => $this->getUserIdsByRole(2),
        ]);

        // Step 3: Majority (Final committee vote)
        MasterflowStep::create([
            'masterflow_id' => $masterflow4->id,
            'jabatan_id' => 4,
            'step_order' => 3,
            'step_name' => 'Final Committee Vote',
            'description' => 'Mayoritas committee harus approve',
            'is_required' => true,
            'group_index' => 'test_multi_step3_committee',
            'jenis_group' => 'majority',
            'users_in_group' => $this->getUserIdsByRole(5),
        ]);

        $this->command->info("✅ Created: {$masterflow4->name}");

        // ========================================
        // Test Masterflow 5: Regular + Group Mixed
        // ========================================
        $masterflow5 = Masterflow::create([
            'company_id' => $companyId,
            'name' => '[TEST] Hybrid Approval - Regular + Group',
            'description' => 'Test masterflow dengan kombinasi regular approval (single approver) dan group approval.',
            'is_active' => true,
            'total_steps' => 2,
        ]);

        // Step 1: Regular approval (no group)
        MasterflowStep::create([
            'masterflow_id' => $masterflow5->id,
            'jabatan_id' => 1, // Supervisor
            'step_order' => 1,
            'step_name' => 'Supervisor Approval',
            'description' => 'Single supervisor approval (no group)',
            'is_required' => true,
            'group_index' => null,
            'jenis_group' => null,
            'users_in_group' => null,
        ]);

        // Step 2: Group approval
        MasterflowStep::create([
            'masterflow_id' => $masterflow5->id,
            'jabatan_id' => 3,
            'step_order' => 2,
            'step_name' => 'Finance Team Group Approval',
            'description' => 'Group approval dari finance team',
            'is_required' => true,
            'group_index' => 'test_hybrid_finance',
            'jenis_group' => 'all_required',
            'users_in_group' => $this->getUserIdsByRole(2),
        ]);

        $this->command->info("✅ Created: {$masterflow5->name}");

        // Summary
        $this->command->newLine();
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->info('🎉 Group Approval Test Data Created!');
        $this->command->info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        $this->command->newLine();
        $this->command->table(
            ['ID', 'Name', 'Steps', 'Type'],
            [
                [$masterflow1->id, $masterflow1->name, 1, 'All Required'],
                [$masterflow2->id, $masterflow2->name, 1, 'Any One'],
                [$masterflow3->id, $masterflow3->name, 1, 'Majority'],
                [$masterflow4->id, $masterflow4->name, 3, 'Multi-Step Mixed'],
                [$masterflow5->id, $masterflow5->name, 2, 'Regular + Group'],
            ]
        );
        $this->command->newLine();
        $this->command->info('📝 Next Steps:');
        $this->command->info('1. Upload dokumen menggunakan salah satu masterflow di atas');
        $this->command->info('2. System akan auto-create approval records dengan group info');
        $this->command->info('3. Test approval flow dengan ApprovalGroupValidator service');
        $this->command->newLine();
    }

    /**
     * Helper: Get user IDs by count
     * 
     * @param int $count
     * @return array
     */
    private function getUserIdsByRole(int $count): array
    {
        $users = User::take($count)->pluck('id')->toArray();

        if (count($users) < $count) {
            $this->command->warn("⚠️  Warning: Only found " . count($users) . " users, needed {$count}");
        }

        return $users;
    }
}
