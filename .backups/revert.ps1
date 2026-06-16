# Run this script to revert all changes from the file upload implementation
$backupDir = Split-Path -Parent $PSCommandPath
Copy-Item -Path "$backupDir\BecomeHost.jsx.bak" -Destination "D:\WORK\car-rental\client\src\pages\BecomeHost.jsx" -Force
Copy-Item -Path "$backupDir\profileController.js.bak" -Destination "D:\WORK\car-rental\server\controllers\profileController.js" -Force
Copy-Item -Path "$backupDir\AdminDashboard.jsx.bak" -Destination "D:\WORK\car-rental\client\src\pages\AdminDashboard.jsx" -Force
Remove-Item -Path "D:\WORK\car-rental\client\src\utils\resizeImage.js" -Force -ErrorAction SilentlyContinue
Write-Output "Reverted all changes. Old files restored."
