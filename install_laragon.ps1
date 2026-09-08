$ext = 'C:\laragon\bin\php\php-8.5.0-nts-Win32-vs17-x64\ext'
Copy-Item 'd:\Magang\project\Approval-Management-System\sql_drivers\Windows\php_pdo_sqlsrv_85_nts_x64.dll' -Destination $ext -Force
Copy-Item 'd:\Magang\project\Approval-Management-System\sql_drivers\Windows\php_sqlsrv_85_nts_x64.dll' -Destination $ext -Force
$ini = 'C:\laragon\bin\php\php-8.5.0-nts-Win32-vs17-x64\php.ini'
$content = Get-Content $ini
if ($content -notcontains 'extension=php_sqlsrv_85_nts_x64.dll') {
    Add-Content $ini "`nextension=php_sqlsrv_85_nts_x64.dll"
}
if ($content -notcontains 'extension=php_pdo_sqlsrv_85_nts_x64.dll') {
    Add-Content $ini "extension=php_pdo_sqlsrv_85_nts_x64.dll"
}
Write-Host 'Done'
