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
        Schema::table('dokumen_approval', function (Blueprint $table) {
            // Cek terlebih dahulu agar tidak memicu error duplicate column
            if (!Schema::hasColumn('dokumen_approval', 'signature_path')) {
                $table->string('signature_path')->nullable()->after('comment');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen_approval', function (Blueprint $table) {
            if (Schema::hasColumn('dokumen_approval', 'signature_path')) {
                $table->dropColumn('signature_path');
            }
        });
    }
};