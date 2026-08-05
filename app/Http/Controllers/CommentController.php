<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Dokumen;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CommentController extends Controller
{
    /**
     * Display a listing of comments for a specific document.
     */
    public function index(Request $request, Dokumen $dokumen)
    {
        $query = $dokumen->comments()
            ->with(['user.profile'])
            ->orderBy('created_at_custom', 'desc');

        // Search comments
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Filter by user
        if ($request->filled('user_id')) {
            $query->byUser($request->user_id);
        }

        // Filter recent comments
        if ($request->filled('recent') && $request->recent) {
            $query->recent();
        }

        $comments = $query->paginate(20)->withQueryString();

        return Inertia::render('Comment/Index', [
            'dokumen' => $dokumen->load(['user', 'masterflow']),
            'comments' => $comments,
            'filters' => $request->only(['search', 'user_id', 'recent']),
        ]);
    }

    /**
     * Store a newly created comment.
     */
    public function store(Request $request, Dokumen $dokumen)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:2000',
        ]);

        $comment = Comment::create([
            'dokumen_id' => $dokumen->id,
            'content' => $validated['content'],
            'user_id' => Auth::id(),
            'created_at_custom' => now(),
        ]);

        // Load relationships for response
        $comment->load(['user.profile']);

        // Return JSON response for AJAX requests
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'comment' => $comment,
                'message' => 'Komentar berhasil ditambahkan!'
            ]);
        }

        return back()->with('success', 'Komentar berhasil ditambahkan!');
    }

    /**
     * Display the specified comment.
     */
    public function show(Dokumen $dokumen, Comment $comment)
    {
        // Ensure comment belongs to document
        if ($comment->dokumen_id !== $dokumen->id) {
            abort(404);
        }

        $comment->load(['user.profile', 'dokumen.user']);

        return Inertia::render('Comment/Show', [
            'dokumen' => $dokumen,
            'comment' => $comment,
        ]);
    }

    /**
     * Show the form for editing the specified comment.
     */
    public function edit(Dokumen $dokumen, Comment $comment)
    {
        // Only allow edit if user owns the comment
        if ($comment->user_id !== Auth::id()) {
            return redirect()->route('comment.show', [$dokumen, $comment])
                ->withErrors(['error' => 'Anda tidak dapat mengedit komentar ini.']);
        }

        return Inertia::render('Comment/Edit', [
            'dokumen' => $dokumen,
            'comment' => $comment,
        ]);
    }

    /**
     * Update the specified comment.
     */
    public function update(Request $request, Dokumen $dokumen, Comment $comment)
    {
        // Only allow update if user owns the comment
        if ($comment->user_id !== Auth::id()) {
            return back()->withErrors(['error' => 'Anda tidak dapat mengedit komentar ini.']);
        }

        // Only allow edit within 30 minutes of creation
        if ($comment->created_at_custom->diffInMinutes(now()) > 30) {
            return back()->withErrors(['error' => 'Komentar hanya dapat diedit dalam 30 menit setelah dibuat.']);
        }

        $validated = $request->validate([
            'content' => 'required|string|max:2000',
        ]);

        $comment->update(['content' => $validated['content']]);

        // Return JSON response for AJAX requests
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'comment' => $comment,
                'message' => 'Komentar berhasil diupdate!'
            ]);
        }

        return redirect()->route('comment.show', [$dokumen, $comment])
            ->with('success', 'Komentar berhasil diupdate!');
    }

    /**
     * Remove the specified comment.
     */
    public function destroy(Request $request, Dokumen $dokumen, Comment $comment)
    {
        // Only allow delete if user owns the comment or is document owner
        if ($comment->user_id !== Auth::id() && $dokumen->user_id !== Auth::id()) {
            return back()->withErrors(['error' => 'Anda tidak dapat menghapus komentar ini.']);
        }

        $comment->delete();

        // Return JSON response for AJAX requests
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Komentar berhasil dihapus!'
            ]);
        }

        return back()->with('success', 'Komentar berhasil dihapus!');
    }

    /**
     * Get comments via AJAX for real-time updates.
     */
    public function getComments(Request $request, Dokumen $dokumen)
    {
        $comments = $dokumen->comments()
            ->with(['user.profile'])
            ->orderBy('created_at_custom', 'desc')
            ->limit(50)
            ->get();

        return response()->json([
            'comments' => $comments,
            'total' => $dokumen->comments()->count(),
        ]);
    }

    /**
     * Reply to a comment (nested comments).
     */
    public function reply(Request $request, Dokumen $dokumen, Comment $comment)
    {
        $validated = $request->validate([
            'content' => 'required|string|max:2000',
        ]);

        // Create reply as a new comment with reference to parent
        $reply = Comment::create([
            'dokumen_id' => $dokumen->id,
            'content' => "@{$comment->user->name}: {$validated['content']}",
            'user_id' => Auth::id(),
            'created_at_custom' => now(),
        ]);

        $reply->load(['user.profile']);

        // Return JSON response for AJAX requests
        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'comment' => $reply,
                'message' => 'Reply berhasil ditambahkan!'
            ]);
        }

        return back()->with('success', 'Reply berhasil ditambahkan!');
    }

    /**
     * Get comment statistics for a document.
     */
    public function stats(Dokumen $dokumen)
    {
        $stats = [
            'total' => $dokumen->comments()->count(),
            'recent' => $dokumen->comments()->recent()->count(),
            'users' => $dokumen->comments()
                ->distinct('user_id')
                ->count('user_id'),
            'latest' => $dokumen->comments()
                ->with(['user.profile'])
                ->orderBy('created_at_custom', 'desc')
                ->first(),
        ];

        return response()->json($stats);
    }

    /**
     * Search comments across all documents user has access to.
     */
    public function search(Request $request)
    {
        $validated = $request->validate([
            'q' => 'required|string|min:3|max:100',
        ]);

        // Get documents user has access to (owner or has approval)
        $accessibleDocuments = collect();

        // Documents user owns
        $ownDocuments = Dokumen::byUser(Auth::id())->pluck('id');
        $accessibleDocuments = $accessibleDocuments->merge($ownDocuments);

        // Documents user has approval access to
        $approvalDocuments = \App\Models\DokumenApproval::byUser(Auth::id())
            ->pluck('dokumen_id');
        $accessibleDocuments = $accessibleDocuments->merge($approvalDocuments);

        $accessibleDocuments = $accessibleDocuments->unique();

        $comments = Comment::whereIn('dokumen_id', $accessibleDocuments)
            ->search($validated['q'])
            ->with(['user.profile', 'dokumen'])
            ->orderBy('created_at_custom', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('Comment/Search', [
            'comments' => $comments,
            'query' => $validated['q'],
        ]);
    }

    /**
     * Mark comment as important/pinned.
     */
    public function pin(Request $request, Dokumen $dokumen, Comment $comment)
    {
        // Only document owner can pin comments
        if ($dokumen->user_id !== Auth::id()) {
            return back()->withErrors(['error' => 'Hanya pemilik dokumen yang dapat pin komentar.']);
        }

        // For now, we'll use a simple approach - update dokumen's comment_id
        $dokumen->update(['comment_id' => $comment->id]);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Komentar berhasil di-pin!'
            ]);
        }

        return back()->with('success', 'Komentar berhasil di-pin!');
    }

    /**
     * Unpin comment.
     */
    public function unpin(Request $request, Dokumen $dokumen)
    {
        // Only document owner can unpin comments
        if ($dokumen->user_id !== Auth::id()) {
            return back()->withErrors(['error' => 'Hanya pemilik dokumen yang dapat unpin komentar.']);
        }

        $dokumen->update(['comment_id' => null]);

        if ($request->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Komentar berhasil di-unpin!'
            ]);
        }

        return back()->with('success', 'Komentar berhasil di-unpin!');
    }
}
