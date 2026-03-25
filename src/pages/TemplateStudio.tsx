/**
 * Template Studio — redirects to /editor?mode=template
 * The actual template editing happens in the regular editor
 * with additional template-specific panels.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function TemplateStudio() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/editor?mode=template', { replace: true });
  }, [navigate]);
  return null;
}
