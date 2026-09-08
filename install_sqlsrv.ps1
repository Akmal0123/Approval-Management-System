Invoke-WebRequest -Uri "https://github.com/microsoft/msphpsql/releases/download/v5.12.0/Windows_5.12.0RTW.zip" -OutFile "sql_drivers_v512.zip"
Expand-Archive -Path sql_drivers_v512.zip -DestinationPath sql_drivers_v512 -Force
$files = @('php_sqlsrv_82_ts_x64.dll', 'php_pdo_sqlsrv_82_ts_x64.dll')
foreach ($f in $files) {
    $src = Get-ChildItem -Path sql_drivers_v512 -Recurse -Filter $f | Select-Object -First 1
    if ($src) {
        Copy-Item $src.FullName -Destination 'C:\xampp\php\ext\' -Force
        Write-Host "Copied $f"
    } else {
        Write-Host "Could not find $f"
    }
}
