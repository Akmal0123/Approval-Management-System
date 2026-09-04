<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurReq extends Model
{
    protected $connection = 'sqlsrv_local'; // Menggunakan koneksi SQL Server lokal
    protected $table = 'PurReq';           // Nama tabel di database
    protected $primaryKey = 'IDNo';         // Primary key sesuai file SQL
    public $timestamps = false;             // Karena tabel ini tidak punya created_at/updated_at
}