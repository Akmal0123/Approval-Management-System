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
    Schema::table('aplikasis', function (Blueprint $table) {
        $table->string('path_api')->nullable()->after('name');
    });
}

public function down(): void
{
    Schema::table('aplikasis', function (Blueprint $table) {
        $table->dropColumn('path_api');
    });
}
};
