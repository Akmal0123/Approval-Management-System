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
        Schema::create('revision_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dokumen_id');
            $table->unsignedBigInteger('dokumen_version_id');
            $table->unsignedBigInteger('user_id');
            $table->string('action', 50); // created, revised, approved, rejected, revision_requested, submitted, cancelled
            $table->json('changes')->nullable(); // Store what changed
            $table->text('notes')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('dokumen_id')
                ->references('id')
                ->on('dokumen')
                ->onDelete('cascade');

            $table->foreign('dokumen_version_id')
                ->references('id')
                ->on('dokumen_version')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('cascade');

            // Indexes
            $table->index(['dokumen_id', 'created_at']);
            $table->index('action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('revision_logs');
    }
};
