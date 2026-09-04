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
            $table->foreignId('transaksi_id')->nullable()->after('aplikasi_id')->constrained('transaksis')->nullOnDelete();
            $table->string('tipe_dokumen')->nullable()->default('manual')->after('transaksi_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen', function (Blueprint $table) {
            $table->dropForeign(['transaksi_id']);
            $table->dropColumn(['transaksi_id', 'tipe_dokumen']);
        });
    }
};
