<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Signature extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'signature_path',
        'signature_type',
        'is_default',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_default' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'signature_url',
        'full_path',
    ];

    /**
     * Get the user that owns the signature.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the full URL of the signature file.
     */
    public function getSignatureUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->signature_path);
    }

    /**
     * Get the full path of the signature file.
     */
    public function getFullPathAttribute(): string
    {
        return Storage::path($this->signature_path);
    }

    /**
     * Set this signature as default and unset others.
     */
    public function setAsDefault(): void
    {
        // Unset all other signatures for this user
        static::where('user_id', $this->user_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        // Set this signature as default
        $this->update(['is_default' => true]);
    }

    /**
     * Scope to get only default signature.
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope to get signatures by user.
     */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        // When soft deleting, delete the signature file from storage
        static::deleting(function ($signature) {
            if (!$signature->isForceDeleting()) {
                // This is a soft delete, delete the file
                if ($signature->signature_path && Storage::disk('public')->exists($signature->signature_path)) {
                    Storage::disk('public')->delete($signature->signature_path);
                }
            }
        });

        // When force deleting (permanent delete), also ensure file is deleted
        static::forceDeleting(function ($signature) {
            if ($signature->signature_path && Storage::disk('public')->exists($signature->signature_path)) {
                Storage::disk('public')->delete($signature->signature_path);
            }
        });
    }
}
