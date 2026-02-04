-- Audit Logging Migration
-- Track admin actions for accountability

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id SERIAL PRIMARY KEY,
  
  -- Who performed the action
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  
  -- Context
  program_id INTEGER REFERENCES public.programs(id) ON DELETE SET NULL,
  cohort_id INTEGER REFERENCES public.cohorts(id) ON DELETE SET NULL,
  
  -- Action details
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'login', 'invite', etc.
  entity_type TEXT NOT NULL,  -- 'quest_template', 'location', 'invite', 'resource', 'shop_item', etc.
  entity_id TEXT,  -- ID of the affected entity
  entity_name TEXT,  -- Human-readable name for display
  
  -- Change details
  old_values JSONB,  -- Previous state (for updates/deletes)
  new_values JSONB,  -- New state (for creates/updates)
  
  -- Request metadata
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_program ON public.audit_logs(program_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_cohort ON public.audit_logs(cohort_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- RLS Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs for their programs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cohort_memberships cm
      JOIN public.cohorts c ON c.id = cm.cohort_id
      WHERE cm.user_id = auth.uid()
      AND (c.program_id = audit_logs.program_id OR audit_logs.program_id IS NULL)
      AND cm.role IN ('admin', 'coach')
    )
  );

-- Service role can insert (via API)
CREATE POLICY "Service can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Create a function to auto-capture user email
CREATE OR REPLACE FUNCTION public.set_audit_user_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_email IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT email INTO NEW.user_email
    FROM auth.users
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-set email
DROP TRIGGER IF EXISTS audit_set_email ON public.audit_logs;
CREATE TRIGGER audit_set_email
  BEFORE INSERT ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_audit_user_email();

