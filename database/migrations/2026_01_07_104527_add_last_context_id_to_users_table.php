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
        Schema::table('users', function (Blueprint $table) {
            // Store last used context (usersauth id) for context switching
            $table->unsignedBigInteger('last_context_id')->nullable()->after('email_preferences');

            $table->foreign('last_context_id')
                ->references('id')
                ->on('usersauth')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['last_context_id']);
            $table->dropColumn('last_context_id');
        });
    }
};
