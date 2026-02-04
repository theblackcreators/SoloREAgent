-- ============================================
-- Elite Agent System - Test User Setup Script
-- ============================================
-- Run this in your Supabase SQL Editor to create test credentials
--
-- TEST USER CREDENTIALS:
--   Email: testuser@eliteagent.test
--   Password: TestUser123!
--
-- ADMIN USER CREDENTIALS:
--   Email: admin@eliteagent.test
--   Password: AdminUser123!
--
-- INVITE CODE: ELITE-TEST-2026
-- ============================================

-- Generate UUIDs for our test users
DO $$
DECLARE
  test_user_id UUID := '11111111-1111-1111-1111-111111111111';
  admin_user_id UUID := '22222222-2222-2222-2222-222222222222';
  today DATE := CURRENT_DATE;
BEGIN

-- ============================================
-- STEP 1: Create test users in auth.users
-- ============================================
-- NOTE: In Supabase, you should create users via the Dashboard or Auth API
-- This script sets up the profile and game data AFTER you create users
-- 
-- To create users via Supabase Dashboard:
-- 1. Go to Authentication > Users > Add User
-- 2. Create user with email: testuser@eliteagent.test, password: TestUser123!
-- 3. Create user with email: admin@eliteagent.test, password: AdminUser123!
-- 4. Note the generated UUIDs and update this script if needed

-- ============================================
-- STEP 2: Create profiles
-- ============================================
INSERT INTO public.profiles (user_id, display_name, email)
VALUES 
  (test_user_id, 'Test Agent', 'testuser@eliteagent.test'),
  (admin_user_id, 'Admin User', 'admin@eliteagent.test')
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email;

-- ============================================
-- STEP 3: Create cohort memberships
-- ============================================
INSERT INTO public.cohort_memberships (user_id, cohort_id, role)
VALUES 
  (test_user_id, 1, 'agent'),
  (admin_user_id, 1, 'admin')
ON CONFLICT (user_id, cohort_id) DO UPDATE SET
  role = EXCLUDED.role;

-- ============================================
-- STEP 4: Initialize member stats
-- ============================================
INSERT INTO public.member_stats (cohort_id, user_id, xp, rank, streak, str, sta, agi, int_stat, cha, rep, gold)
VALUES 
  -- Test user: Rank D with some progress
  (1, test_user_id, 450, 'D', 7, 15, 12, 8, 20, 10, 5, 250),
  -- Admin user: Rank B with more progress
  (1, admin_user_id, 2500, 'B', 21, 45, 38, 30, 55, 40, 35, 1500)
ON CONFLICT (cohort_id, user_id) DO UPDATE SET
  xp = EXCLUDED.xp,
  rank = EXCLUDED.rank,
  streak = EXCLUDED.streak,
  str = EXCLUDED.str,
  sta = EXCLUDED.sta,
  agi = EXCLUDED.agi,
  int_stat = EXCLUDED.int_stat,
  cha = EXCLUDED.cha,
  rep = EXCLUDED.rep,
  gold = EXCLUDED.gold;

-- ============================================
-- STEP 5: Create sample daily logs (past 7 days)
-- ============================================
INSERT INTO public.daily_logs (user_id, cohort_id, log_date, steps, workout_done, calls, texts, convos, leads, appts, content_done, learning_minutes, notes)
VALUES
  -- Day 1 (7 days ago)
  (test_user_id, 1, today - 7, 8500, true, 25, 50, 6, 2, 1, true, 30, 'Great prospecting day!'),
  -- Day 2
  (test_user_id, 1, today - 6, 7200, true, 20, 45, 5, 1, 0, false, 25, 'Focused on calls'),
  -- Day 3
  (test_user_id, 1, today - 5, 10200, true, 30, 60, 8, 3, 2, true, 45, 'Best day so far!'),
  -- Day 4
  (test_user_id, 1, today - 4, 6800, false, 15, 35, 4, 1, 0, false, 20, 'Rest day from gym'),
  -- Day 5
  (test_user_id, 1, today - 3, 9100, true, 22, 48, 7, 2, 1, true, 35, 'Consistent effort'),
  -- Day 6
  (test_user_id, 1, today - 2, 7800, true, 28, 55, 6, 2, 1, false, 30, 'Strong finish'),
  -- Day 7 (yesterday)
  (test_user_id, 1, today - 1, 8200, true, 24, 52, 5, 1, 1, true, 40, 'Ready for tomorrow!')
ON CONFLICT (user_id, cohort_id, log_date) DO UPDATE SET
  steps = EXCLUDED.steps,
  workout_done = EXCLUDED.workout_done,
  calls = EXCLUDED.calls,
  texts = EXCLUDED.texts,
  convos = EXCLUDED.convos,
  leads = EXCLUDED.leads,
  appts = EXCLUDED.appts,
  content_done = EXCLUDED.content_done,
  learning_minutes = EXCLUDED.learning_minutes,
  notes = EXCLUDED.notes;

-- ============================================
-- STEP 6: Create daily quests for today
-- ============================================
INSERT INTO public.daily_quests (user_id, cohort_id, quest_date, template_id, title, description, quest_type, xp_reward, completion_rule, completed)
SELECT 
  test_user_id,
  1,
  today,
  qt.id,
  qt.title,
  qt.description,
  qt.quest_type,
  qt.xp_reward,
  qt.completion_rule,
  false
