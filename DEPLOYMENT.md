# FitGPT Deployment Guide

Complete guide to deploying your FitGPT workout app for personal use on iPhone.

## Architecture Overview

- **Backend**: Node.js/Express API deployed on Railway.app
- **Database**: MongoDB Atlas (existing instance)
- **Frontend**: React Native (Expo) on iPhone via Expo Go
- **Updates**: Over-the-air (OTA) updates via Expo

---

## One-Time Setup

### 1. Backend Deployment on Railway (~15 minutes)

#### A. Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub (recommended)
3. Verify your email

#### B. Deploy Backend
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `fit-gpt` repository
4. Railway will detect your Node.js app

#### C. Configure Railway Service
1. In your Railway project, click on the service
2. Go to **Settings** → **Root Directory**
   - Set to: `backend`
3. Go to **Settings** → **Build Command**
   - Set to: `npm install && npm run build`
4. Go to **Settings** → **Start Command**
   - Set to: `npm start`

#### D. Set Environment Variables
1. Go to **Variables** tab
2. Add the following variables:

```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=your-mongodb-atlas-connection-string-here
JWT_SECRET=your-generated-secret-here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

**To generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**MongoDB URI**: Use your existing MongoDB Atlas connection string

**Anthropic API Key**: Get from [console.anthropic.com](https://console.anthropic.com)

#### E. Get Your Railway URL
1. Go to **Settings** → **Domains**
2. Click **Generate Domain**
3. Copy your Railway URL (e.g., `https://fit-gpt-production.up.railway.app`)
4. **Save this URL** - you'll need it for the frontend!

#### F. Verify Deployment
Visit your Railway URL + `/health`:
```
https://your-app.up.railway.app/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-11-05T...",
  "environment": "production"
}
```

---

### 2. Setup GitHub Auto-Deploy (~5 minutes)

