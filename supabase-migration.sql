-- ============================================
-- Solo RE Agent - Supabase Migration SQL
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Profiles (user metadata)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs (leveling system templates)
CREATE TABLE IF NOT EXISTS public.programs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cohorts (running instances of programs)
CREATE TABLE IF NOT EXISTS public.cohorts (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cohort Memberships
CREATE TABLE IF NOT EXISTS public.cohort_memberships (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'coach', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cohort_id)
);

-- Member Stats (per-cohort stats)
CREATE TABLE IF NOT EXISTS public.member_stats (
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  rank TEXT DEFAULT 'E' CHECK (rank IN ('E', 'D', 'C', 'B', 'A', 'S')),
  streak INTEGER DEFAULT 0,
  str INTEGER DEFAULT 0,
  sta INTEGER DEFAULT 0,
  agi INTEGER DEFAULT 0,
  int_stat INTEGER DEFAULT 0,
  cha INTEGER DEFAULT 0,
  rep INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cohort_id, user_id)
);

-- Daily Logs
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  steps INTEGER DEFAULT 0,
  workout_done BOOLEAN DEFAULT FALSE,
  calls INTEGER DEFAULT 0,
  texts INTEGER DEFAULT 0,
  convos INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  appts INTEGER DEFAULT 0,
  content_done BOOLEAN DEFAULT FALSE,
  learning_minutes INTEGER DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cohort_id, log_date)
);

-- Quest Templates
CREATE TABLE IF NOT EXISTS public.quest_templates (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('mandatory', 'fitness', 'business', 'learning', 'location')),
  xp_reward INTEGER DEFAULT 0,
  stat_rewards JSONB DEFAULT '{}',
  completion_rule JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Quests (instantiated from templates)
CREATE TABLE IF NOT EXISTS public.daily_quests (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  quest_date DATE NOT NULL,
  template_id INTEGER REFERENCES public.quest_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  stat_rewards JSONB DEFAULT '{}',
  completion_rule JSONB,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cohort_id, quest_date, template_id)
);

-- Locations (dungeons)
CREATE TABLE IF NOT EXISTS public.locations (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  zone TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  suggested_mission TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location Check-ins
CREATE TABLE IF NOT EXISTS public.location_check_ins (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  location_id INTEGER NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cohort_id, location_id)
);

-- Cohort Invites
CREATE TABLE IF NOT EXISTS public.cohort_invites (
  id SERIAL PRIMARY KEY,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('agent', 'coach', 'admin')),
  max_uses INTEGER,
  uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_cohort_date ON public.daily_logs(user_id, cohort_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_cohort_date ON public.daily_quests(user_id, cohort_id, quest_date);
CREATE INDEX IF NOT EXISTS idx_member_stats_user_cohort ON public.member_stats(user_id, cohort_id);
CREATE INDEX IF NOT EXISTS idx_quest_templates_completion_rule ON public.quest_templates USING GIN (completion_rule);
CREATE INDEX IF NOT EXISTS idx_daily_quests_completion_rule ON public.daily_quests USING GIN (completion_rule);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_invites ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Programs: Public read
CREATE POLICY "Programs are publicly readable" ON public.programs
  FOR SELECT USING (TRUE);

-- Cohorts: Public read
CREATE POLICY "Cohorts are publicly readable" ON public.cohorts
  FOR SELECT USING (TRUE);

-- Cohort Memberships: Users can view their own memberships
CREATE POLICY "Users can view own memberships" ON public.cohort_memberships
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memberships" ON public.cohort_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Member Stats: Users can view/update their own stats
CREATE POLICY "Users can view own stats" ON public.member_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.member_stats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON public.member_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily Logs: Users can view/update their own logs
CREATE POLICY "Users can view own logs" ON public.daily_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs" ON public.daily_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs" ON public.daily_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Quest Templates: Public read
CREATE POLICY "Quest templates are publicly readable" ON public.quest_templates
  FOR SELECT USING (TRUE);

-- Daily Quests: Users can view/update their own quests
CREATE POLICY "Users can view own quests" ON public.daily_quests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quests" ON public.daily_quests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quests" ON public.daily_quests
  FOR UPDATE USING (auth.uid() = user_id);

-- Locations: Public read
CREATE POLICY "Locations are publicly readable" ON public.locations
  FOR SELECT USING (TRUE);

-- Location Check-ins: Users can view/insert their own check-ins
CREATE POLICY "Users can view own check-ins" ON public.location_check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins" ON public.location_check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cohort Invites: Public read (for redemption)
CREATE POLICY "Invites are publicly readable" ON public.cohort_invites
  FOR SELECT USING (TRUE);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert sample program
INSERT INTO public.programs (name, description) VALUES
  ('Solo Leveling: Houston Agent', 'Gamified real estate agent training program for Houston market')
ON CONFLICT DO NOTHING;

-- Insert sample cohort
INSERT INTO public.cohorts (program_id, name, start_date, is_active) VALUES
  (1, 'Houston S1 2026', '2026-01-01', TRUE)
ON CONFLICT DO NOTHING;

-- Insert quest templates with completion rules
INSERT INTO public.quest_templates (program_id, title, description, quest_type, xp_reward, completion_rule, active) VALUES
  (1, 'MOVE: 7k Steps', 'Walk at least 7,000 steps today', 'mandatory', 5,
   '{"field": "steps", "op": "gte", "value": 7000}', TRUE),

  (1, 'TRAIN: Workout', 'Complete a workout session', 'mandatory', 5,
   '{"field": "workout_done", "op": "eq", "value": true}', TRUE),

  (1, 'LEARN: 20 Minutes', 'Study real estate for 20+ minutes', 'mandatory', 5,
   '{"field": "learning_minutes", "op": "gte", "value": 20}', TRUE),

  (1, 'HUNT: Prospecting', 'Make 5 convos OR 1 appt OR (20 calls AND 40 texts)', 'mandatory', 5,
   '{"any": [{"field": "convos", "op": "gte", "value": 5}, {"field": "appts", "op": "gte", "value": 1}, {"all": [{"field": "calls", "op": "gte", "value": 20}, {"field": "texts", "op": "gte", "value": 40}]}]}', TRUE),

  (1, 'Dungeon Check-In', 'Visit a location on the map', 'location', 10, NULL, TRUE),

  (1, 'Content Creator', 'Post content on social media', 'business', 10,
   '{"field": "content_done", "op": "eq", "value": true}', TRUE),

  (1, '10k Steps', 'Walk 10,000 steps', 'fitness', 5,
   '{"field": "steps", "op": "gte", "value": 10000}', TRUE)
ON CONFLICT DO NOTHING;

-- Insert sample locations
INSERT INTO public.locations (program_id, zone, name, category, lat, lng, suggested_mission) VALUES
  (1, 'EaDo', 'Discovery Green', 'Park', 29.7520, -95.3585, 'Take a walk and practice your elevator pitch'),
  (1, 'EaDo', 'Minute Maid Park', 'Stadium', 29.7573, -95.3555, 'Network with fans before a game'),
  (1, 'Kingwood', 'Kingwood Town Center', 'Shopping', 30.0533, -95.1869, 'Practice door knocking at retail stores'),
  (1, 'Humble/Atascocita', 'Deerbrook Mall', 'Shopping', 29.9897, -95.1869, 'Engage with shoppers about real estate')
ON CONFLICT DO NOTHING;

