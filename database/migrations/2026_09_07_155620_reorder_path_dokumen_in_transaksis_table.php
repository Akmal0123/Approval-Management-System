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
        // Hapus kolom yang lama terlebih dahulu
        $table->dropColumn('path_dokumen');
    });

    Schema::table('transaksis', function (Blueprint $table) {
        // Buat ulang dengan posisi tepat di setelah get_pdf_path_api
        $table->string('path_dokumen')->nullable()->after('get_pdf_path_api');
    });
}

public function down()
{
    Schema::table('transaksis', function (Blueprint $table) {
        $table->dropColumn('path_dokumen');
    });
}
};
