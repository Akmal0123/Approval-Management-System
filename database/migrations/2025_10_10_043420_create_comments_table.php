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
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('dokumen_id');
            $table->text('content');
            $table->dateTime('created_at_custom'); // Renamed to avoid conflict with Laravel timestamps
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            // Foreign key constraints
            // Note: dokumen_id foreign key will be added after dokumen table is created
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');

            // Add indexes for better performance
            $table->index('dokumen_id');
            $table->index('user_id');
            $table->index('created_at_custom');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
