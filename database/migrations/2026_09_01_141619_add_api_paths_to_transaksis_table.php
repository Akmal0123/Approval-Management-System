<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('transaksis', function (Blueprint $table) {
        // Menambahkan dua kolom baru setelah kolom deskripsi
        $table->string('lookup_path_api')->nullable()->after('deskripsi');
        $table->string('get_pdf_path_api')->nullable()->after('lookup_path_api');
    });
}

public function down()
{
    Schema::table('transaksis', function (Blueprint $table) {
        $table->dropColumn(['lookup_path_api', 'get_pdf_path_api']);
    });
}
};
