# Continuously marks .next as Dropbox-ignored so EPERM rename errors don't occur
$nextDir = "$PSScriptRoot\.next"
Write-Host "Watching .next for Dropbox ignore..." -ForegroundColor Cyan

while ($true) {
    if (Test-Path $nextDir) {
        attrib +P $nextDir 2>$null
        Get-ChildItem -Path $nextDir -Recurse -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            attrib +P $_.FullName 2>$null
        }
    }
    Start-Sleep -Seconds 3
}
