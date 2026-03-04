# Test Order Tracking webhook (Integration Webhooks)
# Usage: .\test-webhook.ps1
# Or with order number: .\test-webhook.ps1 -OrderNumber 2002

param(
    [string]$OrderNumber = "2001",
    [string]$WebhookUrl = "https://hook.us2.make.com/4a85s5hud5v76m4u5jm2eswqwiaqiqky"
)

$body = @{ message = "Track order $OrderNumber"; sessionId = "test-$(Get-Date -Format 'HHmmss')" } | ConvertTo-Json

Write-Host "=== Testing webhook ===" -ForegroundColor Cyan
Write-Host "POST $WebhookUrl"
Write-Host "Body: $body"
Write-Host ""

try {
    $r = Invoke-WebRequest -Uri $WebhookUrl -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "Status: $($r.StatusCode)" -ForegroundColor $(if ($r.StatusCode -eq 200) { "Green" } else { "Yellow" })
    Write-Host "Content-Type: $($r.Headers['Content-Type'])"
    Write-Host "Body:"
    Write-Host $r.Content
    if ($r.Content -match "^\s*\{") {
        $r.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
