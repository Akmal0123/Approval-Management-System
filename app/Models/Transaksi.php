<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaksi extends Model
{
    use HasFactory;

    protected $table = 'transaksis';

    protected $fillable = [
        'aplikasi_id',
        'kode_transaksi',
        'nama_transaksi',
        'departemen',
        'deskripsi',
        'is_active',
        'lookup_path_api',  
        'get_pdf_path_api',
        'path_dokumen',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the aplikasi that owns the transaksi.
     */
    public function aplikasi(): BelongsTo
    {
        return $this->belongsTo(Aplikasi::class);
    }

    /**
     * Get the masterflows associated with this transaksi.
     */
    public function masterflows(): HasMany
    {
        return $this->hasMany(Masterflow::class);
    }

    /**
     * Get the dokumen associated with this transaksi.
     */
    public function dokumens(): HasMany
    {
        return $this->hasMany(Dokumen::class, 'transaksi_id');
    }

    /**
     * Scope active transactions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope by aplikasi.
     */
    public function scopeForAplikasi($query, $aplikasiId)
    {
        return $query->where('aplikasi_id', $aplikasiId);
    }
}
