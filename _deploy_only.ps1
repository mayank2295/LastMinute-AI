
$ENV_FILE = "$PSScriptRoot\backend\.env"
$g = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

# Parse .env
$cfg = @{}
foreach ($line in (Get-Content $ENV_FILE)) {
    if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
    $k, $v = $line -split '=', 2
    $cfg[$k.Trim()] = $v.Trim().Trim('"')
}

# Build env-vars string — PORT is reserved by Cloud Run, do NOT include it
$envVars = @(
    "GOOGLE_CLIENT_ID=$($cfg['GOOGLE_CLIENT_ID'])",
    "GOOGLE_CLIENT_SECRET=$($cfg['GOOGLE_CLIENT_SECRET'])",
    "GOOGLE_REDIRECT_URI=https://lastminute-ai-ummt2blwla-el.a.run.app/api/auth/callback/google",
    "FIREBASE_PROJECT_ID=$($cfg['FIREBASE_PROJECT_ID'])",
    "FIREBASE_CLIENT_EMAIL=$($cfg['FIREBASE_CLIENT_EMAIL'])",
    "VAPID_PUBLIC_KEY=$($cfg['VAPID_PUBLIC_KEY'])",
    "VAPID_PRIVATE_KEY=$($cfg['VAPID_PRIVATE_KEY'])",
    "VAPID_CLAIMS_EMAIL=$($cfg['VAPID_CLAIMS_EMAIL'])",
    "SECRET_KEY=$($cfg['SECRET_KEY'])",
    "FRONTEND_URL=https://lastminute-ai-ummt2blwla-el.a.run.app",
    "OAUTHLIB_RELAX_TOKEN_SCOPE=1",
    "ANTHROPIC_API_KEY=$($cfg['ANTHROPIC_API_KEY'])"
) -join ","

Write-Host "Deploying to Cloud Run..."
Push-Location "$PSScriptRoot\backend"
& $g run deploy lastminute-ai `
    --source . `
    --region asia-south1 `
    --project lastminuteai `
    --allow-unauthenticated `
    --port 8080 `
    --memory 256Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 2 `
    --concurrency 80 `
    --quiet `
    --set-env-vars $envVars `
    --set-secrets "FIREBASE_PRIVATE_KEY=firebase-private-key:latest"
Pop-Location

Write-Host "Getting deployed URL..."
$url = & $g run services describe lastminute-ai --region=asia-south1 --project=lastminuteai --format="value(status.url)" 2>&1
Write-Host ""
Write-Host "Deployed URL: $url" -ForegroundColor Green
$url | Out-File "$PSScriptRoot\deployed_url.txt" -Encoding utf8
