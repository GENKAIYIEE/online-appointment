# dev-clean.ps1
# Kills any process holding port 3000 or 3001, clears the .next cache, then starts the dev server.
# This avoids killing the npm/node process that is running this script.

Write-Host ">> Checking for processes on ports 3000 and 3001..." -ForegroundColor Cyan

foreach ($port in @(3000, 3001)) {
    $matches = netstat -ano | Select-String "[:.]$port\s" | Select-String "LISTENING"
    foreach ($line in $matches) {
        $parts = ($line.Line -split '\s+').Trim() | Where-Object { $_ -ne '' }
        $targetPid = $parts[-1]
        if ($targetPid -match '^\d+$' -and $targetPid -ne '0') {
            Write-Host "   Killing PID $targetPid (was holding port $port)" -ForegroundColor Yellow
            taskkill /PID $targetPid /F 2>$null | Out-Null
        }
    }
}

Start-Sleep -Milliseconds 800

Write-Host ">> Clearing .next cache..." -ForegroundColor Cyan
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host ">> Starting Next.js dev server..." -ForegroundColor Green
npx next dev
