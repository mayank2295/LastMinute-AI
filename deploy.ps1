# ============================================================================
#  LastMinute AI — One-command deploy to Google Cloud Run
# ----------------------------------------------------------------------------
#  Builds the React frontend, bundles it into the FastAPI backend, and deploys
#  the container to Cloud Run. All secrets are read at runtime from backend/.env
#  — none are hardcoded here.
#
#  Prerequisites:
#    - gcloud CLI installed & authenticated (gcloud auth login)
#    - Billing enabled on the GCP project
#    - backend/.env filled in (see backend/.env.example)
#    - Firebase private key stored in Secret Manager as "firebase-private-key"
#
#  Usage (from repo root):   .\deploy.ps1
# ============================================================================

$PROJECT  = "lastminuteai"
$REGION   = "asia-south1"
$SERVICE  = "lastminute-ai"
$URL      = "https://lastminute-ai-ummt2blwla-el.a.run.app"   # the Cloud Run service URL (build target)

# Public URL used for OAuth redirect + frontend origin.
# mayank.store is live (Cloudflare Worker -> Cloud Run) and its redirect URI is
# registered on the OAuth client, so production runs on the custom domain.
$PUBLIC_URL = "https://mayank.store"
$GCLOUD   = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$ENV_FILE = Join-Path $PSScriptRoot "backend\.env"

if (-not (Test-Path $ENV_FILE)) {
    Write-Error "backend/.env not found. Copy backend/.env.example and fill in values."
    exit 1
}

# --- Parse backend/.env into a hashtable -----------------------------------
$cfg = @{}
foreach ($line in (Get-Content $ENV_FILE)) {
    if ($line -match '^\s*#' -or $line -notmatch '=') { continue }
    $k, $v = $line -split '=', 2
    $cfg[$k.Trim()] = $v.Trim().Trim('"')
}

# --- 1. Build the frontend and bundle it into the backend ------------------
Write-Host "`n[1/2] Building frontend..." -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "frontend")
npm run build
Pop-Location
$static = Join-Path $PSScriptRoot "backend\static"
if (Test-Path $static) { Remove-Item -Recurse -Force $static }
Copy-Item -Recurse (Join-Path $PSScriptRoot "frontend\dist") $static

# --- 2. Deploy to Cloud Run ------------------------------------------------
# PORT is reserved by Cloud Run — do NOT set it here.
$envList = @(
    "GOOGLE_CLIENT_ID=$($cfg['GOOGLE_CLIENT_ID'])",
    "GOOGLE_CLIENT_SECRET=$($cfg['GOOGLE_CLIENT_SECRET'])",
    "GOOGLE_REDIRECT_URI=$PUBLIC_URL/api/auth/callback/google",
    "FIREBASE_PROJECT_ID=$($cfg['FIREBASE_PROJECT_ID'])",
    "FIREBASE_CLIENT_EMAIL=$($cfg['FIREBASE_CLIENT_EMAIL'])",
    "VAPID_PUBLIC_KEY=$($cfg['VAPID_PUBLIC_KEY'])",
    "VAPID_PRIVATE_KEY=$($cfg['VAPID_PRIVATE_KEY'])",
    "VAPID_CLAIMS_EMAIL=$($cfg['VAPID_CLAIMS_EMAIL'])",
    "SECRET_KEY=$($cfg['SECRET_KEY'])",
    "FRONTEND_URL=$PUBLIC_URL",
    "OAUTHLIB_RELAX_TOKEN_SCOPE=1",
    "GEMINI_API_KEY=$($cfg['GEMINI_API_KEY'])"          # Google Gemini — the app's AI engine
)
# Optional extras, only if present in .env
if ($cfg['ANTHROPIC_API_KEY']) { $envList += "ANTHROPIC_API_KEY=$($cfg['ANTHROPIC_API_KEY'])" }  # secondary resilience fallback
if ($cfg['CRON_SECRET'])       { $envList += "CRON_SECRET=$($cfg['CRON_SECRET'])" }
$envVars = $envList -join ","

Write-Host "`n[2/2] Deploying to Cloud Run..." -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "backend")
& $GCLOUD run deploy $SERVICE `
    --source . `
    --region $REGION `
    --project $PROJECT `
    --allow-unauthenticated `
    --port 8080 `
    --memory 512Mi `
    --cpu 1 `
    --min-instances 0 `
    --max-instances 2 `
    --concurrency 80 `
    --quiet `
    --set-env-vars $envVars `
    --set-secrets "FIREBASE_PRIVATE_KEY=firebase-private-key:latest"
Pop-Location

Write-Host "`nDeployed: $URL" -ForegroundColor Green
