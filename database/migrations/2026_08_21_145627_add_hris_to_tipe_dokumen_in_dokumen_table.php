<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            // Ubah tipe kolom dari ENUM menjadi VARCHAR(255) agar bisa menerima nilai apa pun (memo, transaksi, proposal, dll)
            DB::statement("ALTER TABLE dokumen MODIFY COLUMN tipe_dokumen VARCHAR(255) DEFAULT 'proposal'");
        } else {
            Schema::table('dokumen', function (Blueprint $table) {
                $table->string('tipe_dokumen', 255)->default('proposal')->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE dokumen MODIFY COLUMN tipe_dokumen VARCHAR(255) DEFAULT 'proposal'");
        }
    }
};