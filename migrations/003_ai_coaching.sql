-- AI Coaching System Migration
-- Run this after the achievements migration

-- ============================================
-- AI DAILY TASKS
-- ============================================

-- AI-generated daily tasks for users
CREATE TABLE IF NOT EXISTS public.ai_daily_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  task_date DATE NOT NULL,
  
  -- Task details
  pillar TEXT NOT NULL CHECK (pillar IN ('fitness', 'real_estate', 'social')),
  title TEXT NOT NULL,
  description TEXT,
  action TEXT NOT NULL,           -- Specific action to take
  timing TEXT,                    -- When to do it (e.g., "6:00 AM", "Morning")
  duration_minutes INTEGER,       -- Expected duration
  why_it_matters TEXT,            -- Brief context for motivation
  
  -- Priority and ordering
  priority INTEGER DEFAULT 1,     -- 1 = highest priority
  sequence_order INTEGER DEFAULT 0,
  
  -- Completion tracking
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT FALSE,
  skip_reason TEXT,
  
  -- XP and rewards
  xp_reward INTEGER DEFAULT 5,
  stat_rewards JSONB DEFAULT '{}',
  
  -- AI generation metadata
  generation_context JSONB DEFAULT '{}',  -- Stats/data used to generate
  ai_model TEXT DEFAULT 'rule-based',     -- 'rule-based', 'gpt-4', 'claude', etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, cohort_id, task_date, pillar, sequence_order)
);

-- ============================================
-- USER PREFERENCES FOR AI COACHING
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_user_preferences (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  
  -- Schedule preferences
  wake_time TIME DEFAULT '06:00',
  sleep_time TIME DEFAULT '22:00',
  work_start TIME DEFAULT '09:00',
  work_end TIME DEFAULT '17:00',
  
  -- Fitness preferences
  fitness_level TEXT DEFAULT 'intermediate' CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_workout_time TEXT DEFAULT 'morning' CHECK (preferred_workout_time IN ('morning', 'afternoon', 'evening')),
  workout_duration_preference INTEGER DEFAULT 45,  -- minutes
  
  -- Real estate preferences
  daily_call_target INTEGER DEFAULT 20,
  daily_text_target INTEGER DEFAULT 50,
  prospecting_hours INTEGER DEFAULT 3,
  
  -- Social preferences
  networking_comfort TEXT DEFAULT 'moderate' CHECK (networking_comfort IN ('low', 'moderate', 'high')),
  content_creation_frequency TEXT DEFAULT 'daily' CHECK (content_creation_frequency IN ('daily', 'weekly', 'occasional')),
  
  -- AI behavior
  coaching_intensity TEXT DEFAULT 'balanced' CHECK (coaching_intensity IN ('gentle', 'balanced', 'aggressive')),
  include_motivational_messages BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, cohort_id)
);

-- ============================================
-- TASK FEEDBACK FOR LEARNING
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_task_feedback (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES public.ai_daily_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Feedback type
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'too_easy', 'too_hard', 'wrong_timing', 'completed_early', 'other')),
  feedback_text TEXT,
  
  -- Timing data
  actual_duration_minutes INTEGER,
  actual_completion_time TIME,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_ai_daily_tasks_user_date ON public.ai_daily_tasks(user_id, cohort_id, task_date);
CREATE INDEX IF NOT EXISTS idx_ai_daily_tasks_pillar ON public.ai_daily_tasks(pillar);
CREATE INDEX IF NOT EXISTS idx_ai_daily_tasks_completed ON public.ai_daily_tasks(completed);
CREATE INDEX IF NOT EXISTS idx_ai_user_preferences_user ON public.ai_user_preferences(user_id, cohort_id);
CREATE INDEX IF NOT EXISTS idx_ai_task_feedback_task ON public.ai_task_feedback(task_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.ai_daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_feedback ENABLE ROW LEVEL SECURITY;

-- AI Daily Tasks: Users can view/update their own tasks
CREATE POLICY "Users can view own AI tasks" ON public.ai_daily_tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own AI tasks" ON public.ai_daily_tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service can insert AI tasks" ON public.ai_daily_tasks
  FOR INSERT WITH CHECK (TRUE);

-- AI User Preferences: Users can manage their own preferences
CREATE POLICY "Users can view own AI preferences" ON public.ai_user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI preferences" ON public.ai_user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI preferences" ON public.ai_user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- AI Task Feedback: Users can manage their own feedback
CREATE POLICY "Users can view own feedback" ON public.ai_task_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback" ON public.ai_task_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

