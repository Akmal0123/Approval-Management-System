<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Models\DocumentSignaturePosition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SignaturePositionController extends Controller
{
    /**
     * Get signature positions for a document
     */
    public function index($dokumenId)
    {
        $dokumen = Dokumen::findOrFail($dokumenId);
        
        $positions = DocumentSignaturePosition::where('dokumen_id', $dokumen->id)
            ->get();
            
        return response()->json([
            'positions' => $positions
        ]);
    }

    /**
     * Save signature positions for a document
     */
    public function store(Request $request, $dokumenId)
    {
        $dokumen = Dokumen::findOrFail($dokumenId);
        
        // Ensure user is the owner or an assigned approver
        $isApprover = \App\Models\DokumenApproval::where('dokumen_id', $dokumen->id)
            ->where('user_id', auth()->id())
            ->exists();

        if ($dokumen->user_id !== auth()->id() && !$isApprover) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'positions' => 'required|array',
            'positions.*.dokumen_approval_id' => [
                'nullable',
                function ($attribute, $value, $fail) {
                    if (
                        $value !== 'qr_code' &&
                        !str_starts_with((string)$value, 'qr_code') &&
                        !empty($value) &&
                        !\App\Models\DokumenApproval::where('id', $value)->exists()
                    ) {
                        $fail("The selected {$attribute} is invalid.");
                    }
                }
            ],
            'positions.*.page' => 'required|integer|min:1',
            'positions.*.x' => 'required|numeric',
            'positions.*.y' => 'required|numeric',
            'positions.*.width' => 'required|numeric',
            'positions.*.height' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        DB::beginTransaction();
        try {
            // Delete existing positions for this document
            DocumentSignaturePosition::where('dokumen_id', $dokumen->id)->delete();

            // Insert new positions
            $positionsData = array_map(function($pos) use ($dokumen) {
                $approvalId = $pos['dokumen_approval_id'];
                if ($approvalId === 'qr_code' || str_starts_with((string)$approvalId, 'qr_code') || empty($approvalId)) {
                    $approvalId = null;
                }
                return [
                    'dokumen_id' => $dokumen->id,
                    'dokumen_approval_id' => $approvalId,
                    'page' => $pos['page'],
                    'x' => $pos['x'],
                    'y' => $pos['y'],
                    'width' => $pos['width'],
                    'height' => $pos['height'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }, $request->positions);

            DocumentSignaturePosition::insert($positionsData);

            DB::commit();

            return response()->json([
                'message' => 'Signature positions saved successfully',
                'positions' => DocumentSignaturePosition::where('dokumen_id', $dokumen->id)->get()
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to save signature positions: ' . $e->getMessage()], 500);
        }
    }
}
