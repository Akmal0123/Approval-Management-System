<?php

namespace App\Console\Commands;

use App\Services\LookupDraftSyncService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SyncLookupDraftsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'ams:sync-lookup-drafts
                            {--limit= : Maksimal record yang ditarik per jenis transaksi}
                            {--type= : Filter kode transaksi spesifik (misal: PO atau PR)}';

    /**
     * The console command description.
     */
    protected $description = 'Tarik semua data lookup eksternal dan jadikan dokumen draft langsung ke akun Super Admin';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = Carbon::now();
        $this->info("==================================================================");
        $this->info(" Memulai Sinkronisasi Lookup Eksternal ke Draft Super Admin");
        $this->info(" Waktu: " . $now->toDateTimeString());
        $this->info("==================================================================");

        $limit = $this->option('limit') ? (int) $this->option('limit') : null;
        $type = $this->option('type') ? trim($this->option('type')) : null;

        if ($type) {
            $this->line("Filter Tipe Transaksi: <comment>{$type}</comment>");
        }
        if ($limit) {
            $this->line("Batas Per Transaksi: <comment>{$limit}</comment>");
        }

        $result = LookupDraftSyncService::syncAll($limit, $type);

        if (!$result['success']) {
            $this->error("Gagal sinkronisasi: " . $result['message']);
            return Command::FAILURE;
        }

        $superadmin = $result['superadmin'];
        $this->line("Target Akun Super Admin: <info>{$superadmin['name']} ({$superadmin['email']}, ID: {$superadmin['id']})</info>");
        $this->newLine();

        $rows = [];
        foreach ($result['details'] as $kode => $tx) {
            $rows[] = [
                $kode,
                $tx['nama_transaksi'] ?? '-',
                $tx['fetched'],
                $tx['created'],
                $tx['skipped'],
                $tx['errors'],
            ];
        }

        $this->table(
            ['Kode', 'Nama Transaksi', 'Ditemukan (Ext)', 'Draft Baru Dibuat', 'Sudah Ada (Skip)', 'Error'],
            $rows
        );

        $this->newLine();
        $this->info("Ringkasan Total:");
        $this->line(" - Total Data Eksternal : {$result['total_fetched']}");
        $this->line(" - Dokumen Draft Dibuat : <info>{$result['created']}</info>");
        $this->line(" - Dokumen Dilewati     : {$result['skipped']}");
        $this->line(" - Gagal/Error          : " . ($result['errors'] > 0 ? "<error>{$result['errors']}</error>" : "0"));
        $this->info("==================================================================");

        return Command::SUCCESS;
    }
}
