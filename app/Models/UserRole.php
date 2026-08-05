<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserRole extends Model
{
    use HasFactory;

    protected $table = 'usersroles';

    protected $fillable = [
        'role_name',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get all users that have this role.
     */
    public function users()
    {
        return $this->hasMany(User::class, 'role_id');
    }

    /**
     * Scope to search roles by name
     */
    public function scopeSearch($query, $search)
    {
        return $query->where('role_name', 'LIKE', '%' . $search . '%');
    }

    /**
     * Get formatted role name for display
     */
    public function getFormattedRoleNameAttribute()
    {
        return ucwords(str_replace('_', ' ', $this->role_name));
    }
}
