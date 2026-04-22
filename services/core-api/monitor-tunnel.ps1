# Honest Dual-Tunnel Monitor (Cloudflare + LocalTunnel)
# Captures BOTH URLs and writes them to ACTIVE_TUNNEL.txt

$ErrorActionPreference = "Continue"
$CFLog = "cloudflare.log"
$LTLog = "localtunnel.log"
$ActiveFile = "ACTIVE_TUNNEL.txt"

while ($true) {
    Write-Host "--- [" + (Get-Date -Format "HH:mm:ss") + "] Initializing Dual Tunnels ---" -ForegroundColor Cyan
    
    # Wait for backend to be ready on 3001
    Write-Host "Waiting for backend (port 3001) to wake up..." -ForegroundColor Gray
    while (!(Test-NetConnection -ComputerName 127.0.0.1 -Port 3001 -InformationLevel Quiet)) {
        Start-Sleep -s 2
    }
    Write-Host "🚀 Backend is UP. Launching tunnels..." -ForegroundColor Green

    # Start Cloudflare
    Start-Process -FilePath ".\cloudflared.exe" -ArgumentList "tunnel --url http://127.0.0.1:3001" -RedirectStandardError $CFLog -NoNewWindow
    
    # Start LocalTunnel (with stable subdomain)
    Start-Process -FilePath "npx.cmd" -ArgumentList "lt --port 3001 --subdomain redpulse-mobile-dundigal" -RedirectStandardOutput $LTLog -NoNewWindow

    Write-Host "Waiting for URLs..." -ForegroundColor Yellow
    Start-Sleep -s 5

    $cfUrl = $null
    $ltUrl = $null
    
    if (Test-Path $CFLog) {
        $cfUrl = (Get-Content $CFLog | Select-String "https://.*\.trycloudflare\.com" | Select-Object -First 1).Matches.Value
    }
    if (Test-Path $LTLog) {
        $ltUrl = (Get-Content $LTLog | Select-String "https://.*\.loca\.lt" | Select-Object -First 1).Matches.Value
    }

    $statusStr = ""
    if ($cfUrl) { $statusStr += "CF: $cfUrl`r`n" }
    if ($ltUrl) { $statusStr += "LT: $ltUrl" }
    $statusStr | Out-File -FilePath $ActiveFile -Encoding UTF8

    Write-Host "`r`n✅ TUNNELS READY:" -ForegroundColor Green
    Write-Host "Cloudflare: $cfUrl" -ForegroundColor Cyan
    Write-Host "LocalTunnel: $ltUrl" -ForegroundColor Yellow
    Write-Host "Written to: $ActiveFile`n" -ForegroundColor Gray

    # Monitor processes
    while ((Get-Process -Name cloudflared -ErrorAction SilentlyContinue)) {
        Start-Sleep -s 5
    }
    
    Write-Host "A tunnel process died. Restarting..." -ForegroundColor Red
}