#### A. Get Railway Token
1. Go to [railway.app/account/tokens](https://railway.app/account/tokens)
2. Click **"Create Token"**
3. Give it a name (e.g., "GitHub Actions")
4. Copy the token immediately (you won't see it again!)

#### B. Get Service Name
1. In your Railway project, go to your backend service
2. Click on **Settings** → **Service ID**
3. Copy the service ID (this is your service name)

#### C. Add GitHub Secrets
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add two secrets:
   - `RAILWAY_TOKEN`: Paste your Railway token
   - `RAILWAY_SERVICE_NAME`: Paste your service ID

#### D. Test Auto-Deploy
1. Make a small change to `backend/README.md`
2. Commit and push to `main`:
   ```bash
   git add backend/README.md
   git commit -m "Test auto-deploy"
   git push origin main
   ```
3. Go to **Actions** tab in GitHub to watch the deployment
4. Check Railway dashboard to verify new deployment

**That's it!** Every push to `main` will now auto-deploy your backend.

---

### 3. Frontend Setup for iPhone (~10 minutes)

#### A. Install Expo Go on iPhone
1. Open App Store
2. Search for "Expo Go"
3. Install the app (it's free)

#### B. Create Expo Account
1. Go to [expo.dev](https://expo.dev)
2. Sign up (free account)
3. Verify your email

#### C. Login to Expo CLI
```bash
cd frontend
npx expo login
```
Enter your Expo credentials.

#### D. Configure EAS (Expo Application Services)
```bash
npx eas-cli@latest init
```

This will:
- Create an Expo project
- Add project ID to `app.json`
- Configure OTA updates

#### E. Update Production Backend URL
Edit `frontend/app.json`:

```json
"extra": {
  "eas": {
    "projectId": "your-project-id-from-eas-init"
  },
  "apiBaseUrl": "https://your-railway-url.railway.app/api"
}
```

Replace `your-railway-url.railway.app` with your actual Railway URL from step 1.E.

#### F. Initial Publish
```bash
cd frontend
npm run publish
```

This will bundle your app and publish it to Expo's servers.

#### G. Open App on iPhone
1. Open Expo Go app on your iPhone
2. Sign in with your Expo account
3. Your app "FitGPT" should appear in your projects
4. Tap to open it!

**Alternative**: Scan the QR code from `npx expo start`

---

## Regular Usage

### Updating the Backend

Just push to `main`:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

GitHub Actions will auto-deploy to Railway (~2-3 minutes).

### Updating the Frontend (App Updates)

#### Quick Update (recommended):
```bash
cd frontend
npm run update
```

Your iPhone app will automatically update next time you open it!

#### Full Republish:
```bash
cd frontend
npm run publish
```

### Development Workflow

#### Backend Development:
```bash
cd backend
npm run dev
```

#### Frontend Development:
```bash
cd frontend
npm start
```

Then:
- Press `i` for iOS simulator (if you have Xcode)
- Or scan QR code with Expo Go app

Changes will hot-reload instantly!

---

## Monitoring & Troubleshooting

### Check Backend Logs
1. Go to Railway dashboard
2. Click on your backend service
3. Click **Deployments**
4. View logs in real-time

### Check Backend Health
```bash
curl https://your-railway-url.railway.app/health
```

### Common Issues

#### Backend not responding
- Check Railway logs
- Verify environment variables are set
- Check MongoDB Atlas connection (whitelist Railway IPs: `0.0.0.0/0`)

#### Frontend can't connect to backend
- Check `frontend/app.json` → `extra.apiBaseUrl`
- Check backend CORS settings
- View network requests in Expo debugger: shake phone → "Debug Remote JS"

#### App not updating
- Make sure you published: `npm run update`
- Clear Expo Go cache: Long-press app → Clear cache
- Re-publish with new version number

### MongoDB Atlas Setup (if needed)

If you need to set up a new MongoDB Atlas instance:

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create a **FREE** cluster (M0)
4. Go to **Database Access** → Add user (save password!)
5. Go to **Network Access** → Add IP: `0.0.0.0/0` (allow from anywhere)
6. Click **Connect** → **Connect your application**
7. Copy connection string (format: `mongodb+srv://...`)
8. Replace `<password>` with your actual password
9. Add to Railway environment variables

---

## Cost Breakdown

- **Railway**: $5/month (starter plan - no cold starts)
- **MongoDB Atlas**: $0/month (free tier - 512MB)
- **Expo**: $0/month (free tier)
- **GitHub Actions**: $0/month (free for public repos)

**Total: $5/month** (or $0 if you use Railway's hobby plan with cold starts)

---

## Alternative: Railway Free Tier

Railway offers 500 hours/month free (plus $5 credit):
- Should be enough for personal use
- Your app will have ~15-30 second cold start after inactivity
- To use free tier: Don't add payment method

---

## Security Notes

1. **Never commit `.env` files** to Git (already in `.gitignore`)
2. **Rotate JWT_SECRET** periodically
3. **Keep Anthropic API key secure**
4. **MongoDB**: Enable authentication (Atlas does by default)

---

## API Documentation

Your backend includes Swagger docs!

Visit: `https://your-railway-url.railway.app/api-docs`

---

## Advanced: Building Standalone App (Optional)

If you want a standalone app instead of Expo Go:

### For iPhone (Requires Apple Developer Account - $99/year)

```bash
cd frontend
npx eas build --platform ios --profile preview
```

Then submit to TestFlight:
```bash
npx eas submit --platform ios
```

This creates a "real" app you can install via TestFlight.

---

## Quick Reference

### Environment Variables

**Backend** (Railway):
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=32-char-hex-string
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
ANTHROPIC_API_KEY=sk-ant-...
```

**Frontend** (app.json):
```json
{
  "extra": {
    "apiBaseUrl": "https://your-railway-url.railway.app/api"
  }
}
```

### Common Commands

```bash
# Backend
npm run dev          # Local development
npm run build        # Build for production
npm run start        # Start production server
npm run type-check   # Check TypeScript

# Frontend
npm start            # Start Expo
npm run publish      # Publish update
npm run update       # Publish to production channel
npm run type-check   # Check TypeScript

# Git
git push origin main # Triggers auto-deploy
```

---

## Support

- **Railway**: [docs.railway.app](https://docs.railway.app)
- **Expo**: [docs.expo.dev](https://docs.expo.dev)
- **MongoDB**: [docs.mongodb.com](https://docs.mongodb.com)

---

## Success Checklist

- [ ] Railway backend deployed and health check passes
- [ ] GitHub Actions auto-deploy working
- [ ] MongoDB connected (check Railway logs)
- [ ] Expo account created
- [ ] EAS initialized
- [ ] Frontend published to Expo
- [ ] App opens on iPhone via Expo Go
- [ ] Can create account and login
- [ ] Can generate workout
- [ ] OTA updates working

---

You're all set! 🎉 Enjoy your workouts!
