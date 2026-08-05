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
        Schema::create('dokumen', function (Blueprint $table) {
            $table->id();
            $table->string('judul_dokumen');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('masterflow_id');
            $table->unsignedBigInteger('comment_id')->nullable();
            $table->string('status');
            $table->date('tgl_pengajuan');
            $table->text('deskripsi')->nullable();
            $table->string('status_current')->nullable();
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('masterflow_id')->references('id')->on('masterflows')->onDelete('cascade');
            // Note: comment_id foreign key will be added after comments table is created

            // Add indexes for better performance
            $table->index(['user_id', 'status']);
            $table->index('masterflow_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dokumen');
    }
};
