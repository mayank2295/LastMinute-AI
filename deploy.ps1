# LastMinute AI — Cloud Run Deployment Script
# Prerequisites: billing enabled, gcloud authenticated as mayankgupta23081@gmail.com
# Run from repo root: .\deploy.ps1
#
# Reads secrets from backend/.env — never hardcodes them here.

$GCLOUD = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$PROJECT = "lastminuteai"
$REGION  = "asia-south1"
$SERVICE = "lastminute-ai"
$ENV_FILE = Join-Path $PSScriptRoot "backend\.env"

if (-not (Test-Path $ENV_FILE)) {
    Write-Error "backend/.env not found. Copy backend/.env.example and fill in values."
    exit 1
}

# Parse .env into a hashtable
$cfg = @{}
foreach ($line in (Get-Content $ENV_FILE)) {
    if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
    $k, $v = $line -split '=', 2
    $cfg[$k.Trim()] = $v.Trim().Trim('"')
}

Write-Host "=== LastMinute AI Deploy ===" -ForegroundColor Cyan

# 1. Enable services
Write-Host "`n[1/6] Enabling GCP services..."
& $GCLOUD services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com --project=$PROJECT

# 2. Store Firebase private key as Secret (handles newlines safely)
Write-Host "`n[2/6] Storing Firebase private key in Secret Manager..."
$pk = $cfg["FIREBASE_PRIVATE_KEY"] -replace '\\n', "`n"
$tmpFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmpFile, $pk, [System.Text.Encoding]::UTF8)
& $GCLOUD secrets create firebase-private-key --data-file=$tmpFile --project=$PROJECT 2>&1
if (-not $?) {
    Write-Host "Secret exists — adding new version..."
    & $GCLOUD secrets versions add firebase-private-key --data-file=$tmpFile --project=$PROJECT
}
Remove-Item $tmpFile

# 3. Build frontend with production Cloud Run URL
Write-Host "`n[3/6] Building frontend..."
$CLOUD_RUN_URL = $cfg["FRONTEND_URL"]
if ($CLOUD_RUN_URL -eq "http://localhost:5173" -or -not $CLOUD_RUN_URL) {
    Write-Host "FRONTEND_URL is local — using placeholder. Update backend/.env after first deploy." -ForegroundColor Yellow
    $CLOUD_RUN_URL = "https://$SERVICE-gul4q6dcia-el.a.run.app"
}
Set-Content "frontend\.env.production" "VITE_API_URL=$CLOUD_RUN_URL"
Push-Location frontend
npm run build
Pop-Location
if (Test-Path "backend\static") { Remove-Item -Recurse -Force "backend\static" }
Copy-Item -Recurse "frontend\dist" "backend\static"

# 4. Grant Cloud Build permission to access secrets
Write-Host "`n[4/6] Granting Secret Manager access to Cloud Build..."
$PROJECT_NUM = (& $GCLOUD projects describe $PROJECT --format="value(projectNumber)" 2>&1)
& $GCLOUD projects add-iam-policy-binding $PROJECT `
    --member="serviceAccount:$PROJECT_NUM@cloudbuild.gserviceaccount.com" `
    --role="roles/secretmanager.secretAccessor" 2>&1 | Select-Object -Last 2

# 5. Deploy to Cloud Run
Write-Host "`n[5/6] Deploying to Cloud Run..."
$ENV_VARS = @(
    "GOOGLE_CLIENT_ID=$($cfg['GOOGLE_CLIENT_ID'])",
    "GOOGLE_CLIENT_SECRET=$($cfg['GOOGLE_CLIENT_SECRET'])",
    "GOOGLE_REDIRECT_URI=$CLOUD_RUN_URL/api/auth/callback/google",
    "FIREBASE_PROJECT_ID=$($cfg['FIREBASE_PROJECT_ID'])",
    "FIREBASE_CLIENT_EMAIL=$($cfg['FIREBASE_CLIENT_EMAIL'])",
    "VAPID_PUBLIC_KEY=$($cfg['VAPID_PUBLIC_KEY'])",
    "VAPID_PRIVATE_KEY=$($cfg['VAPID_PRIVATE_KEY'])",
    "VAPID_CLAIMS_EMAIL=$($cfg['VAPID_CLAIMS_EMAIL'])",
    "SECRET_KEY=$($cfg['SECRET_KEY'])",
    "FRONTEND_URL=$CLOUD_RUN_URL",
    "PORT=8080",
    "OAUTHLIB_RELAX_TOKEN_SCOPE=1",
    "ANTHROPIC_API_KEY=$($cfg['ANTHROPIC_API_KEY'])"
)
$ENV_STRING = $ENV_VARS -join ","

Push-Location backend
& $GCLOUD run deploy $SERVICE `
    --source . `
    --region $REGION `
    --project $PROJECT `
    --allow-unauthenticated `
    --port 8080 `
    --memory 512Mi `
    --set-env-vars $ENV_STRING `
    --set-secrets "FIREBASE_PRIVATE_KEY=firebase-private-key:latest"
Pop-Location

# 6. Get deployed URL
Write-Host "`n[6/6] Getting service URL..."
$URL = (& $GCLOUD run services describe $SERVICE --region=$REGION --project=$PROJECT --format="value(status.url)" 2>&1)
Write-Host "`nDeployed at: $URL" -ForegroundColor Green
Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1. Go to console.cloud.google.com/apis/credentials"
Write-Host "   Add authorized origin: $URL"
Write-Host "   Add redirect URI: $URL/api/auth/callback/google"
Write-Host "2. Update FRONTEND_URL and GOOGLE_REDIRECT_URI in backend/.env to: $URL"
Write-Host "3. Re-run .\deploy.ps1 to rebuild frontend with correct URL and redeploy"
