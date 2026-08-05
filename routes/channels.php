<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Public channel for dokumen updates (detail page)
Broadcast::channel('dokumen.{id}', function ($user, $id) {
    return true; // Public channel - anyone can listen
});

// Public channel for user-specific dokumen updates (list page)
Broadcast::channel('user.{userId}.dokumen', function ($user, $userId) {
    return true; // Public channel - anyone can listen
});

// Public channel for role management (everyone can listen)
Broadcast::channel('role-management', function () {
    return true; // Public channel
});

// Channel for browser notifications (public, per-user)
Broadcast::channel('user.{userId}.notifications', function () {
    return true; // Public channel - anyone can listen
});

// Private channel example (if needed)
// Broadcast::channel('role-management-private', function ($user) {
//     return $user->role === 'admin'; // Only admins can listen
// });
