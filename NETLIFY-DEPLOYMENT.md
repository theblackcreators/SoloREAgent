# 🚀 Netlify Deployment Guide

## ✅ GitHub Push Complete!

Your code has been successfully pushed to GitHub:
- **Repository**: https://github.com/theblackcreators/SoloREAgent
- **Branch**: main
- **Commit**: Complete Next.js/Supabase migration with all features

---

## 📦 Deploy to Netlify

### Step 1: Connect to Netlify

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your GitHub account
5. Select the repository: **`theblackcreators/SoloREAgent`**

### Step 2: Configure Build Settings

Netlify should auto-detect Next.js settings, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Branch to deploy**: `main`

### Step 3: Add Environment Variables

Click **"Show advanced"** → **"New variable"** and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token
CRON_SECRET=your-random-secret
```

⚠️ **Important**: Replace with your actual values from Supabase and Mapbox!

### Step 4: Deploy!

Click **"Deploy site"** and wait for the build to complete (2-5 minutes).

---

## ⚠️ Important: Cron Jobs on Netlify

**The Vercel cron job won't work on Netlify!**

The `vercel.json` cron configuration is Vercel-specific. For Netlify, you have two options:

### Option A: Use Netlify Scheduled Functions (Recommended)

1. Create `netlify/functions/generate-daily.ts`:

```typescript
import { schedule } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

export const handler = schedule("0 7 * * *", async () => {
  // Your daily quest generation logic here
  // (copy from app/api/generate-daily/route.ts)
  
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Daily quests generated" }),
  };
});
```

2. Install Netlify CLI: `npm install -D @netlify/functions`
3. Redeploy

### Option B: Use External Cron Service

Use a service like:
- **Cron-job.org** (free)
- **EasyCron** (free tier)
- **GitHub Actions** (free)

Set it to call: `https://your-site.netlify.app/api/generate-daily` daily at 7 AM UTC.

---

## 🔍 Verify Deployment

After deployment completes:

1. **Check build logs** for any errors
2. **Visit your site**: `https://your-site-name.netlify.app`
3. **Test navigation**: Dashboard, Today, Join, Map, Admin pages
4. **Check browser console** for any errors

---

## 🐛 Troubleshooting

### Build Fails

**Error**: "Module not found"
- **Fix**: Make sure all dependencies are in `package.json`
- Run: `npm install` locally to verify

**Error**: "Environment variable not set"
- **Fix**: Add all required env vars in Netlify dashboard

### Site Loads but Features Don't Work

**Issue**: Supabase errors
- **Fix**: Verify environment variables are correct
- Check Supabase project is active
- Verify RLS policies are created

**Issue**: Map doesn't load
- **Fix**: Verify Mapbox token is correct
- Check token is public (starts with `pk.`)

### API Routes Return 404

**Issue**: Next.js API routes not working
- **Fix**: Ensure `@netlify/plugin-nextjs` is installed
- Check `netlify.toml` is configured correctly

---

## 🎯 Alternative: Deploy to Vercel (Recommended)

Since this project was built for Vercel, you might want to deploy there instead:

### Why Vercel?

✅ **Cron jobs work out of the box** (vercel.json)  
✅ **Optimized for Next.js** (made by the same team)  
✅ **Automatic deployments** on git push  
✅ **Edge functions** for better performance  

### Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Import from GitHub: `theblackcreators/SoloREAgent`
4. Add environment variables (same as above)
5. Click **"Deploy"**

The cron job will automatically work with no additional setup!

---

## 📊 Comparison: Netlify vs Vercel

| Feature | Netlify | Vercel |
|---------|---------|--------|
| **Next.js Support** | ✅ Good | ✅ Excellent |
| **Cron Jobs** | ⚠️ Requires setup | ✅ Built-in |
| **Build Speed** | ✅ Fast | ✅ Very Fast |
| **Free Tier** | ✅ 300 build minutes | ✅ Unlimited |
| **Edge Functions** | ✅ Yes | ✅ Yes |
| **Custom Domains** | ✅ Yes | ✅ Yes |

---

## 🎉 You're All Set!

Your code is on GitHub and ready to deploy to either:
- **Netlify** (with manual cron setup)
- **Vercel** (recommended, cron works automatically)

Choose the platform that works best for you!

---

## 📚 Next Steps After Deployment

1. ✅ Set up Supabase project
2. ✅ Run migration SQL
3. ✅ Get Mapbox token
4. ✅ Update environment variables
5. ✅ Test the deployed site
6. ✅ Set up cron job (if using Netlify)
7. ✅ Share with your team!

---

**Need help?** Check the troubleshooting section or ask for assistance! 🚀

