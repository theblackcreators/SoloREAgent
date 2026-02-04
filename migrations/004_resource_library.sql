-- Resource Library Migration
-- Training materials and guides for agents

-- Resources table
CREATE TABLE IF NOT EXISTS public.resources (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  
  -- Resource details
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('scripts', 'training', 'templates', 'guides', 'videos', 'tools')),
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'markdown', 'link', 'video', 'pdf', 'file')),
  
  -- Content (either inline or URL)
  content TEXT,           -- For text/markdown content
  url TEXT,               -- For links, videos, PDFs
  thumbnail_url TEXT,     -- Preview image
  
  -- Metadata
  duration_minutes INTEGER,  -- For videos/courses
  difficulty TEXT DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  tags TEXT[] DEFAULT '{}',
  
  -- Access control
  min_rank TEXT DEFAULT 'E' CHECK (min_rank IN ('E', 'D', 'C', 'B', 'A', 'S')),
  premium_only BOOLEAN DEFAULT FALSE,
  
  -- Ordering and status
  sort_order INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User resource progress tracking
CREATE TABLE IF NOT EXISTS public.user_resource_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id INTEGER NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  
  -- Progress tracking
  viewed BOOLEAN DEFAULT FALSE,
  viewed_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  progress_percent INTEGER DEFAULT 0,
  
  -- User feedback
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  bookmarked BOOLEAN DEFAULT FALSE,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, resource_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_resources_program ON public.resources(program_id);
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_active ON public.resources(active);
CREATE INDEX IF NOT EXISTS idx_resources_featured ON public.resources(featured);
CREATE INDEX IF NOT EXISTS idx_user_resource_progress_user ON public.user_resource_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_resource_progress_resource ON public.user_resource_progress(resource_id);

-- RLS Policies
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_resource_progress ENABLE ROW LEVEL SECURITY;

-- Resources: Anyone can read active resources
CREATE POLICY "Anyone can view active resources"
  ON public.resources FOR SELECT
  USING (active = true);

-- Resources: Admins can manage
CREATE POLICY "Admins can manage resources"
  ON public.resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.cohort_memberships cm
      JOIN public.cohorts c ON c.id = cm.cohort_id
      WHERE cm.user_id = auth.uid()
      AND c.program_id = resources.program_id
      AND cm.role IN ('admin', 'coach')
    )
  );

-- User progress: Users can manage their own progress
CREATE POLICY "Users can manage their own progress"
  ON public.user_resource_progress FOR ALL
  USING (user_id = auth.uid());

-- Insert sample resources
INSERT INTO public.resources (program_id, title, description, category, content_type, content, difficulty, tags, featured, sort_order)
SELECT 
  p.id,
  r.title,
  r.description,
  r.category,
  r.content_type,
  r.content,
  r.difficulty,
  r.tags,
  r.featured,
  r.sort_order
FROM public.programs p
CROSS JOIN (VALUES
  ('Cold Calling Script - FSBO', 'Proven script for reaching For Sale By Owner leads', 'scripts', 'markdown', 
   E'# FSBO Cold Call Script\n\n## Opening\n"Hi, this is [Name] with [Company]. I noticed your home on [Street] is for sale by owner. I''m not calling to list your home - I actually have some buyers who might be interested. Do you have a moment?"\n\n## Build Rapport\n- Ask about their timeline\n- Understand their motivation\n- Show genuine interest\n\n## Transition\n"Many FSBOs I work with find that having a professional handle showings saves them time. Would you be open to a quick 15-minute meeting to see if I can help?"',
   'beginner', ARRAY['cold-calling', 'fsbo', 'prospecting'], true, 1),
  
  ('Expired Listing Script', 'Effective approach for expired listing leads', 'scripts', 'markdown',
   E'# Expired Listing Script\n\n## Opening\n"Hi [Name], this is [Your Name] with [Company]. I noticed your home at [Address] came off the market. I''m sure you''re getting a lot of calls, so I''ll be brief..."\n\n## Key Questions\n1. "Are you still interested in selling?"\n2. "What do you think went wrong?"\n3. "What would need to be different this time?"',
   'intermediate', ARRAY['expired', 'prospecting', 'scripts'], true, 2),
  
  ('Daily Prospecting Routine', 'Step-by-step guide to effective daily prospecting', 'guides', 'markdown',
   E'# The Perfect Prospecting Day\n\n## Morning Block (8-10 AM)\n- Review your hot list\n- Make 20 calls minimum\n- Focus on highest-priority leads\n\n## Midday (10 AM - 12 PM)\n- Follow up on morning conversations\n- Send personalized texts\n- Update CRM notes\n\n## Afternoon (2-4 PM)\n- Circle prospecting\n- Door knocking (if applicable)\n- Social media engagement',
   'beginner', ARRAY['prospecting', 'routine', 'daily'], true, 3),
  
  ('Listing Presentation Template', 'Professional listing presentation framework', 'templates', 'markdown',
   E'# Listing Presentation Outline\n\n## 1. Introduction (5 min)\n- Thank them for their time\n- Set agenda and expectations\n\n## 2. About You (10 min)\n- Your story and why real estate\n- Recent successes and testimonials\n\n## 3. Market Analysis (15 min)\n- Comparable sales\n- Current market conditions\n- Pricing strategy\n\n## 4. Marketing Plan (15 min)\n- Professional photography\n- Online presence\n- Open house strategy\n\n## 5. Close (5 min)\n- Address concerns\n- Ask for the listing',
   'intermediate', ARRAY['listing', 'presentation', 'templates'], false, 4),
  
  ('Objection Handling Guide', 'Common objections and how to overcome them', 'training', 'markdown',
   E'# Objection Handling Mastery\n\n## "I want to think about it"\n**Response:** "I completely understand. What specifically would you like to think about? Is it the price, the timing, or something else?"\n\n## "Your commission is too high"\n**Response:** "I appreciate you bringing that up. Let me show you exactly what you get for that investment..."\n\n## "I have a friend in real estate"\n**Response:** "That''s great! Loyalty is important. Out of curiosity, have they sold homes in this specific neighborhood recently?"',
   'advanced', ARRAY['objections', 'training', 'sales'], false, 5)
) AS r(title, description, category, content_type, content, difficulty, tags, featured, sort_order)
ON CONFLICT DO NOTHING;

