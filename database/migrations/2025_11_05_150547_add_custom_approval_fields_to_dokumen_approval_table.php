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
            // Make some fields nullable for custom approvals
            $table->unsignedBigInteger('dokumen_version_id')->nullable()->change();
            $table->unsignedBigInteger('masterflow_step_id')->nullable()->change();
            $table->unsignedBigInteger('user_id')->nullable()->change();

            // Add custom approval fields
            $table->string('approver_email')->nullable()->after('user_id');
            $table->integer('approval_order')->nullable()->after('masterflow_step_id');

            // Add index
            $table->index(['dokumen_id', 'approval_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen_approval', function (Blueprint $table) {
            $table->dropColumn(['approver_email', 'approval_order']);

            // Revert nullable changes
            $table->unsignedBigInteger('dokumen_version_id')->nullable(false)->change();
            $table->unsignedBigInteger('masterflow_step_id')->nullable(false)->change();
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
        });
    }
};
