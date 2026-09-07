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
        Schema::table('transaksis', function (Blueprint $table) {
            $table->string('lookup_path_api')->nullable()->after('deskripsi');
            $table->string('get_pdf_path_api')->nullable()->after('lookup_path_api');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transaksis', function (Blueprint $table) {
            $table->dropColumn(['lookup_path_api', 'get_pdf_path_api']);
        });
    }
};
