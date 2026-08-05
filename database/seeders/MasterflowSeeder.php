<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Masterflow;
use App\Models\MasterflowStep;
use App\Models\Jabatan;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class MasterflowSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Pastikan ada company terlebih dahulu
        $companyA = Company::firstOrCreate(['name' => 'PT. Contoh A']);
        $companyB = Company::firstOrCreate(['name' => 'PT. Contoh B']);

        // Pastikan ada jabatan terlebih dahulu
        $supervisor = Jabatan::firstOrCreate(['name' => 'Supervisor']);
        $manager = Jabatan::firstOrCreate(['name' => 'Manager']);
        $kepalaDivisi = Jabatan::firstOrCreate(['name' => 'Kepala Divisi']);
        $direktur = Jabatan::firstOrCreate(['name' => 'Direktur']);

        // === MASTERFLOW UNTUK COMPANY A ===

        // Buat Masterflow Level 1 untuk Company A (3 Tingkat)
        $masterflow1A = Masterflow::create([
            'company_id' => $companyA->id,
            'name' => 'Approval Level 1 - Company A',
            'description' => 'Template approval untuk dokumen standar Company A - 3 tingkat approval (Supervisor, Manager, Kepala Divisi)',
            'is_active' => true,
            'total_steps' => 3,
        ]);

        // Buat langkah-langkah untuk Masterflow Level 1 Company A
        MasterflowStep::create([
            'masterflow_id' => $masterflow1A->id,
            'jabatan_id' => $supervisor->id,
            'step_order' => 1,
            'step_name' => 'Supervisor Approval',
            'description' => 'Approval dari supervisor langsung',
            'is_required' => true,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflow1A->id,
            'jabatan_id' => $manager->id,
            'step_order' => 2,
            'step_name' => 'Manager Approval',
            'description' => 'Approval dari manager',
            'is_required' => true,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflow1A->id,
            'jabatan_id' => $kepalaDivisi->id,
            'step_order' => 3,
            'step_name' => 'Kepala Divisi Approval',
            'description' => 'Approval dari kepala divisi',
            'is_required' => true,
        ]);

        // Buat Masterflow Level 2 untuk Company A (4 Tingkat)
        $masterflow2A = Masterflow::create([
            'company_id' => $companyA->id,
            'name' => 'Approval Level 2 - Company A',
            'description' => 'Template approval untuk dokumen penting Company A - 4 tingkat approval (Supervisor, Manager, Kepala Divisi, Direktur)',
            'is_active' => true,
            'total_steps' => 4,
        ]);

        // Buat langkah-langkah untuk Masterflow Level 2 Company A
        MasterflowStep::create([
            'masterflow_id' => $masterflow2A->id,
            'jabatan_id' => $supervisor->id,
            'step_order' => 1,
            'step_name' => 'Supervisor Approval',
            'description' => 'Approval dari supervisor langsung',
            'is_required' => true,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflow2A->id,
            'jabatan_id' => $manager->id,
            'step_order' => 2,
            'step_name' => 'Manager Approval',
            'description' => 'Approval dari manager',
            'is_required' => true,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflow2A->id,
            'jabatan_id' => $kepalaDivisi->id,
            'step_order' => 3,
            'step_name' => 'Kepala Divisi Approval',
            'description' => 'Approval dari kepala divisi',
            'is_required' => true,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflow2A->id,
            'jabatan_id' => $direktur->id,
            'step_order' => 4,
            'step_name' => 'Direktur Approval',
            'description' => 'Approval final dari direktur',
            'is_required' => true,
        ]);

        // === MASTERFLOW UNTUK COMPANY B ===

        // Buat Masterflow Simple untuk Company B (2 Tingkat)
        $masterflowSimpleB = Masterflow::create([
            'company_id' => $companyB->id,
            'name' => 'Approval Simple - Company B',
            'description' => 'Template approval untuk dokumen sederhana Company B - 2 tingkat approval (Supervisor, Manager)',
            'is_active' => true,
            'total_steps' => 2,
        ]);

        // Buat langkah-langkah untuk Masterflow Simple Company B
        MasterflowStep::create([
            'masterflow_id' => $masterflowSimpleB->id,
            'jabatan_id' => $supervisor->id,
            'step_order' => 1,
            'step_name' => 'Supervisor Approval',
            'description' => 'Approval dari supervisor langsung',
            'is_required' => true,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflowSimpleB->id,
            'jabatan_id' => $manager->id,
            'step_order' => 2,
            'step_name' => 'Manager Approval',
            'description' => 'Approval final dari manager',
            'is_required' => true,
        ]);

        // Buat Masterflow Custom untuk Company B (3 Tingkat dengan urutan berbeda)
        $masterflowCustomB = Masterflow::create([
            'company_id' => $companyB->id,
            'name' => 'Approval Custom - Company B',
            'description' => 'Template approval khusus Company B - 3 tingkat approval (Manager, Kepala Divisi, Direktur)',
            'is_active' => true,
            'total_steps' => 3,
        ]);

        // Buat langkah-langkah untuk Masterflow Custom Company B
        MasterflowStep::create([
            'masterflow_id' => $masterflowCustomB->id,
            'jabatan_id' => $manager->id,
            'step_order' => 1,
            'step_name' => 'Manager Approval',
            'description' => 'Approval langsung dari manager',
            'is_required' => true,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflowCustomB->id,
            'jabatan_id' => $kepalaDivisi->id,
            'step_order' => 2,
            'step_name' => 'Kepala Divisi Approval',
            'description' => 'Approval dari kepala divisi',
            'is_required' => true,
        ]);

        MasterflowStep::create([
            'masterflow_id' => $masterflowCustomB->id,
            'jabatan_id' => $direktur->id,
            'step_order' => 3,
            'step_name' => 'Direktur Approval',
            'description' => 'Approval final dari direktur',
            'is_required' => true,
        ]);
    }
}
