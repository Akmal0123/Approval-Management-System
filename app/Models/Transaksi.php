<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaksi extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'transaksis';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'aplikasi_id',
        'kode_transaksi',
        'nama_transaksi',
        'departemen',
        'deskripsi',
        'lookup_path_api',
        'get_pdf_path_api',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
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
     * Get all documents associated with this transaksi.
     */
    public function dokumens(): HasMany
    {
        return $this->hasMany(Dokumen::class, 'transaksi_id');
    }
}
