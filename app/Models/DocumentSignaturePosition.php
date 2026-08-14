<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentSignaturePosition extends Model
{
    protected $table = 'document_signature_positions';

    protected $fillable = [
        'dokumen_id',
        'dokumen_approval_id',
        'page',
        'x',
        'y',
        'width',
        'height',
    ];

    public function dokumen()
    {
        return $this->belongsTo(Dokumen::class);
    }

    public function dokumenApproval()
    {
        return $this->belongsTo(DokumenApproval::class);
    }
}
