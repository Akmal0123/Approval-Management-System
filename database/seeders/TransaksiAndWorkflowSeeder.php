<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Aplikasi;
use App\Models\Transaksi;
use App\Models\Masterflow;
use App\Models\MasterflowStep;
use App\Models\Jabatan;
use Illuminate\Database\Seeder;

class TransaksiAndWorkflowSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Get or create Company
        $company = Company::firstOrCreate(
            ['name' => 'PT. Tiga Serangkai'],
            ['address' => 'Jl. Dr. Supomo No. 23, Solo', 'phone_number' => '0271-714344']
        );

        // 2. Get or create Aplikasi (ERP, HR, Tisera)
        $erpApp = Aplikasi::firstOrCreate(
            ['name' => 'ERP System', 'company_id' => $company->id]
        );
        $hrApp = Aplikasi::firstOrCreate(
            ['name' => 'HR System', 'company_id' => $company->id]
        );
        $tiseraApp = Aplikasi::firstOrCreate(
            ['name' => 'Tisera', 'company_id' => $company->id]
        );

        // 3. Get or create Jabatans
        $direkturUtama = Jabatan::firstOrCreate(['name' => 'Direktur Utama']);
        $direktur = Jabatan::firstOrCreate(['name' => 'Direktur']);
        $kepalaDivisi = Jabatan::firstOrCreate(['name' => 'Kepala Divisi']);
        $manager = Jabatan::firstOrCreate(['name' => 'Manager']);
        $supervisor = Jabatan::firstOrCreate(['name' => 'Supervisor']);
        $staff = Jabatan::firstOrCreate(['name' => 'Staff']);

        // 4. Create Transaksi records
        // ERP Transaksis
        $prTransaksi = Transaksi::firstOrCreate(
            ['kode_transaksi' => 'PR-ERP', 'aplikasi_id' => $erpApp->id],
            [
                'nama_transaksi' => 'Purchase Request',
                'departemen' => 'Pengadaan / Logistik',
                'deskripsi' => 'Pengajuan pembelian barang dan jasa operasional',
                'is_active' => true,
            ]
        );

        $pvTransaksi = Transaksi::firstOrCreate(
            ['kode_transaksi' => 'PV-ERP', 'aplikasi_id' => $erpApp->id],
            [
                'nama_transaksi' => 'Payment Voucher',
                'departemen' => 'Keuangan',
                'deskripsi' => 'Voucher pengeluaran kas dan pembayaran vendor',
                'is_active' => true,
            ]
        );

        $poTransaksi = Transaksi::firstOrCreate(
            ['kode_transaksi' => 'PO-ERP', 'aplikasi_id' => $erpApp->id],
            [
                'nama_transaksi' => 'Purchase Order',
                'departemen' => 'Pengadaan',
                'deskripsi' => 'Surat pesanan pembelian resmi kepada vendor',
                'is_active' => true,
            ]
        );

        // HR Transaksis
        $cutiTransaksi = Transaksi::firstOrCreate(
            ['kode_transaksi' => 'CUTI-HR', 'aplikasi_id' => $hrApp->id],
            [
                'nama_transaksi' => 'Pengajuan Cuti',
                'departemen' => 'HRD',
                'deskripsi' => 'Pengajuan cuti tahunan, sakit, dan izin',
                'is_active' => true,
            ]
        );

        $reimburseTransaksi = Transaksi::firstOrCreate(
            ['kode_transaksi' => 'REIM-HR', 'aplikasi_id' => $hrApp->id],
            [
                'nama_transaksi' => 'Reimbursement Medis & Operasional',
                'departemen' => 'HRD',
                'deskripsi' => 'Klaim biaya pengobatan dan biaya operasional dinas',
                'is_active' => true,
            ]
        );

        // 5. Create Masterflows linked to Transaksi & Aplikasi
        // Masterflow 1: Purchase Request (Supervisor -> Manager -> Direktur)
        $mfPR = Masterflow::firstOrCreate(
            ['name' => 'Workflow Purchase Request (ERP)', 'company_id' => $company->id],
            [
                'aplikasi_id' => $erpApp->id,
                'transaksi_id' => $prTransaksi->id,
                'departemen' => 'Pengadaan / Logistik',
                'tipe_dokumen' => 'Purchase Request',
                'description' => 'Alur approval pengadaan barang: Supervisor -> Manager -> Direktur',
                'is_active' => true,
                'total_steps' => 3,
            ]
        );

        if ($mfPR->steps()->count() === 0) {
            MasterflowStep::create([
                'masterflow_id' => $mfPR->id,
                'jabatan_id' => $supervisor->id,
                'step_order' => 1,
                'step_name' => 'Review Supervisor',
                'is_required' => true,
            ]);
            MasterflowStep::create([
                'masterflow_id' => $mfPR->id,
                'jabatan_id' => $manager->id,
                'step_order' => 2,
                'step_name' => 'Approval Manager Pengadaan',
                'is_required' => true,
            ]);
            MasterflowStep::create([
                'masterflow_id' => $mfPR->id,
                'jabatan_id' => $direktur->id,
                'step_order' => 3,
                'step_name' => 'Persetujuan Direktur',
                'is_required' => true,
            ]);
        }

        // Masterflow 2: Payment Voucher (Manager Keuangan -> Direktur Utama)
        $mfPV = Masterflow::firstOrCreate(
            ['name' => 'Workflow Payment Voucher (ERP)', 'company_id' => $company->id],
            [
                'aplikasi_id' => $erpApp->id,
                'transaksi_id' => $pvTransaksi->id,
                'departemen' => 'Keuangan',
                'tipe_dokumen' => 'Payment Voucher',
                'description' => 'Alur approval pembayaran keuangan: Manager Keuangan -> Direktur Utama',
                'is_active' => true,
                'total_steps' => 2,
            ]
        );

        if ($mfPV->steps()->count() === 0) {
            MasterflowStep::create([
                'masterflow_id' => $mfPV->id,
                'jabatan_id' => $manager->id,
                'step_order' => 1,
                'step_name' => 'Verifikasi Manager Keuangan',
                'is_required' => true,
            ]);
            MasterflowStep::create([
                'masterflow_id' => $mfPV->id,
                'jabatan_id' => $direkturUtama->id,
                'step_order' => 2,
                'step_name' => 'Persetujuan Direktur Utama',
                'is_required' => true,
            ]);
        }

        // Masterflow 3: Pengajuan Cuti (Supervisor -> Manager HRD)
        $mfCuti = Masterflow::firstOrCreate(
            ['name' => 'Workflow Pengajuan Cuti (HR)', 'company_id' => $company->id],
            [
                'aplikasi_id' => $hrApp->id,
                'transaksi_id' => $cutiTransaksi->id,
                'departemen' => 'HRD',
                'tipe_dokumen' => 'Pengajuan Cuti',
                'description' => 'Alur pengajuan cuti pegawai: Atasan Langsung (Supervisor) -> HRD Manager',
                'is_active' => true,
                'total_steps' => 2,
            ]
        );

        if ($mfCuti->steps()->count() === 0) {
            MasterflowStep::create([
                'masterflow_id' => $mfCuti->id,
                'jabatan_id' => $supervisor->id,
                'step_order' => 1,
                'step_name' => 'Approval Atasan Langsung',
                'is_required' => true,
            ]);
            MasterflowStep::create([
                'masterflow_id' => $mfCuti->id,
                'jabatan_id' => $manager->id,
                'step_order' => 2,
                'step_name' => 'Approval HRD Manager',
                'is_required' => true,
            ]);
        }

        // Masterflow 4: Reimbursement (Supervisor -> Manager -> Keuangan)
        $mfReim = Masterflow::firstOrCreate(
            ['name' => 'Workflow Reimbursement (HR)', 'company_id' => $company->id],
            [
                'aplikasi_id' => $hrApp->id,
                'transaksi_id' => $reimburseTransaksi->id,
                'departemen' => 'HRD',
                'tipe_dokumen' => 'Reimbursement',
                'description' => 'Alur klaim reimbursement medis & dinas: Supervisor -> Manager -> Kepala Divisi',
                'is_active' => true,
                'total_steps' => 3,
            ]
        );

        if ($mfReim->steps()->count() === 0) {
            MasterflowStep::create([
                'masterflow_id' => $mfReim->id,
                'jabatan_id' => $supervisor->id,
                'step_order' => 1,
                'step_name' => 'Persetujuan Supervisor',
                'is_required' => true,
            ]);
            MasterflowStep::create([
                'masterflow_id' => $mfReim->id,
                'jabatan_id' => $manager->id,
                'step_order' => 2,
                'step_name' => 'Verifikasi Manager',
                'is_required' => true,
            ]);
            MasterflowStep::create([
                'masterflow_id' => $mfReim->id,
                'jabatan_id' => $kepalaDivisi->id,
                'step_order' => 3,
                'step_name' => 'Persetujuan Kepala Divisi',
                'is_required' => true,
            ]);
        }
    }
}
