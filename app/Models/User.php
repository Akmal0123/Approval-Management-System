<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'pin',
        'google_id',
        'google_token',
        'google_refresh_token',
        'email_preferences',
        'last_context_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'pin',
        'remember_token',
        'google_token',
        'google_refresh_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'email_preferences' => 'array',
        ];
    }

    /**
     * Get the user's profile.
     */
    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    /**
     * Get the user's authorizations.
     */
    public function userAuths()
    {
        return $this->hasMany(UsersAuth::class);
    }

    /**
     * Get the user's authorizations with relationships.
     */
    public function user_auths()
    {
        return $this->hasMany(UsersAuth::class);
    }

    /**
     * Get masterflows available for this user's company.
     */
    public function availableMasterflows()
    {
        if ($this->user_auths->isEmpty()) {
            return collect();
        }

        $companyId = $this->user_auths->first()->company_id;

        return Masterflow::where('company_id', $companyId)
            ->where('is_active', true)
            ->with(['steps.jabatan'])
            ->orderBy('name')
            ->get();
    }

    /**
     * Get the user's company.
     */
    public function getCompany()
    {
        if ($this->user_auths->isEmpty()) {
            return null;
        }

        return $this->user_auths->first()->company;
    }

    /**
     * Get the user's signatures.
     */
    public function signatures()
    {
        return $this->hasMany(Signature::class);
    }

    /**
     * Get the user's default signature.
     */
    public function defaultSignature()
    {
        return $this->hasOne(Signature::class)->where('is_default', true);
    }

    /**
     * Get the user's last used context.
     */
    public function lastContext()
    {
        return $this->belongsTo(UsersAuth::class, 'last_context_id');
    }

    // =========================================================================
    // JWT Subject Interface Implementation
    // =========================================================================

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     */
    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     * Aplikasi eksternal dapat membaca role & context langsung dari token
     * tanpa perlu panggil API tambahan ke AMS.
     */
    public function getJWTCustomClaims(): array
    {
        // Ambil context aktif user (last_context_id)
        $context = $this->lastContext()->with(['role', 'company'])->first();

        return [
            'name'       => $this->name,
            'email'      => $this->email,
            'role'       => $context?->role?->role_name ?? null,
            'company_id' => $context?->company_id ?? null,
            'company'    => $context?->company?->name ?? null,
            'context_id' => $this->last_context_id,
        ];
    }
}
