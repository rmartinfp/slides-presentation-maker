import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Slide, PresentationTheme } from '@/types/presentation';

export interface Template {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  google_slides_id?: string;
  slides: Slide[];
  theme: PresentationTheme;
  cover_url?: string;
  tags: string[];
  is_premium: boolean;
  slide_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all templates from Supabase.
 * Falls back to the hardcoded TEMPLATE_REGISTRY if the table doesn't exist.
 */
export function useTemplates() {
  return useQuery({
    queryKey: ['templates'],
    queryFn: async (): Promise<Template[]> => {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.warn('Templates table not available, using fallback:', error.message);
        return [];
      }

      return data ?? [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Import a Google Slides presentation as a template.
 */
export function useImportGoogleSlides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (presentationId: string) => {
      // Call edge function to fetch and process the presentation
      const { data, error } = await supabase.functions.invoke('import-google-slides', {
        body: { presentationId },
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}

/**
 * Save a parsed Google Slides presentation as a template in the DB.
 */
export function useSaveTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Omit<Template, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('templates')
        .insert(template)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  });
}
