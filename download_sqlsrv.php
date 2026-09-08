<?php
$url = 'https://api.github.com/repos/microsoft/msphpsql/releases/latest';

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

$downloadUrl = '';
foreach ($data['assets'] as $asset) {
    if (strpos($asset['name'], 'Windows') !== false && strpos($asset['name'], '.zip') !== false) {
        $downloadUrl = $asset['browser_download_url'];
        break;
    }
}

if (!$downloadUrl) {
    echo "Could not find Windows zip release.\n";
    exit(1);
}

echo "Downloading from: $downloadUrl\n";
$zipFile = 'sql_drivers.zip';
file_put_contents($zipFile, file_get_contents($downloadUrl, false, $context));
echo "Downloaded to $zipFile\n";

$zip = new ZipArchive;
if ($zip->open($zipFile) === TRUE) {
    $zip->extractTo('sql_drivers');
    $zip->close();
    echo "Extracted.\n";
} else {
    echo "Extraction failed.\n";
    exit(1);
}

$extDir = 'C:\\xampp\\php\\ext';
$filesToCopy = [
    'php_sqlsrv_82_ts_x64.dll',
    'php_pdo_sqlsrv_82_ts_x64.dll'
];

$copiedCount = 0;
// We need to find the files in the extracted folder (which might have a subfolder)
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator('sql_drivers'));
foreach ($iterator as $file) {
    if ($file->isFile() && in_array($file->getFilename(), $filesToCopy)) {
        $dest = $extDir . DIRECTORY_SEPARATOR . $file->getFilename();
        copy($file->getRealPath(), $dest);
        echo "Copied " . $file->getFilename() . " to $extDir\n";
        $copiedCount++;
    }
}

if ($copiedCount > 0) {
    echo "Modifying php.ini...\n";
    $phpIni = 'C:\\xampp\\php\\php.ini';
    $iniContent = file_get_contents($phpIni);
    $append = "";
    if (strpos($iniContent, 'extension=php_sqlsrv_82_ts_x64.dll') === false) {
        $append .= "\nextension=php_sqlsrv_82_ts_x64.dll\n";
    }
    if (strpos($iniContent, 'extension=php_pdo_sqlsrv_82_ts_x64.dll') === false) {
        $append .= "extension=php_pdo_sqlsrv_82_ts_x64.dll\n";
    }
    
    if ($append) {
        file_put_contents($phpIni, $append, FILE_APPEND);
        echo "Added extensions to php.ini\n";
    } else {
        echo "Extensions already in php.ini\n";
    }
    echo "Success! Please restart Apache via XAMPP control panel.\n";
} else {
    echo "Could not find the required dlls in the downloaded archive.\n";
}
