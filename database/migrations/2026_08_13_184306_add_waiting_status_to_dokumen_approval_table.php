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
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE dokumen_approval MODIFY COLUMN approval_status ENUM('pending', 'approved', 'rejected', 'skipped', 'cancelled', 'revision_requested', 'waiting') DEFAULT 'pending'");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE dokumen_approval DROP CONSTRAINT IF EXISTS dokumen_approval_approval_status_check");
            DB::statement("ALTER TABLE dokumen_approval ADD CONSTRAINT dokumen_approval_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected', 'skipped', 'cancelled', 'revision_requested', 'waiting'))");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();
        if ($driver === 'mysql') {
            // Reverting this might cause issues if there are rows with 'waiting' status
            DB::statement("ALTER TABLE dokumen_approval MODIFY COLUMN approval_status ENUM('pending', 'approved', 'rejected', 'skipped', 'cancelled', 'revision_requested') DEFAULT 'pending'");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TABLE dokumen_approval DROP CONSTRAINT IF EXISTS dokumen_approval_approval_status_check");
            DB::statement("ALTER TABLE dokumen_approval ADD CONSTRAINT dokumen_approval_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected', 'skipped', 'cancelled', 'revision_requested'))");
        }
    }
};
