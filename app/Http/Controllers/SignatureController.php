<?php

namespace App\Http\Controllers;

use App\Models\Signature;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SignatureController extends Controller
{
    /**
     * Get all signatures for the authenticated user.
     */
    public function index()
    {
        // Purge orphaned signatures whose physical files do not exist on disk
        $allSignatures = Signature::byUser(Auth::id())->get();
        foreach ($allSignatures as $sig) {
            $fullPath = Storage::disk('public')->path($sig->signature_path);
            if (!file_exists($fullPath)) {
                $sig->forceDelete();
            } else {
                $this->processSignatureImage($fullPath);
            }
        }

        $signatures = Signature::byUser(Auth::id())
            ->orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'signatures' => $signatures,
        ]);
    }

    /**
     * Store a new signature.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'signature' => 'required|string', // Base64 encoded image
            'signature_type' => 'required|in:manual,uploaded',
            'is_default' => 'boolean',
        ]);

        try {
            // Decode base64 image
            $signatureData = $validated['signature'];

            // Check if it's a base64 string
            $ext = 'png';
            if (str_starts_with($signatureData, 'data:image')) {
                if (str_contains($signatureData, 'image/jpeg') || str_contains($signatureData, 'image/jpg')) {
                    $ext = 'jpg';
                }
                // Safely extract base64 data regardless of mime header
                $image = preg_replace('/^data:image\/\w+;base64,/', '', $signatureData);
                $image = str_replace(' ', '+', $image);
                $imageData = base64_decode($image);
            } else {
                return response()->json([
                    'message' => 'Invalid signature format',
                ], 422);
            }

            // Generate filename with correct extension
            $filename = 'signature_' . time() . '_' . Str::random(10) . '.' . $ext;
            $path = 'signatures/user_' . Auth::id() . '/' . $filename;

            // Store the image
            Storage::disk('public')->put($path, $imageData);

            // Ensure background is solid white (prevents black background box for transparent PNGs)
            $fullPath = Storage::disk('public')->path($path);
            $this->processSignatureImage($fullPath);

            // Create signature record
            $signature = Signature::create([
                'user_id' => Auth::id(),
                'signature_path' => $path,
                'signature_type' => $validated['signature_type'],
                'is_default' => $validated['is_default'] ?? false,
            ]);

            // If this is set as default, update others
            if ($signature->is_default) {
                $signature->setAsDefault();
            }

            return response()->json([
                'message' => 'Tanda tangan berhasil disimpan!',
                'signature' => $signature,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal menyimpan tanda tangan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Upload signature file.
     */
    public function upload(Request $request)
    {
        $validated = $request->validate([
            'signature_file' => 'required|image|mimes:png,jpg,jpeg|max:2048', // Max 2MB
            'is_default' => 'boolean',
        ]);

        try {
            $file = $request->file('signature_file');

            // Generate filename
            $filename = 'uploaded_' . time() . '_' . Str::random(10) . '.' . $file->getClientOriginalExtension();
            $path = 'signatures/user_' . Auth::id() . '/' . $filename;

            // Store the file
            $file->storeAs('signatures/user_' . Auth::id(), $filename, 'public');

            // Ensure background is solid white (prevents black background box for transparent PNGs)
            $fullPath = Storage::disk('public')->path($path);
            $this->processSignatureImage($fullPath);

            // Create signature record
            $signature = Signature::create([
                'user_id' => Auth::id(),
                'signature_path' => $path,
                'signature_type' => 'uploaded',
                'is_default' => $validated['is_default'] ?? false,
            ]);

            // If this is set as default, update others
            if ($signature->is_default) {
                $signature->setAsDefault();
            }

            return response()->json([
                'message' => 'Tanda tangan berhasil diupload!',
                'signature' => $signature,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal mengupload tanda tangan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Set a signature as default.
     */
    public function setDefault(Signature $signature)
    {
        // Ensure user owns this signature
        if ($signature->user_id !== Auth::id()) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        try {
            $signature->setAsDefault();

            return response()->json([
                'message' => 'Tanda tangan default berhasil diupdate!',
                'signature' => $signature->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal mengupdate tanda tangan default: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete a signature.
     */
    public function destroy(Signature $signature)
    {
        // Ensure user owns this signature
        if ($signature->user_id !== Auth::id()) {
            return response()->json([
                'message' => 'Unauthorized',
            ], 403);
        }

        try {
            // If this is the default signature, check if user has other signatures
            if ($signature->is_default) {
                $otherSignatures = Signature::byUser(Auth::id())
                    ->where('id', '!=', $signature->id)
                    ->exists();

                if ($otherSignatures) {
                    // Set the first other signature as default
                    $newDefault = Signature::byUser(Auth::id())
                        ->where('id', '!=', $signature->id)
                        ->first();

                    $newDefault->update(['is_default' => true]);
                }
            }

            $signature->delete(); // Soft delete and file will be auto-deleted

            return response()->json([
                'message' => 'Tanda tangan berhasil dihapus!',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal menghapus tanda tangan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Process signature image to composite onto a clean solid white background.
     * Prevents transparent PNGs from turning into solid black blocks in storage/previews.
     */
    private function processSignatureImage(string $fullPath): void
    {
        if (!file_exists($fullPath)) return;

        $imageInfo = @getimagesize($fullPath);
        if (!$imageInfo) return;

        try {
            $srcImg = null;
            if ($imageInfo[2] === IMAGETYPE_PNG && function_exists('imagecreatefrompng')) {
                $srcImg = @imagecreatefrompng($fullPath);
            } elseif ($imageInfo[2] === IMAGETYPE_JPEG && function_exists('imagecreatefromjpeg')) {
                $srcImg = @imagecreatefromjpeg($fullPath);
            }

            if ($srcImg) {
                $width = imagesx($srcImg);
                $height = imagesy($srcImg);

                // Create truecolor image with solid white background
                $destImg = imagecreatetruecolor($width, $height);
                $white = imagecolorallocate($destImg, 255, 255, 255);
                imagefill($destImg, 0, 0, $white);

                // Preserve ink strokes and composite alpha channel over white background
                imagealphablending($srcImg, true);
                imagealphablending($destImg, true);
                imagecopy($destImg, $srcImg, 0, 0, 0, 0, $width, $height);

                // Save image matching file extension
                if ($imageInfo[2] === IMAGETYPE_PNG) {
                    imagealphablending($destImg, false);
                    imagesavealpha($destImg, false); // Disable alpha channel to ensure solid white 24-bit RGB PNG
                    imagepng($destImg, $fullPath);
                } else {
                    imagejpeg($destImg, $fullPath, 95);
                }

                imagedestroy($srcImg);
                imagedestroy($destImg);
            }
        } catch (\Throwable $t) {
            // Ignore if processing fails
        }
    }
}
