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
        Schema::create('dokumen_hashes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dokumen_id');
            $table->unsignedBigInteger('dokumen_version_id')->nullable();
            $table->unsignedBigInteger('dokumen_approval_id')->nullable();
            $table->string('sha256_hash', 64)->index();
            $table->string('hash_type', 32); // 'original', 'approval_step', 'signed_final'
            $table->string('file_path')->nullable();
            $table->bigInteger('file_size')->nullable();
            $table->integer('step_order')->nullable();
            $table->string('approver_name')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('dokumen_id')->references('id')->on('dokumen')->onDelete('cascade');
            $table->foreign('dokumen_version_id')->references('id')->on('dokumen_version')->onDelete('cascade');
            $table->foreign('dokumen_approval_id')->references('id')->on('dokumen_approval')->onDelete('set null');

            $table->index(['dokumen_id', 'hash_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dokumen_hashes');
    }
};
