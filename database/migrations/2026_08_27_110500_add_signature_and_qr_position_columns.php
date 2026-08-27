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
            $table->float('pos_x')->nullable()->comment('X coordinate percentage (0-100)');
            $table->float('pos_y')->nullable()->comment('Y coordinate percentage (0-100)');
            $table->string('page')->nullable()->default('last')->comment('Page number or keyword (last, first, all)');
        });

        Schema::table('dokumen', function (Blueprint $table) {
            $table->boolean('is_qr_active')->default(false)->comment('Whether QR code is enabled');
            $table->float('qr_pos_x')->nullable()->comment('QR X coordinate percentage (0-100)');
            $table->float('qr_pos_y')->nullable()->comment('QR Y coordinate percentage (0-100)');
            $table->string('qr_page')->nullable()->default('last')->comment('QR Page number or keyword');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen_approval', function (Blueprint $table) {
            $table->dropColumn(['pos_x', 'pos_y', 'page']);
        });

        Schema::table('dokumen', function (Blueprint $table) {
            $table->dropColumn(['is_qr_active', 'qr_pos_x', 'qr_pos_y', 'qr_page']);
        });
    }
};
