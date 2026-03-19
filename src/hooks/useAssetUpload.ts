import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { generateId } from '@/lib/slide-utils';

const BUCKET = 'presentation-assets';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  url: string;
  path: string;
  name: string;
}

export function useAssetUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    if (file.size > MAX_SIZE) {
      setError('File too large. Max 10MB.');
      return null;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const validExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4', 'webm'];
    if (!validExts.includes(ext)) {
      setError('Unsupported file type.');
      return null;
    }

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const path = `uploads/${generateId()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // If bucket doesn't exist yet, provide helpful error
        if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
          setError('Storage bucket not configured. Create "presentation-assets" bucket in Supabase.');
        } else {
          setError(uploadError.message);
        }
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(path);

      setProgress(100);
      return { url: publicUrl, path, name: file.name };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const uploadMultiple = useCallback(async (files: File[]): Promise<UploadResult[]> => {
    const results: UploadResult[] = [];
    for (const file of files) {
      const result = await upload(file);
      if (result) results.push(result);
    }
    return results;
  }, [upload]);

  return { upload, uploadMultiple, uploading, progress, error };
}
