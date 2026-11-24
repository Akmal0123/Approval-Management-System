<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule deadline reminders to run daily at 8:00 AM
Schedule::command('approvals:send-reminders')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/deadline-reminders.log'));

// Schedule sinkronisasi otomatis berkala data lookup eksternal (PO & PR) menjadi dokumen draft untuk akun Super Admin
Schedule::command('ams:sync-lookup-drafts')
    ->everyMinute()
    ->withoutOverlapping()
    ->runInBackground()
    ->appendOutputTo(storage_path('logs/lookup-sync.log'));

