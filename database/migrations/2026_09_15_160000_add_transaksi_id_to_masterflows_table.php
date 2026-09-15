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
        Schema::table('masterflows', function (Blueprint $table) {
            $table->foreignId('transaksi_id')->nullable()->after('company_id')->constrained('transaksis')->nullOnDelete();
            $table->index('transaksi_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('masterflows', function (Blueprint $table) {
            $table->dropForeign(['transaksi_id']);
            $table->dropIndex(['transaksi_id']);
            $table->dropColumn('transaksi_id');
        });
    }
};
