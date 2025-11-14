# Railway Deployment Guide - PostgreSQL Migration

This guide explains how to deploy the backend to Railway with PostgreSQL and run database migrations.

## Prerequisites

1. Railway account with a project set up
2. PostgreSQL database provisioned in Railway
3. Backend service connected to the database

## Environment Variables

Make sure these environment variables are set in your Railway service:

- `DATABASE_URL` - Automatically set by Railway when you connect the PostgreSQL service
- `JWT_SECRET` - Your JWT secret key
- `ANTHROPIC_API_KEY` - Your Anthropic API key for AI features
- `NODE_ENV` - Set to `production`

## Migration Strategy

### Option A: Build Command (Recommended)

Run migrations automatically during the build phase. This ensures migrations complete before the app starts.

**In Railway Dashboard:**
1. Go to your backend service settings
2. Under "Build" section, set the **Build Command**:
   ```bash
   npm run migrate:latest && npm run build
   ```
3. Keep the **Start Command** as:
   ```bash
   npm start
   ```

**Pros:**
- Migrations run automatically on every deploy
- If migrations fail, the deploy fails (prevents deploying with mismatched schema)
- Clean separation: migrations run once during build

**Cons:**
- Build failures if migrations have issues
- No rollback support (use `migrate:down` manually via Railway CLI if needed)

### Option B: Application Startup (Alternative)

Run migrations when the app starts. This requires modifying `src/server.ts`.

**Implementation:**
```typescript
// In src/server.ts, add before app.listen():
import { migrateToLatest } from '../migrations/runner';
import * as path from 'path';

async function startServer() {
  // Run migrations on startup
  const migrationsPath = path.join(__dirname, '../migrations');
  await migrateToLatest(db, migrationsPath);

  // Then start the server
  const PORT = env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
```

**Pros:**
- Guaranteed to run before app starts
- Works automatically

**Cons:**
- Increases startup time
- Potential race conditions with multiple instances
- App crashes if migrations fail

### Option C: Manual Migration (Not Recommended)

Run migrations manually using Railway CLI before deploying.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migration
railway run npm run migrate:latest

# Then deploy
railway up
```

**Pros:**
- Full control over when migrations run
- Can verify migrations before deploying code

**Cons:**
- Manual step that's easy to forget
- Risk of deploying code without running migrations

## Recommended Workflow

**Use Option A (Build Command)** for most cases:

1. Set build command to: `npm run migrate:latest && npm run build`
2. Push your code to trigger deployment
3. Railway will:
   - Run `npm ci` to install dependencies
   - Run `npm run migrate:latest` to update the database schema
   - Run `npm run build` to compile TypeScript
   - Start the app with `npm start`

## Rollback Migrations

If you need to rollback a migration:

```bash
# Using Railway CLI
railway run npm run migrate:down
```

## Monitoring

Check migration status in Railway logs:
1. Go to your backend service in Railway
2. Click "Deployments"
3. View the build logs - you should see migration output like:
   ```
   ✓ Migration "001_initial_schema" was executed successfully
   ```

## Initial Deployment

For the first deployment with an existing database:

1. If you have existing data in a MongoDB database, you'll need to migrate the data separately
2. The first deployment will create all tables via the migration
3. Verify tables were created by connecting to Railway PostgreSQL:
   ```bash
   railway connect postgres
   # Then in psql:
   \dt
   # Should show: users, exercises, workouts, etc.
   ```

## Troubleshooting

### Migration fails during build
- Check the build logs in Railway for the specific error
- Common issues:
  - Missing environment variables
  - Invalid DATABASE_URL
  - Syntax errors in migration files

### App starts but tables don't exist
- Migrations didn't run or failed silently
- Check that `DATABASE_URL` is correct
- Verify build command includes `npm run migrate:latest`

### Multiple deployments running migrations simultaneously
- Railway typically deploys one instance at a time
- If you scale to multiple instances, avoid Option B (startup migrations)
- Use Option A (build command) which runs once during build phase
