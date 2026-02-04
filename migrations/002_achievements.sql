-- Achievements System Migration
-- Run this after the main schema is set up

-- Achievements definition table
CREATE TABLE IF NOT EXISTS public.achievements (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🏆',
  category TEXT NOT NULL CHECK (category IN ('streak', 'rank', 'quest', 'activity', 'special')),
  criteria JSONB NOT NULL DEFAULT '{}',
  xp_reward INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements (unlocked badges)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cohort_id, achievement_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_cohort ON public.user_achievements(cohort_id);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);

-- RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Achievements are publicly readable
CREATE POLICY "Achievements are publicly readable" ON public.achievements
  FOR SELECT USING (TRUE);

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert achievements
CREATE POLICY "Service can insert user achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (TRUE);

-- Seed default achievements
INSERT INTO public.achievements (slug, name, description, icon, category, criteria, xp_reward, rarity) VALUES
  -- Streak achievements
  ('first_log', 'First Steps', 'Log your first daily activity', '👟', 'activity', '{"type": "first_log"}', 10, 'common'),
  ('streak_3', 'Getting Started', 'Achieve a 3-day streak', '🔥', 'streak', '{"type": "streak", "value": 3}', 25, 'common'),
  ('streak_7', 'Week Warrior', 'Achieve a 7-day streak', '💪', 'streak', '{"type": "streak", "value": 7}', 50, 'uncommon'),
  ('streak_14', 'Fortnight Fighter', 'Achieve a 14-day streak', '⚔️', 'streak', '{"type": "streak", "value": 14}', 100, 'rare'),
  ('streak_30', 'Monthly Master', 'Achieve a 30-day streak', '👑', 'streak', '{"type": "streak", "value": 30}', 200, 'epic'),
  ('streak_60', 'Unstoppable', 'Achieve a 60-day streak', '🌟', 'streak', '{"type": "streak", "value": 60}', 500, 'legendary'),
  
  -- Rank achievements
  ('rank_d', 'D-Rank Agent', 'Reach D-Rank', '🟢', 'rank', '{"type": "rank", "value": "D"}', 50, 'common'),
  ('rank_c', 'C-Rank Agent', 'Reach C-Rank', '🔵', 'rank', '{"type": "rank", "value": "C"}', 100, 'uncommon'),
  ('rank_b', 'B-Rank Agent', 'Reach B-Rank', '🟣', 'rank', '{"type": "rank", "value": "B"}', 200, 'rare'),
  ('rank_a', 'A-Rank Agent', 'Reach A-Rank', '🟠', 'rank', '{"type": "rank", "value": "A"}', 400, 'epic'),
  ('rank_s', 'S-Rank Elite', 'Reach the legendary S-Rank', '⭐', 'rank', '{"type": "rank", "value": "S"}', 1000, 'legendary'),
  
  -- Quest achievements
  ('quest_10', 'Quest Novice', 'Complete 10 quests', '📜', 'quest', '{"type": "quests_completed", "value": 10}', 25, 'common'),
  ('quest_50', 'Quest Apprentice', 'Complete 50 quests', '📋', 'quest', '{"type": "quests_completed", "value": 50}', 75, 'uncommon'),
  ('quest_100', 'Quest Expert', 'Complete 100 quests', '📚', 'quest', '{"type": "quests_completed", "value": 100}', 150, 'rare'),
  ('quest_500', 'Quest Master', 'Complete 500 quests', '🎯', 'quest', '{"type": "quests_completed", "value": 500}', 500, 'legendary'),
  
  -- Activity achievements
  ('steps_100k', 'Century Walker', 'Walk 100,000 total steps', '🚶', 'activity', '{"type": "total_steps", "value": 100000}', 50, 'uncommon'),
  ('appts_10', 'Closer', 'Set 10 appointments', '📅', 'activity', '{"type": "total_appts", "value": 10}', 100, 'rare'),
  ('first_checkin', 'Explorer', 'Complete your first map check-in', '🗺️', 'activity', '{"type": "first_checkin"}', 25, 'common'),
  
  -- Special achievements
  ('perfect_week', 'Perfect Week', 'Complete all quests for 7 consecutive days', '💎', 'special', '{"type": "perfect_streak", "value": 7}', 200, 'epic'),
  ('early_bird', 'Early Bird', 'Log activity before 8 AM', '🌅', 'special', '{"type": "early_log"}', 25, 'uncommon')
ON CONFLICT (slug) DO NOTHING;

