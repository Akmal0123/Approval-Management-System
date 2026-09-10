<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        // Web SPA & local development
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8000',
        'http://192.168.49.141:3000',
        'http://192.168.49.141:5173',
        'http://192.168.49.141:8000',
        // TODO: Tambahkan domain aplikasi partner perusahaan di sini
        // Contoh: 'https://portal-karyawan.perusahaan.com',
        //         'https://hr-system.perusahaan.com',
    ],

    'allowed_origins_patterns' => [],

    // '*' sudah mencakup Authorization, Content-Type, Accept, X-Requested-With
    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    // true diperlukan untuk Sanctum session cookie (web SPA).
    // Endpoint JWT eksternal (/api/auth/jwt/*, /api/v1/*) tidak mengirim cookie,
    // namun setting ini tidak mengganggu karena JWT dibaca dari Authorization header.
    'supports_credentials' => true,

];
