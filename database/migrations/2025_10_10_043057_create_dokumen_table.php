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
            $table->string('nomor_dokumen')->unique()->nullable();
            $table->string('judul_dokumen');
            
            // Kolom Tipe & Modul Transaksi (Menggunakan string agar tidak truncation error)
            $table->string('jenis_pengajuan')->default('manual'); // manual / transaksi
            $table->string('tipe_dokumen')->default('proposal');  // proposal, pengadaan, po, pr, memo_internal, internal_memo, hris
            $table->string('modul_transaksi')->nullable();        // hris, pr, po, internal_memo, proposal
            
            // Relasi ke Unit Aplikasi
            $table->foreignId('aplikasi_unit_id')->nullable()->constrained('aplikasis')->onDelete('set null');
            
            $table->decimal('nominal', 15, 2)->default(0);
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('masterflow_id')->nullable();
            $table->unsignedBigInteger('comment_id')->nullable();
            
            $table->string('status')->default('draft');
            $table->date('tgl_pengajuan');
            $table->text('deskripsi')->nullable();
            $table->string('status_current')->nullable();
            
            $table->timestamps();

            // Foreign key constraints
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('masterflow_id')->references('id')->on('masterflows')->onDelete('cascade');

            // Indexes for better performance
            $table->index(['user_id', 'status']);
            $table->index('masterflow_id');
            $table->index('aplikasi_unit_id');
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