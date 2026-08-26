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
        Schema::create('document_signature_positions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dokumen_id');
            $table->unsignedBigInteger('dokumen_approval_id')->nullable();
            $table->integer('page')->default(1);
            $table->float('x');
            $table->float('y');
            $table->float('width');
            $table->float('height');
            $table->timestamps();

            $table->foreign('dokumen_id')->references('id')->on('dokumen')->onDelete('cascade');
            $table->foreign('dokumen_approval_id')->references('id')->on('dokumen_approval')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_signature_positions');
    }
};
