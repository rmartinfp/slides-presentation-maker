-- Add theme column to cinematic_templates for storing PresentationTheme
ALTER TABLE public.cinematic_templates
  ADD COLUMN IF NOT EXISTS theme JSONB;

-- Clear old seed data (placeholder-only templates without real layouts)
DELETE FROM public.cinematic_templates;
