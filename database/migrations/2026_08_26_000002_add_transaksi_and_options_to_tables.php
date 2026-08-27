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
        // Add columns to masterflows
        Schema::table('masterflows', function (Blueprint $table) {
            if (!Schema::hasColumn('masterflows', 'aplikasi_id')) {
                $table->unsignedBigInteger('aplikasi_id')->nullable()->after('company_id');
                $table->foreign('aplikasi_id')->references('id')->on('aplikasis')->onDelete('set null');
            }
            if (!Schema::hasColumn('masterflows', 'transaksi_id')) {
                $table->unsignedBigInteger('transaksi_id')->nullable()->after('aplikasi_id');
                $table->foreign('transaksi_id')->references('id')->on('transaksis')->onDelete('set null');
            }
            if (!Schema::hasColumn('masterflows', 'departemen')) {
                $table->string('departemen')->nullable()->after('tipe_dokumen');
            }
        });

        // Add columns to dokumen
        Schema::table('dokumen', function (Blueprint $table) {
            if (!Schema::hasColumn('dokumen', 'transaksi_id')) {
                $table->unsignedBigInteger('transaksi_id')->nullable()->after('aplikasi_id');
                $table->foreign('transaksi_id')->references('id')->on('transaksis')->onDelete('set null');
            }
            if (!Schema::hasColumn('dokumen', 'departemen')) {
                $table->string('departemen')->nullable()->after('transaksi_id');
            }
            if (!Schema::hasColumn('dokumen', 'verification_hash')) {
                $table->string('verification_hash', 64)->nullable()->unique()->after('status_current');
            }
        });

        // Add approval options to dokumen_approval
        Schema::table('dokumen_approval', function (Blueprint $table) {
            if (!Schema::hasColumn('dokumen_approval', 'signature_type')) {
                $table->string('signature_type')->default('signature')->after('signature_path'); // 'signature' or 'qr_code'
            }
            if (!Schema::hasColumn('dokumen_approval', 'show_signature')) {
                $table->boolean('show_signature')->default(true)->after('signature_type');
            }
            if (!Schema::hasColumn('dokumen_approval', 'show_date')) {
                $table->boolean('show_date')->default(true)->after('show_signature');
            }
            if (!Schema::hasColumn('dokumen_approval', 'show_jabatan')) {
                $table->boolean('show_jabatan')->default(true)->after('show_date');
            }
            if (!Schema::hasColumn('dokumen_approval', 'approver_jabatan')) {
                $table->string('approver_jabatan')->nullable()->after('show_jabatan');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('masterflows', function (Blueprint $table) {
            if (Schema::hasColumn('masterflows', 'transaksi_id')) {
                $table->dropForeign(['transaksi_id']);
                $table->dropColumn('transaksi_id');
            }
            if (Schema::hasColumn('masterflows', 'aplikasi_id')) {
                $table->dropForeign(['aplikasi_id']);
                $table->dropColumn('aplikasi_id');
            }
            if (Schema::hasColumn('masterflows', 'departemen')) {
                $table->dropColumn('departemen');
            }
        });

        Schema::table('dokumen', function (Blueprint $table) {
            if (Schema::hasColumn('dokumen', 'transaksi_id')) {
                $table->dropForeign(['transaksi_id']);
                $table->dropColumn('transaksi_id');
            }
            if (Schema::hasColumn('dokumen', 'departemen')) {
                $table->dropColumn('departemen');
            }
            if (Schema::hasColumn('dokumen', 'verification_hash')) {
                $table->dropColumn('verification_hash');
            }
        });

        Schema::table('dokumen_approval', function (Blueprint $table) {
            $table->dropColumn(['signature_type', 'show_signature', 'show_date', 'show_jabatan', 'approver_jabatan']);
        });
    }
};
