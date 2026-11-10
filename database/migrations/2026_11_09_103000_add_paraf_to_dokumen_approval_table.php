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
            $table->string('paraf_path')->nullable()->after('signature_path');
            $table->json('paraf_pages')->nullable()->after('paraf_path');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen_approval', function (Blueprint $table) {
            $table->dropColumn(['paraf_path', 'paraf_pages']);
        });
    }
};

