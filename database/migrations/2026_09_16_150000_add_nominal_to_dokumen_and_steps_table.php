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
        if (Schema::hasTable('dokumen') && !Schema::hasColumn('dokumen', 'nominal')) {
            Schema::table('dokumen', function (Blueprint $table) {
                $table->decimal('nominal', 15, 2)->default(0)->after('judul_dokumen');
            });
        }

        if (Schema::hasTable('masterflow_steps') && !Schema::hasColumn('masterflow_steps', 'min_nominal')) {
            Schema::table('masterflow_steps', function (Blueprint $table) {
                $table->decimal('min_nominal', 15, 2)->nullable()->after('is_required');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('dokumen') && Schema::hasColumn('dokumen', 'nominal')) {
            Schema::table('dokumen', function (Blueprint $table) {
                $table->dropColumn('nominal');
            });
        }

        if (Schema::hasTable('masterflow_steps') && Schema::hasColumn('masterflow_steps', 'min_nominal')) {
            Schema::table('masterflow_steps', function (Blueprint $table) {
                $table->dropColumn('min_nominal');
            });
        }
    }
};
