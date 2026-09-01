<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterTransaksi extends Model
{
    use HasFactory;

    protected $table = 'master_transaksis';

    protected $fillable = [
        'company_id',
        'aplikasi_id',
        'kode_transaksi',
        'nama_transaksi',
        'kategori',
        'deskripsi',
        'is_active',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function aplikasi()
    {
        return $this->belongsTo(Aplikasi::class);
    }
}