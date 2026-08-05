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
        Schema::create('masterflow_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('masterflow_id')->constrained()->onDelete('cascade'); // Relasi ke masterflows
            $table->foreignId('jabatan_id')->constrained()->onDelete('cascade'); // Relasi ke jabatans
            $table->integer('step_order'); // Urutan langkah (1, 2, 3, dst)
            $table->string('step_name'); // Nama langkah (contoh: "Supervisor Approval")
            $table->text('description')->nullable(); // Deskripsi langkah
            $table->boolean('is_required')->default(true); // Apakah langkah ini wajib

            // Group approval fields for parallel approvals
            $table->string('group_index')->nullable(); // For parallel approval groups (e.g., "step_1_group_A")
            $table->enum('jenis_group', ['all_required', 'any_one', 'majority'])->nullable(); // Group approval type
            $table->json('users_in_group')->nullable(); // Array of user IDs in this group

            $table->timestamps();

            // Index untuk performance
            $table->index(['masterflow_id', 'step_order']);
            $table->index('group_index'); // Index for group queries
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('masterflow_steps');
    }
};
