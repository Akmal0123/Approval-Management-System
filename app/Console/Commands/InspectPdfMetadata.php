<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

class InspectPdfMetadata extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pdf:inspect {file : Path to the PDF file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Inspect metadata, approvers, and cryptographic security attributes of a PDF document';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $filePath = $this->argument('file');

        if (!file_exists($filePath)) {
            // Check storage/app/private or public or relative to base
            $possiblePath = base_path($filePath);
            if (file_exists($possiblePath)) {
                $filePath = $possiblePath;
            } elseif (storage_path('app/' . $filePath)) {
                $filePath = storage_path('app/' . $filePath);
            }
        }

        if (!file_exists($filePath)) {
            $this->error("File tidak ditemukan: {$this->argument('file')}");
            return Command::FAILURE;
        }

        $this->info("=== Menginspeksi Dokumen PDF: " . basename($filePath) . " ===");

        $scriptPath = base_path('scripts/inspect-pdf.cjs');
        $process = new Process(['node', $scriptPath, $filePath], base_path());
        $process->run();

        if (!$process->isSuccessful()) {
            $this->error("Gagal membaca PDF: " . $process->getErrorOutput());
            return Command::FAILURE;
        }

        $result = json_decode($process->getOutput(), true);
        if (!$result) {
            $this->error("Format output tidak valid.");
            return Command::FAILURE;
        }

        $this->newLine();
        $this->comment("1. Metadata Standar PDF (ISO 32000-1):");
        $standardRows = [];
        foreach ($result['standard'] as $key => $val) {
            $standardRows[] = [$key, $val];
        }
        $this->table(['Atribut', 'Nilai'], $standardRows);

        $this->newLine();
        $this->comment("2. Atribut Khusus / Custom Properties (Inspect Detail):");
        $customRows = [];
        foreach ($result['custom'] as $key => $val) {
            $customRows[] = [$key, $val];
        }
        $this->table(['Key (Property)', 'Value (Detail)'], $customRows);

        if (!empty($result['keywords']) && $result['keywords'] !== '-') {
            $this->newLine();
            $this->comment("3. Keywords / Tags:");
            $this->line($result['keywords']);
        }

        $this->newLine();
        $this->info("✓ Inspeksi metadata dan atribut kriptografi PDF selesai.");
        return Command::SUCCESS;
    }
}
