# RedPulse Stable Tunnel Monitor
# Maintains a persistent connection to Pinggy for mobile access

$ErrorActionPreference = "Continue"

while ($true) {
    Write-Host "--- [" + (Get-Date -Format "HH:mm:ss") + "] Initializing High-Stability Tunnel ---" -ForegroundColor Cyan
    
    # Clean up any orphaned ssh processes
    try {
        Stop-Process -Name ssh -ErrorAction SilentlyContinue
    } catch {}

    Write-Host "Connecting to a.pinggy.io..." -ForegroundColor Gray
    
    # Start the tunnel
    # We use -o ServerAliveInterval to prevent timeout drops
    ssh -o "StrictHostKeyChecking=no" -o "ServerAliveInterval=30" -p 443 -R0:localhost:3001 a.pinggy.io | Tee-Object -FilePath "pinggy.log"
    
    Write-Host "Connection interrupted! Retrying in 5 seconds..." -ForegroundColor Red
    Start-Sleep -s 5
}
