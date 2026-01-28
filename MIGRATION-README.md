# Solo RE Agent - Next.js/Supabase Migration

## 🎯 Overview

This project has been migrated from **Express/Drizzle/Replit Auth** to **Next.js 14/Supabase/Vercel**.

### Stack Changes

| Component | Before | After |
|-----------|--------|-------|
| **Frontend** | React + Vite + Wouter | Next.js 14 App Router |
| **Backend** | Express.js | Next.js API Routes |
| **Database** | PostgreSQL + Drizzle ORM | Supabase (PostgreSQL + Auth) |
| **Auth** | Replit Auth | Supabase Auth |
| **Maps** | None | Mapbox GL |
| **Deployment** | Replit | Vercel |
| **Cron Jobs** | None | Vercel Cron |

---

## 🚀 Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Supabase account ([supabase.com](https://supabase.com))
- Mapbox account ([mapbox.com](https://mapbox.com))
- Vercel account ([vercel.com](https://vercel.com)) (for deployment)

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to finish provisioning
3. Go to **Settings** → **API** and copy:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon/Public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service Role key (`SUPABASE_SERVICE_ROLE_KEY`) ⚠️ **Keep this secret!**

### 3. Run Database Migration

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase-migration.sql`
5. Paste into the SQL editor
6. Click **Run** to execute the migration

This will create:
- All tables (profiles, programs, cohorts, quests, locations, etc.)
- Row Level Security (RLS) policies
- Indexes for performance
- Seed data (sample program, cohort, quest templates, locations)

### 4. Get Mapbox Token

1. Go to [mapbox.com](https://mapbox.com) and sign up/login
2. Go to **Account** → **Access Tokens**
3. Copy your default public token (starts with `pk.`)
4. This is your `NEXT_PUBLIC_MAPBOX_TOKEN`

### 5. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your-mapbox-token

# Optional: Cron secret for Vercel (recommended)
CRON_SECRET=your-random-secret-string
```

⚠️ **Never commit `.env.local` to git!** It's already in `.gitignore`.

### 6. Install Dependencies

```bash
npm install
```

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Migrate to Next.js/Supabase"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure environment variables:
   - Add all variables from `.env.local`
   - Make sure to add `CRON_SECRET` for the daily quest generation cron job
5. Click **Deploy**

### 3. Verify Cron Job

The `vercel.json` file configures a cron job to run daily at 7 AM UTC:

```json
{
  "crons": [
    {
      "path": "/api/generate-daily",
      "schedule": "0 7 * * *"
    }
  ]
}
```

This automatically generates daily quests for all agents in active cohorts.

---

## 🎮 Core Features

### Game Mechanics

- **Rank System**: E → D → C → B → A → S (based on XP)
- **XP Thresholds**: 0, 500, 1500, 3000, 5000, 7500
- **Stats**: STR, STA, AGI, INT, CHA, REP, GOLD
- **Streak Logic**: Complete 3 of 4 mandatory quests to maintain streak
- **Mandatory Quests**: MOVE (7k steps), TRAIN (workout), HUNT (prospecting), LEARN (20 min study)

### Advanced Features

- **Delta-based XP/Stat Updates**: Idempotent log saving (edit-safe)
- **Streak Recomputation**: Lookback algorithm rebuilds streak from historical logs
- **Rule Engine**: JSON-based quest completion rules with operators (eq, gte, etc.) and combinators (all, any, atLeast)
- **Multi-tenant**: Programs → Cohorts → Memberships
- **Invite System**: Generate invite codes with max uses and expiration
- **Location Check-ins**: Map-based "dungeon" system with Mapbox

---

## 📁 Project Structure

```
/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── log/              # Daily log saving (CRITICAL)
│   │   ├── generate-daily/   # Cron job for quest generation
│   │   ├── join/             # Invite code redemption
│   │   └── admin/            # Admin endpoints
│   ├── dashboard/            # Main HUD page
│   ├── today/                # Daily log input
│   ├── join/                 # Invite code entry
│   ├── map/                  # Mapbox location check-ins
│   └── admin/                # Admin pages
├── lib/                      # Utilities
│   ├── supabaseClient.ts     # Browser Supabase client
│   ├── supabaseAdmin.ts      # Server Supabase client (service role)
│   ├── ranks.ts              # Rank system logic
│   ├── engine.ts             # XP/stat calculation
│   ├── ruleEngine.ts         # Quest completion rule evaluator
│   ├── date.ts               # Date utilities
│   ├── parseLatLng.ts        # Coordinate parser
│   ├── authedFetch.ts        # Authenticated fetch helper
│   └── contracts.ts          # Zod validation schemas
├── components/               # React components
│   ├── HudCard.tsx
│   ├── StatBar.tsx
│   └── QuestList.tsx
├── supabase-migration.sql    # Database schema + seed data
├── next.config.js            # Next.js configuration
├── vercel.json               # Vercel cron job config
└── package.json              # Dependencies
```

---

## 🔑 Key API Routes

### `/api/log` (POST)
**Purpose**: Save daily log with delta-based XP/stat updates

**Critical Features**:
- Idempotent (can re-save same day without double-adding)
- Delta calculation (old vs new log)
- Streak recomputation with lookback
- Auto-complete quests based on rules

**Request**:
```json
{
  "cohortId": 1,
  "logDate": "2026-01-27",
  "steps": 10000,
  "workout_done": true,
  "learning_minutes": 30,
  "calls": 25,
  "texts": 50,
  "convos": 6,
  "leads": 2,
  "appts": 1,
  "content_done": true,
  "notes": "Great day!"
}
```

### `/api/generate-daily` (GET)
**Purpose**: Vercel cron job to generate daily quests

**Runs**: Daily at 7 AM UTC

**Process**:
1. Get all active cohorts
2. Get all members in each cohort
3. Get quest templates for each program
4. Generate daily quests for each member
5. Snapshot `completion_rule` from templates

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Sign up with Supabase Auth
- [ ] Redeem invite code (`/join`)
- [ ] View dashboard (`/dashboard`)
- [ ] Log daily activity (`/today`)
- [ ] Check quest auto-completion
- [ ] Verify XP/stat gains
- [ ] Test streak calculation
- [ ] Check-in to location (`/map`)
- [ ] Admin: Create invite codes
- [ ] Admin: Manage locations with coordinate helper

---

## 🐛 Troubleshooting

### "Missing environment variable" error
- Make sure all variables in `.env.local` are set
- Restart dev server after changing `.env.local`

### Supabase RLS errors
- Check that RLS policies are created (run migration SQL)
- Verify user is authenticated
- Check browser console for auth errors

### Mapbox not loading
- Verify `NEXT_PUBLIC_MAPBOX_TOKEN` is set
- Check browser console for Mapbox errors
- Ensure token is public (starts with `pk.`)

### Cron job not running
- Verify `vercel.json` is committed
- Check Vercel dashboard → Settings → Cron Jobs
- Add `CRON_SECRET` environment variable

---

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

---

## 🎉 You're All Set!

Your Solo RE Agent system is now running on Next.js + Supabase + Vercel!

For questions or issues, check the troubleshooting section above.

