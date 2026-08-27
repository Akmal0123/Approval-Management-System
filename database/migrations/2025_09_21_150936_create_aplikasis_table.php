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
        Schema::create('aplikasis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('companies')->onDelete('cascade');
            $table->string('nama_aplikasi');
            $table->string('transaksi_management')->nullable();
            $table->timestamps();
        });

        // Insert data aplikasi baru (tanpa Holding Company, Unit Utama, dan Curious Fashion)
        DB::table('aplikasis')->insert([
            [
                'nama_aplikasi'        => 'Assalam Hypermarket',
                'transaksi_management' => 'PO (Purchase Order)',
                'created_at'           => now(),
                'updated_at'           => now(),
            ],
            [
                'nama_aplikasi'        => 'Perpus Kita',
                'transaksi_management' => 'Internal Memo',
                'created_at'           => now(),
                'updated_at'           => now(),
            ],
            [
                'nama_aplikasi'        => 'Tisera',
                'transaksi_management' => 'PR (Purchase Requisition)',
                'created_at'           => now(),
                'updated_at'           => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('aplikasis');
    }
};