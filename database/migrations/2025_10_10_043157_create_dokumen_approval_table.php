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
        Schema::create('dokumen_approval', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dokumen_id');
            $table->unsignedBigInteger('user_id'); // approver user
            $table->unsignedBigInteger('dokumen_version_id');
            $table->unsignedBigInteger('masterflow_step_id'); // Direct reference to masterflow_step

            // Remove redundant fields that already exist in masterflow_steps:
            // - masterflow_id (can get from masterflow_step.masterflow_id)
            // - index/step_order (exists in masterflow_step.step_order)
            // - role (can get from masterflow_step.jabatan)

            $table->enum('approval_status', ['pending', 'approved', 'rejected', 'skipped'])->default('pending');
            $table->datetime('tgl_approve')->nullable();
            $table->datetime('tgl_deadline')->nullable();
            $table->string('group_index')->nullable(); // For parallel approval groups
            $table->enum('jenis_group', ['all_required', 'any_one', 'majority'])->nullable(); // Group approval type
            $table->text('alasan_reject')->nullable();
            $table->text('comment')->nullable(); // Optional comment when approving/rejecting
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('dokumen_id')->references('id')->on('dokumen')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('dokumen_version_id')->references('id')->on('dokumen_version')->onDelete('cascade');
            $table->foreign('masterflow_step_id')->references('id')->on('masterflow_steps')->onDelete('cascade');

            // Add indexes for better performance
            $table->index(['dokumen_id', 'approval_status']);
            $table->index(['user_id', 'approval_status']);
            $table->index(['masterflow_step_id', 'approval_status']);
            $table->index('tgl_deadline'); // For deadline monitoring

            // Unique constraint - one approval per user per step per document
            $table->unique(['dokumen_id', 'user_id', 'masterflow_step_id'], 'unique_approval_per_step');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dokumen_approval');
    }
};
