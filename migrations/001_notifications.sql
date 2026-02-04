-- ============================================
-- Notifications Table Migration
-- ============================================

-- Notifications table for in-app and email notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('streak_warning', 'streak_broken', 'quest_reminder', 'rank_up', 'achievement_unlocked', 'weekly_recap')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_cohort ON public.notifications(user_id, cohort_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert notifications (for cron jobs and triggers)
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (TRUE);

-- Service role can delete old notifications
CREATE POLICY "Service role can delete notifications" ON public.notifications
  FOR DELETE USING (TRUE);

