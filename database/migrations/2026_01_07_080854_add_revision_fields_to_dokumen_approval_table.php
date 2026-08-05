<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // First, modify the enum to add 'revision_requested' status
        DB::statement("ALTER TABLE dokumen_approval MODIFY COLUMN approval_status ENUM('pending', 'approved', 'rejected', 'skipped', 'cancelled', 'revision_requested') DEFAULT 'pending'");

        // Add revision-related columns
        Schema::table('dokumen_approval', function (Blueprint $table) {
            $table->text('revision_notes')->nullable()->after('comment');
            $table->unsignedBigInteger('revision_requested_by')->nullable()->after('revision_notes');
            $table->timestamp('revision_requested_at')->nullable()->after('revision_requested_by');

            // Foreign key for revision_requested_by
            $table->foreign('revision_requested_by')
                ->references('id')
                ->on('users')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dokumen_approval', function (Blueprint $table) {
            $table->dropForeign(['revision_requested_by']);
            $table->dropColumn(['revision_notes', 'revision_requested_by', 'revision_requested_at']);
        });

        // Revert enum to original values
        DB::statement("ALTER TABLE dokumen_approval MODIFY COLUMN approval_status ENUM('pending', 'approved', 'rejected', 'skipped', 'cancelled') DEFAULT 'pending'");
    }
};
