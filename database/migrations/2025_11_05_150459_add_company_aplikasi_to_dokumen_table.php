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
            $table->unsignedBigInteger('company_id')->after('user_id');
            $table->unsignedBigInteger('aplikasi_id')->after('company_id');
            $table->string('nomor_dokumen')->unique()->after('id');
            $table->date('tgl_deadline')->nullable()->after('tgl_pengajuan');

            // Foreign keys
            $table->foreign('company_id')->references('id')->on('companies')->onDelete('cascade');
            $table->foreign('aplikasi_id')->references('id')->on('aplikasis')->onDelete('cascade');

            // Add index
            $table->index(['company_id', 'aplikasi_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen', function (Blueprint $table) {
            $table->dropForeign(['company_id']);
            $table->dropForeign(['aplikasi_id']);
            $table->dropColumn(['company_id', 'aplikasi_id', 'nomor_dokumen', 'tgl_deadline']);
        });
    }
};
