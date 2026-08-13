<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class DokumenApproval extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     */
    protected $table = 'dokumen_approval';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'dokumen_id',
        'user_id',
        'approver_email',
        'dokumen_version_id',
        'masterflow_step_id',
        'approval_order',
        'approval_status',
        'is_parallel',
        'tgl_approve',
        'tgl_deadline',
        'group_index',
        'jenis_group',
        'alasan_reject',
        'comment',
        'signature_path',
        'revision_notes',
        'revision_requested_by',
        'revision_requested_at',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'is_parallel' => 'boolean',
        'tgl_approve' => 'datetime',
        'tgl_deadline' => 'datetime',
        'revision_requested_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The accessors to append to the model's array form.
     */
    protected $appends = [
        'signature_url',
    ];

    /**
     * Get the document that owns this approval.
     */
    public function dokumen(): BelongsTo
    {
        return $this->belongsTo(Dokumen::class);
    }

    /**
     * Get the user (approver) for this approval.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the document version for this approval.
     */
    public function dokumenVersion(): BelongsTo
    {
        return $this->belongsTo(DokumenVersion::class, 'dokumen_version_id');
    }

    /**
     * Get the masterflow step for this approval.
     */
    public function masterflowStep(): BelongsTo
    {
        return $this->belongsTo(MasterflowStep::class);
    }

    /**
     * Get the jabatan through masterflow step.
     */
    public function jabatan()
    {
        return $this->masterflowStep?->jabatan ?? null;
    }

    /**
     * Get the step order from masterflow step or approval_order.
     */
    public function getStepOrderAttribute(): int
    {
        return $this->masterflowStep?->step_order ?? $this->approval_order ?? 0;
    }

    /**
     * Get the step name from masterflow step or fallback.
     */
    public function getStepNameAttribute(): string
    {
        return $this->masterflowStep?->step_name ?? ('Tahap ' . ($this->approval_order ?? 1));
    }

    /**
     * Check if approval is overdue.
     */
    public function isOverdue(): bool
    {
        if (!$this->tgl_deadline || $this->approval_status !== 'pending') {
            return false;
        }

        return Carbon::now()->isAfter($this->tgl_deadline);
    }

    /**
     * Get days until deadline.
     */
    public function getDaysUntilDeadlineAttribute(): ?int
    {
        if (!$this->tgl_deadline || $this->approval_status !== 'pending') {
            return null;
        }

        return Carbon::now()->diffInDays($this->tgl_deadline, false);
    }

    /**
     * Check if this approval is pending.
     */
    public function isPending(): bool
    {
        return $this->approval_status === 'pending';
    }

    /**
     * Check if this approval is approved.
     */
    public function isApproved(): bool
    {
        return $this->approval_status === 'approved';
    }

    /**
     * Check if this approval is rejected.
     */
    public function isRejected(): bool
    {
        return $this->approval_status === 'rejected';
    }

    /**
     * Check if this approval can currently be approved.
     * This validates that all previous steps are completed (approved/skipped).
     */
    public function canCurrentlyApprove(): bool
    {
        // Must be pending first
        if (!$this->isPending()) {
            return false;
        }

        // Get the step order of this approval (masterflow step order or approval_order)
        $currentStepOrder = $this->masterflowStep?->step_order ?? $this->approval_order ?? 1;

        // If this is the first step, no previous steps to check
        if ($currentStepOrder <= 1) {
            return true;
        }

        // Get all approvals for this document with lower step order
        $previousApprovals = self::where('dokumen_id', $this->dokumen_id)
            ->where(function ($query) use ($currentStepOrder) {
                $query->whereHas('masterflowStep', function ($q) use ($currentStepOrder) {
                    $q->where('step_order', '<', $currentStepOrder);
                })->orWhere(function ($customQ) use ($currentStepOrder) {
                    $customQ->whereNull('masterflow_step_id')
                        ->where('approval_order', '<', $currentStepOrder);
                });
            })
            ->get();

        // If no previous approvals exist, this can be approved
        if ($previousApprovals->isEmpty()) {
            return true;
        }

        // Check if all previous approvals are completed (approved or skipped)
        foreach ($previousApprovals as $previousApproval) {
            if (!in_array($previousApproval->approval_status, ['approved', 'skipped'])) {
                return false;
            }
        }

        return true;
    }

    /**
     * Approve this approval.
     */
    public function approve(string $comment = null): bool
    {
        return $this->update([
            'approval_status' => 'approved',
            'tgl_approve' => now(),
            'comment' => $comment,
        ]);
    }

    /**
     * Reject this approval.
     */
    public function reject(string $reason, string $comment = null): bool
    {
        return $this->update([
            'approval_status' => 'rejected',
            'tgl_approve' => now(),
            'alasan_reject' => $reason,
            'comment' => $comment,
        ]);
    }

    /**
     * Check if this approval has revision requested.
     */
    public function isRevisionRequested(): bool
    {
        return $this->approval_status === 'revision_requested';
    }

    /**
     * Request revision for this approval.
     */
    public function requestRevision(string $notes, int $requestedBy): bool
    {
        return $this->update([
            'approval_status' => 'revision_requested',
            'revision_notes' => $notes,
            'revision_requested_by' => $requestedBy,
            'revision_requested_at' => now(),
        ]);
    }

    /**
     * Get the user who requested revision.
     */
    public function revisionRequester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revision_requested_by');
    }

    /**
     * Scope to filter by status.
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('approval_status', $status);
    }

    /**
     * Scope to get pending approvals.
     */
    public function scopePending($query)
    {
        return $query->where('approval_status', 'pending');
    }

    /**
     * Scope to get approved approvals.
     */
    public function scopeApproved($query)
    {
        return $query->where('approval_status', 'approved');
    }

    /**
     * Scope to get rejected approvals.
     */
    public function scopeRejected($query)
    {
        return $query->where('approval_status', 'rejected');
    }

    /**
     * Scope to get overdue approvals.
     */
    public function scopeOverdue($query)
    {
        return $query->where('approval_status', 'pending')
            ->where('tgl_deadline', '<', now());
    }

    /**
     * Scope to filter by user (by user_id, by approver_email, or by user's Jabatan).
     */
    public function scopeByUser($query, $userId)
    {
        $user = \App\Models\User::with('userAuths')->find($userId);
        if (!$user) {
            return $query->where('user_id', $userId);
        }

        $userEmail = strtolower($user->email);
        $userJabatanIds = $user->userAuths ? $user->userAuths->pluck('jabatan_id')->filter()->toArray() : [];

        return $query->where(function ($q) use ($userId, $userEmail, $userJabatanIds) {
            $q->where('user_id', $userId)
              ->orWhereRaw('LOWER(approver_email) = ?', [$userEmail])
              ->orWhereHas('dokumen', function ($docQuery) use ($userId) {
                  $docQuery->where('user_id', $userId);
              });

            if (!empty($userJabatanIds)) {
                $q->orWhereHas('masterflowStep', function ($stepQuery) use ($userJabatanIds) {
                    $stepQuery->whereIn('jabatan_id', $userJabatanIds);
                });
            }
        });
    }

    /**
     * Scope to order by step order.
     */
    public function scopeOrderedByStep($query)
    {
        return $query->join('masterflow_steps', 'dokumen_approval.masterflow_step_id', '=', 'masterflow_steps.id')
            ->orderBy('masterflow_steps.step_order');
    }

    /**
     * Get the full URL of the signature file.
     */
    public function getSignatureUrlAttribute(): ?string
    {
        if (!$this->signature_path) {
            return null;
        }

        return \Illuminate\Support\Facades\Storage::url($this->signature_path);
    }
}
