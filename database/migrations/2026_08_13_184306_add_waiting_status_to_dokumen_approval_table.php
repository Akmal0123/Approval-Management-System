<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE dokumen_approval MODIFY COLUMN approval_status ENUM('pending', 'approved', 'rejected', 'skipped', 'cancelled', 'revision_requested', 'waiting') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Reverting this might cause issues if there are rows with 'waiting' status
        DB::statement("ALTER TABLE dokumen_approval MODIFY COLUMN approval_status ENUM('pending', 'approved', 'rejected', 'skipped', 'cancelled', 'revision_requested') DEFAULT 'pending'");
    }
};
