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
            if (!Schema::hasColumn('dokumen', 'tipe_dokumen')) {
                $table->string('tipe_dokumen')->nullable()->default('proposal')->after('judul_dokumen');
            }
            if (!Schema::hasColumn('dokumen', 'nominal')) {
                $table->decimal('nominal', 15, 2)->nullable()->after('tipe_dokumen');
            }
            if (!Schema::hasColumn('dokumen', 'qr_code_path')) {
                $table->string('qr_code_path')->nullable()->after('status');
            }
            if (!Schema::hasColumn('dokumen', 'qr_code_hash')) {
                $table->string('qr_code_hash')->nullable()->after('qr_code_path');
            }
        });

        Schema::table('masterflows', function (Blueprint $table) {
            if (!Schema::hasColumn('masterflows', 'tipe_dokumen')) {
                $table->string('tipe_dokumen')->nullable()->after('name');
            }
            if (!Schema::hasColumn('masterflows', 'min_nominal')) {
                $table->decimal('min_nominal', 15, 2)->nullable()->after('tipe_dokumen');
            }
            if (!Schema::hasColumn('masterflows', 'max_nominal')) {
                $table->decimal('max_nominal', 15, 2)->nullable()->after('min_nominal');
            }
        });

        Schema::table('dokumen_approval', function (Blueprint $table) {
            if (!Schema::hasColumn('dokumen_approval', 'is_parallel')) {
                $table->boolean('is_parallel')->default(false)->after('approval_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen', function (Blueprint $table) {
            $table->dropColumn(['tipe_dokumen', 'nominal', 'qr_code_path', 'qr_code_hash']);
        });

        Schema::table('masterflows', function (Blueprint $table) {
            $table->dropColumn(['tipe_dokumen', 'min_nominal', 'max_nominal']);
        });

        Schema::table('dokumen_approval', function (Blueprint $table) {
            $table->dropColumn(['is_parallel']);
        });
    }
};
