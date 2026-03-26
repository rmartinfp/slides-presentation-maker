-- Allow anonymous users to insert and update cinematic_templates
-- Required for Template Studio publish/update functionality

CREATE POLICY "Anyone can insert cinematic templates"
  ON public.cinematic_templates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update cinematic templates"
  ON public.cinematic_templates FOR UPDATE
  USING (true)
  WITH CHECK (true);
