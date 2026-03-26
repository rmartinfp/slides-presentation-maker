import { PoolVideo, VideoCategory } from '@/types/cinematic';

// ============ Video Pool ============
// Empty — videos come from templates or user uploads, not stock pools.
// Pool functions still work but return empty arrays as fallback.

export const VIDEO_POOL: PoolVideo[] = [];

/**
 * Get all videos for a category.
 */
export function getVideosByCategory(category: VideoCategory): PoolVideo[] {
  return VIDEO_POOL.filter(v => v.category === category);
}

/**
 * Get a random video from a category.
 */
export function getRandomVideo(category: VideoCategory): PoolVideo | undefined {
  const videos = getVideosByCategory(category);
  if (videos.length === 0) return undefined;
  return videos[Math.floor(Math.random() * videos.length)];
}

/**
 * Get N unique random videos from a category (for assigning one per slide).
 * If more videos needed than available, wraps around.
 */
export function getVideosForSlides(category: VideoCategory, count: number): PoolVideo[] {
  const pool = getVideosByCategory(category);
  if (pool.length === 0) return [];

  const result: PoolVideo[] = [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);

  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }

  return result;
}
