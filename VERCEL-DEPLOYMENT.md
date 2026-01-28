# 🚀 Vercel Deployment Guide (Recommended)


## ✅ Why Vercel?

**Vercel is the BEST choice for this project because:**

✅ **Cron jobs work automatically** - `vercel.json` is already configured!  
✅ **Made by Next.js team** - Optimized for Next.js 14 App Router  
✅ **Zero configuration** - Auto-detects everything  
✅ **Instant deployments** - Deploy in under 2 minutes  
✅ **Edge functions** - Lightning-fast API routes  
✅ **Free tier** - Unlimited personal projects  

---

## 🎯 Deploy to Vercel (5 Minutes)

### Step 1: Go to Vercel

1. Open [vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"**

### Step 2: Import Your Repository

1. Click **"Add New..."** → **"Project"**
2. Find and select: **`theblackcreators/SoloREAgent`**
3. Click **"Import"**

### Step 3: Configure Project

Vercel will auto-detect Next.js settings:

- ✅ **Framework Preset**: Next.js (auto-detected)
- ✅ **Build Command**: `next build` (auto-detected)
- ✅ **Output Directory**: `.next` (auto-detected)
- ✅ **Install Command**: `npm install` (auto-detected)

**You don't need to change anything!**

### Step 4: Add Environment Variables

Click **"Environment Variables"** and add these:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token-here
CRON_SECRET=your-random-secret-here
```

⚠️ **Important**: Replace with your actual values!

**Where to get these values:**

1. **Supabase credentials**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project (or use existing)
   - Go to **Settings** → **API**
   - Copy **Project URL** and **anon public** key
   - Copy **service_role** key (keep this secret!)

2. **Mapbox token**:
   - Go to [mapbox.com](https://mapbox.com)
   - Sign up and create an access token
   - Copy the **public token** (starts with `pk.`)

3. **Cron secret**:
   - Generate a random string (e.g., `openssl rand -hex 32`)
   - Or use any random password generator

### Step 5: Deploy!

1. Click **"Deploy"**
2. Wait 1-2 minutes for the build to complete
3. 🎉 Your site is live!

---

## ✅ Verify Deployment

After deployment completes:

### 1. Check Build Logs
- Look for ✅ green checkmarks
- No red errors

### 2. Visit Your Site
- Click **"Visit"** button
- Your site URL: `https://your-project.vercel.app`

### 3. Test All Pages
- ✅ Dashboard (`/dashboard`)
- ✅ Today (`/today`)
- ✅ Join (`/join`)
- ✅ Map (`/map`)
- ✅ Admin Invites (`/admin/invites`)
- ✅ Admin Locations (`/admin/locations`)

### 4. Verify Cron Job
- Go to **Settings** → **Cron Jobs**
- You should see: **`/api/generate-daily`** scheduled for **7:00 AM UTC**
- ✅ This was auto-configured from `vercel.json`!

---

## 🗄️ Set Up Supabase Database

Your app needs a database to work. Follow these steps:

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New project"**
3. Choose organization and name your project
4. Set a strong database password
5. Choose a region (closest to your users)
6. Click **"Create new project"**

### 2. Run Migration SQL

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Open `supabase-migration.sql` from your project
4. Copy and paste the entire contents
5. Click **"Run"**
6. ✅ All tables, RLS policies, and seed data are created!

### 3. Update Environment Variables in Vercel

1. Go to your Vercel project
2. Click **Settings** → **Environment Variables**
3. Update the Supabase variables with your real values
4. Click **"Save"**
5. Go to **Deployments** → Click **"..."** → **"Redeploy"**

---

## 🗺️ Set Up Mapbox

### 1. Create Mapbox Account

1. Go to [mapbox.com](https://mapbox.com)
2. Sign up for a free account
3. Go to **Account** → **Access tokens**
4. Copy your **Default public token** (starts with `pk.`)

### 2. Update Vercel Environment Variable

1. Go to Vercel project → **Settings** → **Environment Variables**
2. Update `NEXT_PUBLIC_MAPBOX_TOKEN` with your token
3. Click **"Save"**
4. Redeploy

---

## 🎮 Test the Full App

Once Supabase and Mapbox are set up:

### 1. Create a Test User
- Go to your deployed site
- Sign up with Supabase Auth
- You'll be redirected to the dashboard

### 2. Create an Invite Code (Admin)
- Go to `/admin/invites`
- Select a cohort
- Generate an invite code

### 3. Test Daily Log
- Go to `/today`
- Fill in your daily activities
- Submit the form
- Check that XP and stats update

### 4. Test Map
- Go to `/map`
- See locations on the map
- Try checking in to a location

---

## 🐛 Troubleshooting

### Build Fails

**Error**: "Module not found"
- **Fix**: Check `package.json` has all dependencies
- Run `npm install` locally to verify

**Error**: "Environment variable not set"
- **Fix**: Add all required env vars in Vercel dashboard

### Site Loads but Features Don't Work

**Issue**: Supabase errors in console
- **Fix**: Verify environment variables are correct
- Check Supabase project is active
- Verify migration SQL was run successfully

**Issue**: Map doesn't load
- **Fix**: Verify Mapbox token is correct
- Check token is public (starts with `pk.`)
- Check browser console for errors

**Issue**: Cron job not running
- **Fix**: Check **Settings** → **Cron Jobs** in Vercel
- Verify `vercel.json` is in the repository
- Check function logs for errors

---

## 🔄 Automatic Deployments

**Every time you push to GitHub, Vercel will automatically:**

1. ✅ Build your app
2. ✅ Run tests (if configured)
3. ✅ Deploy to production
4. ✅ Update cron jobs

**No manual deployment needed!**

---

## 🎉 You're Live!

Your **Elite-Agent-System** is now deployed on Vercel with:

✅ **Automatic deployments** from GitHub  
✅ **Cron jobs** running daily at 7 AM UTC  
✅ **Edge functions** for fast API routes  
✅ **SSL certificate** (HTTPS)  
✅ **Custom domain** support (optional)  

---

## 📊 Monitor Your App

### Vercel Dashboard

- **Analytics**: See page views and performance
- **Logs**: View function logs and errors
- **Deployments**: See deployment history
- **Cron Jobs**: Monitor scheduled function runs

### Supabase Dashboard

- **Database**: View tables and data
- **Auth**: Manage users
- **Logs**: See database queries
- **API**: Monitor API usage

---

## 🚀 Next Steps

1. ✅ Share your site URL with your team
2. ✅ Set up a custom domain (optional)
3. ✅ Invite users with invite codes
4. ✅ Monitor cron job runs
5. ✅ Add more features!

---

**Your app is live and ready to use!** 🎉

**Site URL**: Check your Vercel dashboard for the URL

**Need help?** Check the troubleshooting section or ask for assistance! 🚀

