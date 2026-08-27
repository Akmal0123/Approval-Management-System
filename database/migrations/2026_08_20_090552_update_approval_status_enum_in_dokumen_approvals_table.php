<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Menggunakan nama tabel 'dokumen_approval' (singular)
        DB::statement("ALTER TABLE `dokumen_approval` MODIFY COLUMN `approval_status` ENUM('pending', 'waiting', 'approved', 'rejected', 'skipped', 'cancelled', 'revision_requested') DEFAULT 'pending'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE `dokumen_approval` MODIFY COLUMN `approval_status` ENUM('pending', 'approved', 'rejected', 'skipped', 'cancelled', 'revision_requested') DEFAULT 'pending'");
    }
};