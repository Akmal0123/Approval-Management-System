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
            if (!Schema::hasColumn('signatures', 'category')) {
                $table->string('category', 50)->default('signature')->after('signature_type');
                $table->index(['user_id', 'category']);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('signatures', function (Blueprint $table) {
            if (Schema::hasColumn('signatures', 'category')) {
                $table->dropIndex(['user_id', 'category']);
                $table->dropColumn('category');
            }
        });
    }
};

