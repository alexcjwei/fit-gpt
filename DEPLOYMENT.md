# FitGPT Deployment Guide

Complete guide to deploying your FitGPT workout app for personal use on iPhone.

## Architecture Overview

- **Backend**: Node.js/Express API deployed on Railway.app
- **Database**: MongoDB Atlas (existing instance)
- **Frontend**: React Native (Expo) on iPhone via Expo Go (local development)

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
3. Railway will automatically detect and use the `Dockerfile` in the backend directory
   - No need to set Build Command or Start Command manually
   - The Dockerfile handles the TypeScript build process

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

#### F. Setup Auto-Deploy from GitHub
Railway automatically deploys when you push to your connected branch!

1. In your Railway project, go to **Settings** → **Source**
2. Verify it shows your GitHub repo and branch (should be `main`)
3. Under **Deploy Triggers**, ensure "Deploy on push" is enabled (it is by default)

**That's it!** Every push to `main` will now auto-deploy your backend. No GitHub Actions needed - Railway handles everything!

#### G. Test Auto-Deploy
1. Make a small change to `backend/README.md`
2. Commit and push to `main`:
   ```bash
   git add backend/README.md
   git commit -m "Test auto-deploy"
   git push origin main
   ```
3. Check Railway dashboard - you'll see a new deployment start automatically

---

### 2. Frontend Setup for iPhone (~10 minutes)

#### A. Install Expo Go on iPhone
1. Open App Store
2. Search for "Expo Go"
3. Install the app (it's free)

#### B. Update Backend URL for Production
Edit `frontend/app.json`:

```json
"extra": {
  "apiBaseUrl": "https://your-railway-url.railway.app/api"
}
```

Replace `your-railway-url.railway.app` with your actual Railway URL from step 1.E.

#### C. Start Development Server
```bash
cd frontend
npm start
```

#### D. Open App on iPhone
1. Open Expo Go app on your iPhone
2. Scan the QR code from your terminal
   - **iOS**: Use the built-in Camera app
   - **Android**: Use the "Scan QR Code" option in Expo Go

**Note**: Your phone and computer must be on the same Wi-Fi network.

---

## Regular Usage

### Updating the Backend

Just push to `main`:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Railway will automatically detect the push and deploy (~2-3 minutes).

### Updating the Frontend

When you make frontend changes, just restart the development server:

```bash
cd frontend
npm start
```

Then scan the QR code with Expo Go to see your changes. Changes will hot-reload automatically!

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

#### "Cannot find module '/app/dist/server.js'" error
- This means the build failed - `dist/` folder wasn't created or copied
- Check that `backend/Dockerfile` exists in your repository
- Verify that Railway root directory is set to `backend`
- Check build logs in Railway for TypeScript compilation errors
- Ensure the Dockerfile properly copies the dist folder in the production stage

#### Frontend can't connect to backend
- Check `frontend/app.json` → `extra.apiBaseUrl`
- Check backend CORS settings
- View network requests in Expo debugger: shake phone → "Debug Remote JS"

#### App not updating
- Make sure the dev server is running: `npm start`
- Reload the app: Shake phone → "Reload"
- Clear Expo Go cache: Long-press app → Clear cache

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

**Total: $5/month** (or $0 if you use Railway's free tier with cold starts)

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
npm start            # Start Expo dev server
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
- [ ] Railway auto-deploy from GitHub working (push triggers deployment)
- [ ] MongoDB connected (check Railway logs)
- [ ] Expo Go installed on iPhone
- [ ] Frontend dev server running (`npm start`)
- [ ] App opens on iPhone via Expo Go
- [ ] Can create account and login
- [ ] Can generate workout

---

You're all set! 🎉 Enjoy your workouts!
