<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dokumen', function (Blueprint $table) {
            // Kolom untuk ID Dokumen auto-generate sistem
            $table->string('id_dokumen')->nullable()->after('id');

            // Sekaligus tambahkan kolom tipe_dokumen jika belum ada
            if (!Schema::hasColumn('dokumen', 'tipe_dokumen')) {
                $table->string('tipe_dokumen')->nullable()->after('nomor_dokumen');
            }
        });
    }

    public function down(): void
    {
        Schema::table('dokumen', function (Blueprint $table) {
            $table->dropColumn(['id_dokumen', 'tipe_dokumen']);
        });
    }
};