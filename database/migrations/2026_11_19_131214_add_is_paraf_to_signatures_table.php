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
        Schema::table('signatures', function (Blueprint $table) {
            if (!Schema::hasColumn('signatures', 'is_paraf')) {
                $table->boolean('is_paraf')->default(false)->after('is_default');
            }
        });

        // Set any existing paraf signatures to is_paraf = true
        if (Schema::hasColumn('signatures', 'category')) {
            \Illuminate\Support\Facades\DB::table('signatures')
                ->where('category', 'paraf')
                ->update(['is_paraf' => true]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('signatures', function (Blueprint $table) {
            if (Schema::hasColumn('signatures', 'is_paraf')) {
                $table->dropColumn('is_paraf');
            }
        });
    }
};
