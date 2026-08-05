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
        Schema::create('dokumen_version', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dokumen_id');
            $table->string('version'); // v1.0, v1.1, v2.0, etc.
            $table->string('nama_file');
            $table->date('tgl_upload');
            $table->string('tipe_file'); // pdf, docx, xlsx, etc.
            $table->string('file_url'); // Storage path
            $table->bigInteger('size_file'); // in bytes
            $table->enum('status', ['draft', 'active', 'archived'])->default('active');
            $table->timestamps();

            // Foreign key constraint
            $table->foreign('dokumen_id')->references('id')->on('dokumen')->onDelete('cascade');

            // Add indexes for better performance
            $table->index('dokumen_id');
            $table->index(['dokumen_id', 'version']);
            $table->unique(['dokumen_id', 'version']); // Ensure unique version per document
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dokumen_version');
    }
};
