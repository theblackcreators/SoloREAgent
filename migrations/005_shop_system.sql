-- Shop System Migration
-- Allow users to spend gold on unlocks and rewards

-- Shop items table
CREATE TABLE IF NOT EXISTS public.shop_items (
  id SERIAL PRIMARY KEY,
  program_id INTEGER NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  
  -- Item details
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎁',
  category TEXT NOT NULL CHECK (category IN ('cosmetic', 'boost', 'unlock', 'consumable', 'special')),
  
  -- Pricing
  gold_cost INTEGER NOT NULL DEFAULT 0,
  premium_cost INTEGER DEFAULT 0,  -- For real money purchases (future)
  
  -- Effects (JSON for flexibility)
  effects JSONB DEFAULT '{}',
  -- Examples:
  -- {"type": "xp_boost", "multiplier": 1.5, "duration_hours": 24}
  -- {"type": "avatar_border", "border_id": "gold_frame"}
  -- {"type": "title_unlock", "title": "Elite Agent"}
  -- {"type": "skip_task", "uses": 3}
  
  -- Availability
  min_rank TEXT DEFAULT 'E' CHECK (min_rank IN ('E', 'D', 'C', 'B', 'A', 'S')),
  max_purchases INTEGER,  -- NULL = unlimited
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  featured BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User purchases table
CREATE TABLE IF NOT EXISTS public.user_purchases (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES public.shop_items(id) ON DELETE CASCADE,
  
  -- Purchase details
  gold_spent INTEGER NOT NULL DEFAULT 0,
  premium_spent INTEGER DEFAULT 0,
  quantity INTEGER DEFAULT 1,
  
  -- Usage tracking (for consumables)
  uses_remaining INTEGER,  -- NULL for permanent items
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'refunded')),
  expires_at TIMESTAMPTZ,
  
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- User active effects (for boosts)
CREATE TABLE IF NOT EXISTS public.user_active_effects (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cohort_id INTEGER NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  purchase_id INTEGER REFERENCES public.user_purchases(id) ON DELETE SET NULL,
  
  effect_type TEXT NOT NULL,
  effect_data JSONB NOT NULL DEFAULT '{}',
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(user_id, cohort_id, effect_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shop_items_program ON public.shop_items(program_id);
CREATE INDEX IF NOT EXISTS idx_shop_items_category ON public.shop_items(category);
CREATE INDEX IF NOT EXISTS idx_shop_items_active ON public.shop_items(active);
CREATE INDEX IF NOT EXISTS idx_user_purchases_user ON public.user_purchases(user_id, cohort_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_item ON public.user_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_user_active_effects_user ON public.user_active_effects(user_id, cohort_id);
CREATE INDEX IF NOT EXISTS idx_user_active_effects_expires ON public.user_active_effects(expires_at);

-- RLS Policies
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_active_effects ENABLE ROW LEVEL SECURITY;

-- Shop items: Anyone can view active items
CREATE POLICY "Anyone can view active shop items"
  ON public.shop_items FOR SELECT
  USING (active = true);

-- User purchases: Users can view their own purchases
CREATE POLICY "Users can view their own purchases"
  ON public.user_purchases FOR SELECT
  USING (user_id = auth.uid());

-- User purchases: Users can insert their own purchases (via API)
CREATE POLICY "Users can make purchases"
  ON public.user_purchases FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User active effects: Users can view their own effects
CREATE POLICY "Users can view their own effects"
  ON public.user_active_effects FOR SELECT
  USING (user_id = auth.uid());

-- Insert sample shop items
INSERT INTO public.shop_items (program_id, name, description, icon, category, gold_cost, effects, min_rank, sort_order)
SELECT 
  p.id,
  i.name,
  i.description,
  i.icon,
  i.category,
  i.gold_cost,
  i.effects::jsonb,
  i.min_rank,
  i.sort_order
FROM public.programs p
CROSS JOIN (VALUES
  ('XP Boost (24h)', 'Earn 1.5x XP for the next 24 hours', '⚡', 'boost', 100, '{"type": "xp_boost", "multiplier": 1.5, "duration_hours": 24}', 'E', 1),
  ('Streak Shield', 'Protect your streak from one missed day', '🛡️', 'consumable', 150, '{"type": "streak_shield", "uses": 1}', 'E', 2),
  ('Skip Task Token', 'Skip one AI daily task without penalty', '⏭️', 'consumable', 50, '{"type": "skip_task", "uses": 1}', 'E', 3),
  ('Gold Border', 'Unlock gold avatar border', '🖼️', 'cosmetic', 500, '{"type": "avatar_border", "border_id": "gold"}', 'D', 4),
  ('Rising Star Title', 'Unlock "Rising Star" display title', '⭐', 'cosmetic', 300, '{"type": "title_unlock", "title": "Rising Star"}', 'D', 5),
  ('Elite Agent Title', 'Unlock "Elite Agent" display title', '👑', 'cosmetic', 1000, '{"type": "title_unlock", "title": "Elite Agent"}', 'B', 6),
  ('Premium Scripts Pack', 'Unlock 5 premium cold calling scripts', '📜', 'unlock', 750, '{"type": "content_unlock", "pack_id": "premium_scripts"}', 'C', 7),
  ('Double Gold Weekend', 'Earn 2x gold for the entire weekend', '💰', 'boost', 200, '{"type": "gold_boost", "multiplier": 2, "duration_hours": 48}', 'E', 8)
) AS i(name, description, icon, category, gold_cost, effects, min_rank, sort_order)
ON CONFLICT DO NOTHING;

