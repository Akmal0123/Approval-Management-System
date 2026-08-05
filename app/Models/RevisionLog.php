<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RevisionLog extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'dokumen_id',
        'dokumen_version_id',
        'user_id',
        'action',
        'changes',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'changes' => 'array',
    ];

    /**
     * Action constants
     */
    public const ACTION_CREATED = 'created';
    public const ACTION_REVISED = 'revised';
    public const ACTION_SUBMITTED = 'submitted';
    public const ACTION_APPROVED = 'approved';
    public const ACTION_REJECTED = 'rejected';
    public const ACTION_REVISION_REQUESTED = 'revision_requested';
    public const ACTION_CANCELLED = 'cancelled';

    /**
     * Get the dokumen that this log belongs to.
     */
    public function dokumen(): BelongsTo
    {
        return $this->belongsTo(Dokumen::class);
    }

    /**
     * Get the version that this log belongs to.
     */
    public function version(): BelongsTo
    {
        return $this->belongsTo(DokumenVersion::class, 'dokumen_version_id');
    }

    /**
     * Get the user who performed the action.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get human-readable action label.
     */
    public function getActionLabelAttribute(): string
    {
        return match ($this->action) {
            self::ACTION_CREATED => 'Dokumen dibuat',
            self::ACTION_REVISED => 'Dokumen direvisi',
            self::ACTION_SUBMITTED => 'Dokumen disubmit',
            self::ACTION_APPROVED => 'Dokumen disetujui',
            self::ACTION_REJECTED => 'Dokumen ditolak',
            self::ACTION_REVISION_REQUESTED => 'Revisi diminta',
            self::ACTION_CANCELLED => 'Dokumen dibatalkan',
            default => ucfirst($this->action),
        };
    }
}
