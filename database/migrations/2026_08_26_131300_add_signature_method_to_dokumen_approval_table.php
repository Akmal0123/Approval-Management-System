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
            $table->string('signature_method')->default('original')->after('approval_status');
            $table->string('verification_token')->nullable()->unique()->after('signature_method');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen_approval', function (Blueprint $table) {
            $table->dropColumn(['signature_method', 'verification_token']);
        });
    }
};
