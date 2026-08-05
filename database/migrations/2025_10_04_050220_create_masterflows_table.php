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
        Schema::create('masterflows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->onDelete('cascade'); // Relasi ke companies
            $table->string('name'); // Nama template masterflow (contoh: "Approval Level 1")
            $table->text('description')->nullable(); // Deskripsi detail dari masterflow
            $table->boolean('is_active')->default(true); // Status aktif/non-aktif
            $table->integer('total_steps')->default(0); // Total langkah approval
            $table->timestamps();

            // Index untuk performance berdasarkan company
            $table->index(['company_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('masterflows');
    }
};
