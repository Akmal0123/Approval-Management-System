<?php
$url = 'https://api.github.com/repos/microsoft/msphpsql/releases/tags/v5.12.0';

$opts = [
    'http' => [
        'method' => 'GET',
        'header' => [
            'User-Agent: PHP'
        ]
    ]
];

$context = stream_context_create($opts);
$response = file_get_contents($url, false, $context);
$data = json_decode($response, true);

foreach ($data['assets'] as $asset) {
    if (strpos($asset['name'], 'Windows') !== false && strpos($asset['name'], '.zip') !== false) {
        echo $asset['browser_download_url'] . "\n";
        break;
    }
}
