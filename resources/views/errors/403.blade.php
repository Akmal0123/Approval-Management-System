<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Akses Ditolak</title>
        <style>
            * {
                box-sizing: border-box;
            }

            body {
                min-height: 100vh;
                margin: 0;
                display: grid;
                place-items: center;
                padding: 8px;
                background: #f4f7f4;
                color: #17211b;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .error-panel {
                width: min(100%, 520px);
                padding: clamp(20px, 5vw, 32px);
                border: 1px solid #dce5dc;
                border-radius: 12px;
                background: #fff;
                box-shadow: 0 12px 32px rgb(23 33 27 / 8%);
            }

            .error-code {
                margin: 0 0 8px;
                color: #52755c;
                font-size: 13px;
                font-weight: 700;
            }

            h1 {
                margin: 0;
                font-size: clamp(20px, 5vw, 24px);
                line-height: 1.3;
            }

            .error-message {
                margin: 12px 0 24px;
                color: #59655d;
                font-size: 15px;
                line-height: 1.6;
                overflow-wrap: anywhere;
                word-break: break-word;
            }

            .back-button {
                display: inline-flex;
                min-height: 40px;
                align-items: center;
                justify-content: center;
                padding: 0 16px;
                border: 0;
                border-radius: 8px;
                background: #21834a;
                color: #fff;
                font: inherit;
                font-size: 14px;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
            }

            .back-button:hover {
                background: #176a3a;
            }
        </style>
    </head>
    <body>
        <main class="error-panel" role="alert">
            <p class="error-code">403</p>
            <h1>Akses ditolak</h1>
            <p class="error-message">{{ $exception->getMessage() ?: 'Anda tidak memiliki akses ke halaman ini.' }}</p>
            <a class="back-button" href="{{ url()->previous() }}">Kembali</a>
        </main>
    </body>
</html>