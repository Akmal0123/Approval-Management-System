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
    Schema::table('companies', function (Blueprint $table) {
        $table->string('base_url')->nullable()->after('phone_number'); // Sesuaikan 'phone' dengan nama kolom terakhirmu
    });
}

public function down()
{
    Schema::table('companies', function (Blueprint $table) {
        $table->dropColumn('base_url');
    });
}
};
