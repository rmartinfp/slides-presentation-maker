-- Cinematic templates — pre-built video presentation templates
CREATE TABLE IF NOT EXISTS public.cinematic_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,

  -- Visual preset (embedded, not a reference)
  preset_id TEXT NOT NULL,          -- matches a CinematicPreset id

  -- Slide structure with video assignments
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each slide: { type, titlePlaceholder, subtitlePlaceholder?, bodyPlaceholder?,
  --              stats?, videoUrl, videoOpacity, videoFilter? }

  -- Preview
  thumbnail_url TEXT,               -- pre-generated screenshot
  preview_video_url TEXT,           -- short preview clip (optional)

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for listing
CREATE INDEX idx_cinematic_templates_active ON public.cinematic_templates (is_active, sort_order);

-- RLS: anyone can read active templates
ALTER TABLE public.cinematic_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active cinematic templates"
  ON public.cinematic_templates FOR SELECT
  USING (is_active = true);
