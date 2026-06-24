# Deployment Guide — Google Cloud Run

## Prerequisites
- gcloud CLI installed and authenticated
- Google Cloud project: lastminuteai
- Docker installed (or use --source for Cloud Build)

## Steps

### 1. Build frontend and copy to backend
```bash
cd frontend
npm run build
cp -r dist ../backend/static
```

### 2. Deploy to Cloud Run (uses Cloud Build — no local Docker needed)
```bash
cd backend
gcloud run deploy lastminute-ai \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi
```

### 3. Set environment variables
```bash
gcloud run services update lastminute-ai \
  --region asia-south1 \
  --set-env-vars "GOOGLE_CLIENT_ID=...,ANTHROPIC_API_KEY=...,..."
```

### 4. Store Firebase private key as Secret Manager secret
```bash
echo "YOUR_PRIVATE_KEY" | gcloud secrets create firebase-private-key \
  --data-file=- --project=lastminuteai

gcloud run services update lastminute-ai \
  --set-secrets FIREBASE_PRIVATE_KEY=firebase-private-key:latest \
  --region asia-south1
```

### 5. Update OAuth redirect URI
After deploy, add to Google Cloud Console > OAuth credentials:
- Authorized origin: https://YOUR_CLOUDRUN_URL
- Redirect URI: https://YOUR_CLOUDRUN_URL/api/auth/callback/google
