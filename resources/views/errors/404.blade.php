<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>404 - Halaman Tidak Ditemukan | Approval Management System</title>
    <link rel="icon" href="/tspm-logo.png" sizes="any">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background-color: #ffffff;
            color: #234621;
            font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            text-align: center;
        }

        .error-container {
            width: 100%;
            max-width: 580px;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px 10px;
        }

        .illustration {
            width: 280px;
            height: auto;
            max-width: 100%;
            margin-bottom: 28px;
            user-select: none;
        }

        .error-title {
            color: #4ba443;
            font-size: clamp(32px, 6vw, 44px);
            font-weight: 700;
            letter-spacing: 2px;
            margin-bottom: 20px;
            line-height: 1.2;
            text-transform: uppercase;
        }

        .error-description {
            color: #52755c;
            font-size: clamp(15px, 2.5vw, 17px);
            line-height: 1.7;
            margin-bottom: 36px;
            max-width: 440px;
        }

        .error-description p {
            margin: 4px 0;
        }

        .error-description .custom-msg {
            color: #234621;
            background-color: #e5f5e3;
            border: 1px solid #caebc7;
            font-weight: 600;
            margin-top: 12px;
            font-size: 14px;
            padding: 8px 16px;
            border-radius: 8px;
            display: inline-block;
        }

        .button-group {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .btn-outline {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 12px 36px;
            border: 2px solid #4ba443;
            border-radius: 9999px;
            background-color: transparent;
            color: #306a2b;
            font-family: inherit;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            box-shadow: 0 2px 8px rgba(75, 164, 67, 0.15);
        }

        .btn-outline:hover {
            background-color: #4ba443;
            color: #ffffff;
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(75, 164, 67, 0.35);
        }

        .btn-outline:active {
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <main class="error-container" role="main">
        <!-- Cute 404 Illustration matching reference design with AMS Green Theme -->
        <svg class="illustration" viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <!-- Ground soft shadow (soft green tint) -->
            <ellipse cx="110" cy="188" rx="65" ry="7" fill="#e8f5e5" />

            <!-- Sparkle / Radiance marks on top-left (AMS green) -->
            <line x1="28" y1="74" x2="18" y2="68" stroke="#4ba443" stroke-width="3" stroke-linecap="round" />
            <line x1="36" y1="62" x2="36" y2="48" stroke="#4ba443" stroke-width="3" stroke-linecap="round" />
            <line x1="48" y1="68" x2="56" y2="58" stroke="#4ba443" stroke-width="3" stroke-linecap="round" />

            <!-- Mini Browser Window with AMS green accent border -->
            <rect x="42" y="80" width="136" height="102" rx="10" fill="#ffffff" stroke="#a2d99c" stroke-width="3.5" />
            <!-- Browser Header Bar Divider -->
            <line x1="42" y1="104" x2="178" y2="104" stroke="#a2d99c" stroke-width="2.5" />
            <!-- 3 Browser Dots -->
            <circle cx="56" cy="92" r="3" fill="#a2d99c" />
            <circle cx="67" cy="92" r="3" fill="#a2d99c" />
            <circle cx="78" cy="92" r="3" fill="#a2d99c" />

            <!-- Sad Face Inside Browser -->
            <!-- Left Eye -->
            <circle cx="94" cy="132" r="4.5" fill="#234621" />
            <!-- Right Eye -->
            <circle cx="126" cy="132" r="4.5" fill="#234621" />
            <!-- Cute Blush Cheeks -->
            <ellipse cx="86" cy="140" rx="5" ry="3" fill="#fed7aa" opacity="0.8" />
            <ellipse cx="134" cy="140" rx="5" ry="3" fill="#fed7aa" opacity="0.8" />
            <!-- Cute Sad Mouth (downturned bean) -->
            <path d="M 104 154 C 104 145, 116 145, 116 154 C 116 160, 104 160, 104 154 Z" fill="#70c068" />

            <!-- Speech Bubble with 404 (AMS Primary Green #4ba443) -->
            <!-- Bubble Body with pointer tail -->
            <path d="M 200 22 C 235 22 258 46 258 75 C 258 104 235 128 200 128 C 185 128 172 123 162 116 L 138 126 C 143 116 144 108 144 103 C 136 94 132 85 132 75 C 132 46 155 22 200 22 Z" fill="#4ba443" />
            <!-- Text 404 -->
            <text x="198" y="87" fill="#ffffff" font-size="36" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="700" text-anchor="middle" letter-spacing="1">404</text>
        </svg>

        <h1 class="error-title">PAGE NOT FOUND</h1>

        <div class="error-description">
            <p>We looked everywhere for this page.</p>
            <p>Are you sure the website URL is correct?</p>
            <p>Get in touch with the site owner.</p>
            @if(!empty($exception) && $exception->getMessage() && !str_contains($exception->getMessage(), 'The route') && !str_contains($exception->getMessage(), 'not found'))
                <div class="custom-msg">{{ $exception->getMessage() }}</div>
            @endif
        </div>

        <div class="button-group">
            <button type="button" class="btn-outline" onclick="goBack()">
                Go Back Home
            </button>
        </div>
    </main>

    <script>
        function goBack() {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = '/dokumen';
            }
        }
    </script>
</body>
</html>
