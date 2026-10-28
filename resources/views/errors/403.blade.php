<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>403 - Akses Ditolak | Approval Management System</title>
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
            color: #334155;
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
            color: #f59e0b;
            font-size: clamp(30px, 6vw, 42px);
            font-weight: 700;
            letter-spacing: 2px;
            margin-bottom: 20px;
            line-height: 1.2;
            text-transform: uppercase;
        }

        .error-description {
            color: #64748b;
            font-size: clamp(15px, 2.5vw, 17px);
            line-height: 1.7;
            margin-bottom: 36px;
            max-width: 460px;
        }

        .error-description p {
            margin: 4px 0;
        }

        .error-description .custom-msg {
            color: #d97706;
            font-weight: 600;
            margin-top: 10px;
            font-size: 15px;
            background-color: #fef3c7;
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
            border: 2px solid #f59e0b;
            border-radius: 9999px;
            background-color: transparent;
            color: #d97706;
            font-family: inherit;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.2s ease-in-out;
            box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
        }

        .btn-outline:hover {
            background-color: #f59e0b;
            color: #ffffff;
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);
        }

        .btn-outline:active {
            transform: translateY(0);
        }
    </style>
</head>
<body>
    <main class="error-container" role="main">
        <!-- Cute 403 Illustration matching reference style -->
        <svg class="illustration" viewBox="0 0 280 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <!-- Ground soft shadow -->
            <ellipse cx="110" cy="188" rx="65" ry="7" fill="#f1f5f9" />

            <!-- Sparkle / Alert marks on top-left -->
            <line x1="28" y1="74" x2="18" y2="68" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
            <line x1="36" y1="62" x2="36" y2="48" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
            <line x1="48" y1="68" x2="56" y2="58" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />

            <!-- Mini Browser Window -->
            <rect x="42" y="80" width="136" height="102" rx="10" fill="#ffffff" stroke="#fcd34d" stroke-width="3.5" />
            <!-- Browser Header Bar Divider -->
            <line x1="42" y1="104" x2="178" y2="104" stroke="#fcd34d" stroke-width="2.5" />
            <!-- 3 Browser Dots -->
            <circle cx="56" cy="92" r="3" fill="#fcd34d" />
            <circle cx="67" cy="92" r="3" fill="#fcd34d" />
            <circle cx="78" cy="92" r="3" fill="#fcd34d" />

            <!-- Cute Locked / Sad Face Inside Browser -->
            <!-- Left Eye -->
            <circle cx="94" cy="130" r="4.5" fill="#475569" />
            <!-- Right Eye -->
            <circle cx="126" cy="130" r="4.5" fill="#475569" />
            <!-- Cute Blush Cheeks -->
            <ellipse cx="86" cy="138" rx="5" ry="3" fill="#fed7aa" opacity="0.75" />
            <ellipse cx="134" cy="138" rx="5" ry="3" fill="#fed7aa" opacity="0.75" />
            <!-- Cute Sad Mouth -->
            <path d="M 104 150 C 104 143, 116 143, 116 150 C 116 155, 104 155, 104 150 Z" fill="#94a3b8" />

            <!-- Mini Padlock Badge on bottom right of browser -->
            <g transform="translate(136, 142)">
                <circle cx="16" cy="16" r="16" fill="#fef3c7" stroke="#f59e0b" stroke-width="2" />
                <!-- Padlock Shackle -->
                <path d="M 11 15 V 12 C 11 9.2 13.2 7 16 7 C 18.8 7 21 9.2 21 12 V 15" stroke="#d97706" stroke-width="2.2" stroke-linecap="round" fill="none" />
                <!-- Padlock Body -->
                <rect x="9" y="14" width="14" height="11" rx="2.5" fill="#f59e0b" />
                <!-- Keyhole -->
                <circle cx="16" cy="19" r="1.5" fill="#ffffff" />
            </g>

            <!-- Speech Bubble with 403 -->
            <path d="M 200 22 C 235 22 258 46 258 75 C 258 104 235 128 200 128 C 185 128 172 123 162 116 L 138 126 C 143 116 144 108 144 103 C 136 94 132 85 132 75 C 132 46 155 22 200 22 Z" fill="#f59e0b" />
            <!-- Text 403 -->
            <text x="198" y="87" fill="#ffffff" font-size="36" font-family="'Plus Jakarta Sans', system-ui, sans-serif" font-weight="700" text-anchor="middle" letter-spacing="1">403</text>
        </svg>

        <h1 class="error-title">ACCESS DENIED</h1>

        <div class="error-description">
            <p>You don't have permission to view this page or document.</p>
            <p>Are you sure this document was assigned to your account?</p>
            <p>Get in touch with the document owner or site administrator.</p>
            @if(!empty($exception) && $exception->getMessage() && !str_contains($exception->getMessage(), 'This action is unauthorized'))
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