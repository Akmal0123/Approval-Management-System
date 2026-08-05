<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Comment extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'comments';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'dokumen_id',
        'content',
        'created_at_custom',
        'user_id',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'created_at_custom' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the document that owns this comment.
     */
    public function dokumen(): BelongsTo
    {
        return $this->belongsTo(Dokumen::class);
    }

    /**
     * Get the user who wrote this comment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get formatted time difference for created_at_custom.
     */
    public function getTimeAgoAttribute(): string
    {
        if (!$this->created_at_custom) {
            return 'Unknown time';
        }

        return $this->created_at_custom->diffForHumans();
    }

    /**
     * Get formatted date for created_at_custom.
     */
    public function getFormattedDateAttribute(): string
    {
        if (!$this->created_at_custom) {
            return 'Unknown date';
        }

        return $this->created_at_custom->format('d M Y, H:i');
    }

    /**
     * Get excerpt of comment content.
     */
    public function getExcerptAttribute(): string
    {
        return strlen($this->content) > 100
            ? substr($this->content, 0, 100) . '...'
            : $this->content;
    }

    /**
     * Check if comment was created recently (within last hour).
     */
    public function isRecent(): bool
    {
        if (!$this->created_at_custom) {
            return false;
        }

        return $this->created_at_custom->diffInHours(now()) < 1;
    }

    /**
     * Scope to filter by document.
     */
    public function scopeByDokumen($query, $dokumenId)
    {
        return $query->where('dokumen_id', $dokumenId);
    }

    /**
     * Scope to filter by user.
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to order by custom created date.
     */
    public function scopeOrderedByDate($query, $direction = 'desc')
    {
        return $query->orderBy('created_at_custom', $direction);
    }

    /**
     * Scope to get recent comments (within last 24 hours).
     */
    public function scopeRecent($query)
    {
        return $query->where('created_at_custom', '>=', now()->subDay());
    }

    /**
     * Scope to search by content.
     */
    public function scopeSearch($query, $search)
    {
        return $query->where('content', 'like', '%' . $search . '%');
    }

    /**
     * Boot method to set created_at_custom automatically.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($comment) {
            if (!$comment->created_at_custom) {
                $comment->created_at_custom = now();
            }
        });
    }
}
