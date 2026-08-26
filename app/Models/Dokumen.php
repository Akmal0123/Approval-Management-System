<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Dokumen extends Model
{
    use HasFactory;

    /**
     * Get the route key name for Laravel's route model binding.
     * This fixes the issue with Laravel's pluralization of "dokumen" to "dokuman"
     */
    public function getRouteKeyName()
    {
        return 'id';
    }

    /**
     * The table associated with the model.
     */
    protected $table = 'dokumen';

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'nomor_dokumen',
        'judul_dokumen',
        'tipe_dokumen',
        'nominal',
        'user_id',
        'company_id',
        'aplikasi_id',
        'masterflow_id',
        'comment_id',
        'status',
        'qr_code_path',
        'qr_code_hash',
        'tgl_pengajuan',
        'tgl_deadline',
        'deskripsi',
        'status_current',
    ];

    /**
     * The attributes that should be cast.
     */
    protected $casts = [
        'tgl_pengajuan' => 'date',
        'tgl_deadline' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who created this document.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the masterflow for this document.
     */
    public function masterflow(): BelongsTo
    {
        return $this->belongsTo(Masterflow::class);
    }

    /**
     * Get the company for this document.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get the aplikasi for this document.
     */
    public function aplikasi(): BelongsTo
    {
        return $this->belongsTo(Aplikasi::class);
    }

    /**
     * Get the main comment for this document.
     */
    public function mainComment(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'comment_id');
    }

    /**
     * Get all versions of this document.
     */
    public function versions(): HasMany
    {
        return $this->hasMany(DokumenVersion::class)->orderBy('created_at', 'desc');
    }

    /**
     * Get the latest version of this document.
     */
    public function latestVersion()
    {
        return $this->hasOne(DokumenVersion::class)->latest();
    }

    /**
     * Get all approvals for this document.
     */
    public function approvals(): HasMany
    {
        return $this->hasMany(DokumenApproval::class);
    }

    /**
     * Get all signature positions for this document.
     */
    public function signaturePositions(): HasMany
    {
        return $this->hasMany(DocumentSignaturePosition::class);
    }

    /**
     * Get all comments for this document.
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->orderBy('created_at_custom', 'desc');
    }

    /**
     * Get all revision logs for this document.
     */
    public function revisionLogs(): HasMany
    {
        return $this->hasMany(RevisionLog::class)->orderBy('created_at', 'desc');
    }

    /**
     * Check if document needs revision (step-level revision requested).
     */
    public function needsRevision(): bool
    {
        return $this->status === 'needs_revision' ||
            $this->approvals()->where('approval_status', 'revision_requested')->exists();
    }

    /**
     * Get pending approvals for this document.
     */
    public function pendingApprovals(): HasMany
    {
        return $this->hasMany(DokumenApproval::class)->where('approval_status', 'pending');
    }

    /**
     * Check if document is fully approved.
     */
    public function isFullyApproved(): bool
    {
        return $this->approvals()->whereIn('approval_status', ['pending', 'waiting'])->count() === 0 &&
            $this->approvals()->where('approval_status', 'approved')->count() > 0;
    }

    /**
     * Check if document has been rejected.
     */
    public function isRejected(): bool
    {
        return $this->approvals()->where('approval_status', 'rejected')->exists();
    }

    /**
     * Get approval progress percentage.
     */
    public function getApprovalProgress(): float
    {
        $totalApprovals = $this->approvals()->count();
        if ($totalApprovals === 0) return 0;

        $approvedCount = $this->approvals()->where('approval_status', 'approved')->count();
        return ($approvedCount / $totalApprovals) * 100;
    }

    /**
     * Get next pending approvers information.
     */
    public function getNextApprovers(): array
    {
        // Get all pending approvals
        $pendingApprovals = $this->approvals()
            ->where('approval_status', 'pending')
            ->with(['user', 'masterflowStep.jabatan'])
            ->get();

        if ($pendingApprovals->isEmpty()) {
            return [];
        }

        // Map effective order (from approval_order or masterflowStep step_order)
        $mapped = $pendingApprovals->map(function ($approval) {
            $effectiveOrder = $approval->approval_order ?? ($approval->masterflowStep?->step_order ?? 1);
            return [
                'id' => $approval->id,
                'user' => $approval->user,
                'approver_email' => $approval->approver_email,
                'step_name' => $approval->masterflowStep?->step_name,
                'jabatan_name' => $approval->masterflowStep?->jabatan?->name,
                'approval_order' => $effectiveOrder,
                'group_index' => $approval->group_index,
                'jenis_group' => $approval->jenis_group,
                'tgl_deadline' => $approval->tgl_deadline,
            ];
        });

        // Find the lowest effective order
        $nextOrder = $mapped->min('approval_order');

        // Filter all approvers at this lowest order
        return $mapped->where('approval_order', $nextOrder)->values()->toArray();
    }

    /**
     * Get current approval step description.
     */
    public function getCurrentStepDescription(): ?string
    {
        $nextApprovers = $this->getNextApprovers();

        if (empty($nextApprovers)) {
            if ($this->isFullyApproved()) {
                return 'Dokumen telah disetujui oleh semua pihak';
            } elseif ($this->isRejected()) {
                return 'Dokumen ditolak';
            } elseif ($this->status === 'draft') {
                return 'Draft (Belum diajukan)';
            }
            return 'Menunggu Persetujuan Admin / Approver';
        }

        $firstApprover = $nextApprovers[0];
        $stepName = $firstApprover['step_name'] ?? 'Approval';
        $jenisGroup = $firstApprover['jenis_group'];

        if (count($nextApprovers) > 1 && $jenisGroup) {
            // Group approval
            switch ($jenisGroup) {
                case 'all_required':
                    $names = collect($nextApprovers)->pluck('user.name')->filter()->implode(', ');
                    return "Menunggu persetujuan dari semua: {$names} ({$stepName})";
                case 'any_one':
                    $names = collect($nextApprovers)->pluck('user.name')->filter()->implode(', ');
                    return "Menunggu persetujuan dari salah satu: {$names} ({$stepName})";
                case 'majority':
                    $count = count($nextApprovers);
                    $names = collect($nextApprovers)->pluck('user.name')->filter()->implode(', ');
                    return "Menunggu persetujuan mayoritas dari: {$names} ({$stepName})";
            }
        }

        // Single approver
        $name = $firstApprover['user']['name'] ?? $firstApprover['approver_email'] ?? 'Approver';
        return "Menunggu persetujuan dari {$name} ({$stepName})";
    }

    /**
     * Get approval status with step information.
     */
    public function getDetailedStatus(): array
    {
        return [
            'status' => $this->status,
            'status_current' => $this->status_current,
            'is_fully_approved' => $this->isFullyApproved(),
            'is_rejected' => $this->isRejected(),
            'next_approvers' => $this->getNextApprovers(),
            'current_step_description' => $this->getCurrentStepDescription(),
            'approval_progress' => $this->getApprovalProgress(),
        ];
    }

    /**
     * Scope to filter by status.
     */
    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to filter by current status.
     */
    public function scopeByCurrentStatus($query, $currentStatus)
    {
        return $query->where('status_current', $currentStatus);
    }

    /**
     * Scope to filter by user.
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
