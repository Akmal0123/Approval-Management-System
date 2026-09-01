<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('master_transaksis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete();
            $table->foreignId('aplikasi_id')->constrained('aplikasis')->cascadeOnDelete();
            $table->string('kode_transaksi'); // Contoh: PR, PO, CUTI, LMBR
            $table->string('nama_transaksi'); // Contoh: Purchase Request, Cuti Tahunan
            $table->enum('kategori', ['manual', 'transaksi'])->default('transaksi');
            $table->text('deskripsi')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('master_transaksis');
    }
};