FROM public.quest_templates qt
WHERE qt.program_id = 1 AND qt.active = true
ON CONFLICT (user_id, cohort_id, quest_date, template_id) DO NOTHING;

-- ============================================
-- STEP 7: Create AI daily tasks for today
-- ============================================
INSERT INTO public.ai_daily_tasks (user_id, cohort_id, task_date, pillar, title, description, action, timing, duration_minutes, why_it_matters, priority, sequence_order, xp_reward)
VALUES
  -- Fitness tasks
  (test_user_id, 1, today, 'fitness', 'Morning Walk', 'Start your day with movement', 'Take a 20-minute brisk walk around your neighborhood', '6:30 AM', 20, 'Morning movement boosts energy and mental clarity for the day ahead', 1, 1, 5),
  (test_user_id, 1, today, 'fitness', 'Strength Training', 'Build your physical foundation', 'Complete 3 sets of: 15 squats, 10 push-ups, 20 lunges', '7:00 AM', 25, 'Consistent strength training builds discipline that transfers to your sales activities', 2, 2, 5),

  -- Real Estate tasks
  (test_user_id, 1, today, 'real_estate', 'Power Hour Calls', 'Hit your daily prospecting targets', 'Make 20 prospecting calls to your lead list', '9:00 AM', 60, 'Consistent daily prospecting is the #1 predictor of real estate success', 1, 1, 10),
  (test_user_id, 1, today, 'real_estate', 'Follow-up Texts', 'Nurture your pipeline', 'Send 50 personalized follow-up texts to warm leads', '10:30 AM', 45, 'The fortune is in the follow-up - most deals close after 5+ touchpoints', 2, 2, 5),
  (test_user_id, 1, today, 'real_estate', 'Schedule Appointments', 'Convert leads to meetings', 'Book at least 1 appointment with a qualified prospect', '2:00 PM', 30, 'Face-to-face meetings are where relationships and deals are made', 3, 3, 15),

  -- Social tasks
  (test_user_id, 1, today, 'social', 'LinkedIn Engagement', 'Build your professional network', 'Comment thoughtfully on 5 posts from local professionals', '12:00 PM', 15, 'Authentic engagement builds your reputation as a knowledgeable agent', 1, 1, 5),
  (test_user_id, 1, today, 'social', 'Create Content', 'Share your expertise', 'Post a market update or helpful tip on your social media', '4:00 PM', 20, 'Consistent content builds trust and keeps you top-of-mind with your sphere', 2, 2, 10)
ON CONFLICT (user_id, cohort_id, task_date, pillar, sequence_order) DO NOTHING;

-- ============================================
-- STEP 8: Create AI user preferences
-- ============================================
INSERT INTO public.ai_user_preferences (user_id, cohort_id, wake_time, sleep_time, work_start, work_end, fitness_level, preferred_workout_time, workout_duration_preference, daily_call_target, daily_text_target, prospecting_hours, networking_comfort, content_creation_frequency, coaching_intensity, include_motivational_messages)
VALUES
  (test_user_id, 1, '06:00', '22:00', '09:00', '18:00', 'intermediate', 'morning', 45, 20, 50, 3, 'moderate', 'daily', 'balanced', true)
ON CONFLICT (user_id, cohort_id) DO NOTHING;

-- ============================================
-- STEP 9: Unlock some achievements
-- ============================================
INSERT INTO public.user_achievements (user_id, cohort_id, achievement_id)
SELECT test_user_id, 1, a.id
FROM public.achievements a
WHERE a.slug IN ('first_log', 'streak_3', 'streak_7', 'rank_d', 'first_checkin')
ON CONFLICT (user_id, cohort_id, achievement_id) DO NOTHING;

-- ============================================
-- STEP 10: Create location check-in
-- ============================================
INSERT INTO public.location_check_ins (user_id, cohort_id, location_id)
SELECT test_user_id, 1, l.id
FROM public.locations l
WHERE l.name = 'Discovery Green'
LIMIT 1
ON CONFLICT (user_id, cohort_id, location_id) DO NOTHING;

-- ============================================
-- STEP 11: Create active invite code
-- ============================================
INSERT INTO public.cohort_invites (cohort_id, code, role, max_uses, uses, expires_at, active, created_by)
VALUES
  (1, 'ELITE-TEST-2026', 'agent', 100, 0, CURRENT_DATE + INTERVAL '1 year', true, NULL)
ON CONFLICT (code) DO UPDATE SET
  active = true,
  expires_at = CURRENT_DATE + INTERVAL '1 year';

-- Also create an admin invite code
INSERT INTO public.cohort_invites (cohort_id, code, role, max_uses, uses, expires_at, active, created_by)
VALUES
  (1, 'ELITE-ADMIN-2026', 'admin', 5, 0, CURRENT_DATE + INTERVAL '1 year', true, NULL)
ON CONFLICT (code) DO UPDATE SET
  active = true,
  expires_at = CURRENT_DATE + INTERVAL '1 year';

END $$;

