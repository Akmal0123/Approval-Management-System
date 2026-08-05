<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Masterflow extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'company_id',
        'name',
        'description',
        'is_active',
        'total_steps',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'total_steps' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the company that owns this masterflow.
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * Get all steps for this masterflow.
     */
    public function steps(): HasMany
    {
        return $this->hasMany(MasterflowStep::class)->orderBy('step_order');
    }

    /**
     * Get active steps for this masterflow.
     */
    public function activeSteps(): HasMany
    {
        return $this->hasMany(MasterflowStep::class)
            ->where('is_required', true)
            ->orderBy('step_order');
    }

    /**
     * Scope a query to only include active masterflows.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to filter by company.
     */
    public function scopeForCompany($query, $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    /**
     * Scope a query to filter by current user's company.
     */
    public function scopeForCurrentUserCompany($query, $user)
    {
        if ($user && $user->user_auths->isNotEmpty()) {
            $companyId = $user->user_auths->first()->company_id;
            return $query->where('company_id', $companyId);
        }
        return $query;
    }

    /**
     * Update total steps count.
     */
    public function updateTotalSteps()
    {
        $this->update(['total_steps' => $this->steps()->count()]);
    }

    /**
     * Get the next step order for this masterflow.
     */
    public function getNextStepOrder(): int
    {
        return $this->steps()->max('step_order') + 1;
    }
}
