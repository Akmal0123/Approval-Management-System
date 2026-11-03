<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DokumenHash extends Model
{
    use HasFactory;

    protected $table = 'dokumen_hashes';

    protected $fillable = [
        'dokumen_id',
        'dokumen_version_id',
        'dokumen_approval_id',
        'sha256_hash',
        'hash_type',
        'file_path',
        'file_size',
        'step_order',
        'approver_name',
        'note',
    ];

    public function dokumen(): BelongsTo
    {
        return $this->belongsTo(Dokumen::class, 'dokumen_id');
    }

    public function dokumenVersion(): BelongsTo
    {
        return $this->belongsTo(DokumenVersion::class, 'dokumen_version_id');
    }

    public function dokumenApproval(): BelongsTo
    {
        return $this->belongsTo(DokumenApproval::class, 'dokumen_approval_id');
    }
}

