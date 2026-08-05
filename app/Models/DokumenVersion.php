<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class DokumenVersion extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'dokumen_version';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'dokumen_id',
        'version',
        'nama_file',
        'tgl_upload',
        'tipe_file',
        'file_url',
        'signed_file_url',
        'size_file',
        'status',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'tgl_upload' => 'date',
        'size_file' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the document that owns this version.
     */
    public function dokumen(): BelongsTo
    {
        return $this->belongsTo(Dokumen::class);
    }

    /**
     * Get all approvals for this version.
     */
    public function approvals(): HasMany
    {
        return $this->hasMany(DokumenApproval::class, 'dokumen_version_id');
    }

    /**
     * Get the file size in human readable format.
     */
    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->size_file;
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Get the full file URL.
     */
    public function getFullFileUrlAttribute(): string
    {
        return Storage::url($this->file_url);
    }

    /**
     * Check if this is the latest version.
     */
    public function isLatest(): bool
    {
        $latestVersion = self::where('dokumen_id', $this->dokumen_id)
            ->orderBy('created_at', 'desc')
            ->first();

        return $latestVersion && $latestVersion->id === $this->id;
    }

    /**
     * Get previous version.
     */
    public function previousVersion()
    {
        return self::where('dokumen_id', $this->dokumen_id)
            ->where('created_at', '<', $this->created_at)
            ->orderBy('created_at', 'desc')
            ->first();
    }

    /**
     * Get next version.
     */
    public function nextVersion()
    {
        return self::where('dokumen_id', $this->dokumen_id)
            ->where('created_at', '>', $this->created_at)
            ->orderBy('created_at', 'asc')
            ->first();
    }

    /**
     * Scope to filter by status.
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get active versions.
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope to order by version number.
     */
    public function scopeOrderedByVersion($query)
    {
        return $query->orderBy('version');
    }
}
