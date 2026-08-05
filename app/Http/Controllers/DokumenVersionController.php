<?php

namespace App\Http\Controllers;

use App\Models\Dokumen;
use App\Models\DokumenVersion;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DokumenVersionController extends Controller
{
    /**
     * Display a listing of the resource for a specific document.
     */
    public function index(Dokumen $dokumen)
    {
        $versions = $dokumen->versions()
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('DokumenVersion/Index', [
            'dokumen' => $dokumen->load(['user', 'masterflow']),
            'versions' => $versions,
        ]);
    }

    /**
     * Show the form for creating a new version.
     */
    public function create(Dokumen $dokumen)
    {
        // Only allow creating new version if user is document owner
        if ($dokumen->user_id !== Auth::id()) {
            return redirect()->route('dokumen.show', $dokumen->id)
                ->withErrors(['error' => 'Anda tidak memiliki akses untuk menambah versi dokumen ini.']);
        }

        // Get latest version for version numbering
        $latestVersion = $dokumen->versions()->orderBy('created_at', 'desc')->first();
        $suggestedVersion = $this->generateNextVersion($latestVersion?->version ?? '1.0');

        return Inertia::render('DokumenVersion/Create', [
            'dokumen' => $dokumen,
            'suggestedVersion' => $suggestedVersion,
        ]);
    }

    /**
     * Store a newly created version.
     */
    public function store(Request $request, Dokumen $dokumen)
    {
        // Only allow creating new version if user is document owner
        if ($dokumen->user_id !== Auth::id()) {
            return back()->withErrors(['error' => 'Anda tidak memiliki akses untuk menambah versi dokumen ini.']);
        }

        $validated = $request->validate([
            'version' => [
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($dokumen) {
                    if ($dokumen->versions()->where('version', $value)->exists()) {
                        $fail('Versi ini sudah ada.');
                    }
                },
            ],
            'file' => 'required|file|mimes:pdf|max:10240', // 10MB - Only PDF for digital signature support
            'change_notes' => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            // Store file
            $file = $request->file('file');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('dokumen', $filename, 'public');

            // Create new version
            $version = DokumenVersion::create([
                'dokumen_id' => $dokumen->id,
                'version' => $validated['version'],
                'nama_file' => $file->getClientOriginalName(),
                'tgl_upload' => now(),
                'tipe_file' => $file->getClientOriginalExtension(),
                'file_url' => $path,
                'size_file' => $file->getSize(),
                'status' => 'active',
            ]);

            // Set previous versions to archived
            $dokumen->versions()
                ->where('id', '!=', $version->id)
                ->update(['status' => 'archived']);

            // Add comment if change notes provided
            if ($validated['change_notes']) {
                \App\Models\Comment::create([
                    'dokumen_id' => $dokumen->id,
                    'content' => "Versi {$validated['version']}: {$validated['change_notes']}",
                    'user_id' => Auth::id(),
                    'created_at_custom' => now(),
                ]);
            }

            // If document was rejected, reset it to draft
            if ($dokumen->status === 'rejected') {
                $dokumen->update([
                    'status' => 'draft',
                    'status_current' => 'draft',
                ]);

                // Delete old approvals
                $dokumen->approvals()->delete();
            }

            DB::commit();

            return redirect()->route('dokumen.show', $dokumen->id)
                ->with('success', 'Versi baru berhasil ditambahkan!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal menambah versi: ' . $e->getMessage()]);
        }
    }

    /**
     * Display the specified version.
     */
    public function show(Dokumen $dokumen, DokumenVersion $version)
    {
        // Ensure version belongs to document
        if ($version->dokumen_id !== $dokumen->id) {
            abort(404);
        }

        $version->load(['approvals.user.profile']);

        return Inertia::render('DokumenVersion/Show', [
            'dokumen' => $dokumen->load(['user', 'masterflow']),
            'version' => $version,
            'previousVersion' => $version->previousVersion(),
            'nextVersion' => $version->nextVersion(),
        ]);
    }

    /**
     * Show the form for editing the specified version.
     */
    public function edit(Dokumen $dokumen, DokumenVersion $version)
    {
        // Only allow edit if user is document owner and version is active
        if ($dokumen->user_id !== Auth::id() || $version->status !== 'active') {
            return redirect()->route('dokumen-version.show', [$dokumen, $version])
                ->withErrors(['error' => 'Versi ini tidak dapat diedit.']);
        }

        return Inertia::render('DokumenVersion/Edit', [
            'dokumen' => $dokumen,
            'version' => $version,
        ]);
    }

    /**
     * Update the specified version.
     */
    public function update(Request $request, Dokumen $dokumen, DokumenVersion $version)
    {
        // Only allow update if user is document owner and version is active
        if ($dokumen->user_id !== Auth::id() || $version->status !== 'active') {
            return back()->withErrors(['error' => 'Versi ini tidak dapat diupdate.']);
        }

        $validated = $request->validate([
            'version' => [
                'required',
                'string',
                'max:50',
                function ($attribute, $value, $fail) use ($dokumen, $version) {
                    if ($dokumen->versions()->where('version', $value)->where('id', '!=', $version->id)->exists()) {
                        $fail('Versi ini sudah ada.');
                    }
                },
            ],
        ]);

        $version->update(['version' => $validated['version']]);

        return redirect()->route('dokumen-version.show', [$dokumen, $version])
            ->with('success', 'Versi berhasil diupdate!');
    }

    /**
     * Remove the specified version.
     */
    public function destroy(Dokumen $dokumen, DokumenVersion $version)
    {
        // Only allow delete if user is document owner and it's not the only version
        if ($dokumen->user_id !== Auth::id()) {
            return back()->withErrors(['error' => 'Anda tidak memiliki akses untuk menghapus versi ini.']);
        }

        if ($dokumen->versions()->count() <= 1) {
            return back()->withErrors(['error' => 'Tidak dapat menghapus satu-satunya versi dokumen.']);
        }

        // Delete file from storage
        if (Storage::disk('public')->exists($version->file_url)) {
            Storage::disk('public')->delete($version->file_url);
        }

        $version->delete();

        return redirect()->route('dokumen.show', $dokumen->id)
            ->with('success', 'Versi berhasil dihapus!');
    }

    /**
     * Download specific version file.
     */
    public function download(Dokumen $dokumen, DokumenVersion $version)
    {
        // Ensure version belongs to document
        if ($version->dokumen_id !== $dokumen->id) {
            abort(404);
        }

        if (!Storage::disk('public')->exists($version->file_url)) {
            return back()->withErrors(['error' => 'File tidak ditemukan.']);
        }

        return response()->download(
            Storage::disk('public')->path($version->file_url),
            $version->nama_file
        );
    }

    /**
     * Compare two versions.
     */
    public function compare(Dokumen $dokumen, DokumenVersion $version1, DokumenVersion $version2)
    {
        // Ensure both versions belong to document
        if ($version1->dokumen_id !== $dokumen->id || $version2->dokumen_id !== $dokumen->id) {
            abort(404);
        }

        return Inertia::render('DokumenVersion/Compare', [
            'dokumen' => $dokumen->load(['user', 'masterflow']),
            'version1' => $version1,
            'version2' => $version2,
        ]);
    }

    /**
     * Set version as active.
     */
    public function setActive(Dokumen $dokumen, DokumenVersion $version)
    {
        // Only document owner can set active version
        if ($dokumen->user_id !== Auth::id()) {
            return back()->withErrors(['error' => 'Anda tidak memiliki akses untuk mengubah status versi.']);
        }

        DB::beginTransaction();
        try {
            // Set all versions to archived
            $dokumen->versions()->update(['status' => 'archived']);

            // Set selected version as active
            $version->update(['status' => 'active']);

            DB::commit();

            return back()->with('success', 'Versi berhasil diaktifkan!');
        } catch (\Exception $e) {
            DB::rollback();
            return back()->withErrors(['error' => 'Gagal mengaktifkan versi: ' . $e->getMessage()]);
        }
    }

    /**
     * Generate next version number.
     */
    private function generateNextVersion($currentVersion)
    {
        if (!$currentVersion) {
            return '1.0';
        }

        $parts = explode('.', $currentVersion);
        $major = (int) ($parts[0] ?? 1);
        $minor = (int) ($parts[1] ?? 0);

        // Increment minor version
        $minor++;

        return "{$major}.{$minor}";
    }
}
