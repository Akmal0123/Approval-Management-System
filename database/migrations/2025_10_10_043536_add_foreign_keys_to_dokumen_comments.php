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
        // Add foreign key from dokumen to comments
        Schema::table('dokumen', function (Blueprint $table) {
            $table->foreign('comment_id')->references('id')->on('comments')->onDelete('set null');
        });

        // Add foreign key from comments to dokumen
        Schema::table('comments', function (Blueprint $table) {
            $table->foreign('dokumen_id')->references('id')->on('dokumen')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop foreign keys
        Schema::table('dokumen', function (Blueprint $table) {
            $table->dropForeign(['comment_id']);
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->dropForeign(['dokumen_id']);
        });
    }
};
