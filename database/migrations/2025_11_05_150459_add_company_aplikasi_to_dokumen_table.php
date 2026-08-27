<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('dokumen', function (Blueprint $table) {
            if (!Schema::hasColumn('dokumen', 'nomor_dokumen')) {
                $table->string('nomor_dokumen')->unique()->nullable()->after('id');
            }
            if (!Schema::hasColumn('dokumen', 'company_id')) {
                $table->foreignId('company_id')->nullable()->constrained('companies')->onDelete('cascade');
            }
            if (!Schema::hasColumn('dokumen', 'aplikasi_id')) {
                $table->foreignId('aplikasi_id')->nullable()->constrained('aplikasis')->onDelete('cascade');
            }
            if (!Schema::hasColumn('dokumen', 'tgl_deadline')) {
                $table->timestamp('tgl_deadline')->nullable()->after('tgl_pengajuan');
            }
            if (!Schema::hasColumn('dokumen', 'qr_code_hash')) {
                $table->string('qr_code_hash')->nullable()->after('deskripsi');
            }
            if (!Schema::hasColumn('dokumen', 'nominal')) {
                $table->decimal('nominal', 15, 2)->default(0);
            }
            
            // Ubah tipe_dokumen menjadi string agar fleksibel (menerima 'transaksi', 'proposal', dll)
            if (Schema::hasColumn('dokumen', 'tipe_dokumen')) {
                $table->string('tipe_dokumen')->change();
            } else {
                $table->string('tipe_dokumen')->default('proposal');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen', function (Blueprint $table) {
            if (Schema::hasColumn('dokumen', 'nomor_dokumen')) {
                $table->dropColumn('nomor_dokumen');
            }
            if (Schema::hasColumn('dokumen', 'company_id')) {
                $table->dropForeign(['company_id']);
                $table->dropColumn('company_id');
            }
            if (Schema::hasColumn('dokumen', 'aplikasi_id')) {
                $table->dropForeign(['aplikasi_id']);
                $table->dropColumn('aplikasi_id');
            }
            if (Schema::hasColumn('dokumen', 'tgl_deadline')) {
                $table->dropColumn('tgl_deadline');
            }
            if (Schema::hasColumn('dokumen', 'qr_code_hash')) {
                $table->dropColumn('qr_code_hash');
            }
            if (Schema::hasColumn('dokumen', 'nominal')) {
                $table->dropColumn('nominal');
            }
        });
    }
};