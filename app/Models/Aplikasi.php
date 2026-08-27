<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Aplikasi extends Model
{
    use HasFactory;

    /**
     * Nama tabel yang terhubung dengan model.
     *
     * @var string
     */
    protected $table = 'aplikasis';

    /**
     * Atribut yang dapat diisi secara massal (mass assignable) untuk Create & Update.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'nama_aplikasi',
        'transaksi_management',
        'company_id',
    ];

    /**
     * Atribut tipe data casting.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'company_id' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Memastikan atribut 'name' otomatis menyertai serialisasi JSON
     * untuk konsumsi data di React / Inertia frontend.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'name',
    ];

    /**
     * Accessor untuk alias $aplikasi->name -> $aplikasi->nama_aplikasi
     */
    public function getNameAttribute(): ?string
    {
        return $this->nama_aplikasi;
    }

    /**
     * Relasi ke model Company (Aplikasi dimiliki oleh Perusahaan)
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    /**
     * Relasi ke model Dokumen
     */
    public function dokumens(): HasMany
    {
        return $this->hasMany(Dokumen::class, 'aplikasi_id');
    }
}