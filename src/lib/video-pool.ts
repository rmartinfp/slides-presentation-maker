import { PoolVideo, VideoCategory } from '@/types/cinematic';

// ============ Free Stock Video Pool ============
// All URLs are from Pexels (freely embeddable under Pexels license)

export const VIDEO_POOL: PoolVideo[] = [
  // ---- abstract-dark ----
  { id: 'ad-1', url: 'https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4', category: 'abstract-dark', orientation: 'landscape', duration: 20 },
  { id: 'ad-2', url: 'https://videos.pexels.com/video-files/6981411/6981411-uhd_2560_1440_25fps.mp4', category: 'abstract-dark', orientation: 'landscape', duration: 15 },
  { id: 'ad-3', url: 'https://videos.pexels.com/video-files/5377684/5377684-uhd_2560_1440_25fps.mp4', category: 'abstract-dark', orientation: 'landscape', duration: 22 },
  { id: 'ad-4', url: 'https://videos.pexels.com/video-files/4625518/4625518-uhd_2560_1440_30fps.mp4', category: 'abstract-dark', orientation: 'landscape', duration: 18 },

  // ---- tech ----
  { id: 'te-1', url: 'https://videos.pexels.com/video-files/5532765/5532765-uhd_2560_1440_25fps.mp4', category: 'tech', orientation: 'landscape', duration: 16 },
  { id: 'te-2', url: 'https://videos.pexels.com/video-files/6963744/6963744-uhd_2560_1440_25fps.mp4', category: 'tech', orientation: 'landscape', duration: 20 },
  { id: 'te-3', url: 'https://videos.pexels.com/video-files/5532771/5532771-uhd_2560_1440_25fps.mp4', category: 'tech', orientation: 'landscape', duration: 14 },

  // ---- corporate ----
  { id: 'co-1', url: 'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4', category: 'corporate', orientation: 'landscape', duration: 20 },
  { id: 'co-2', url: 'https://videos.pexels.com/video-files/3191572/3191572-uhd_2560_1440_25fps.mp4', category: 'corporate', orientation: 'landscape', duration: 25 },
  { id: 'co-3', url: 'https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4', category: 'corporate', orientation: 'landscape', duration: 18 },

  // ---- gradient ----
  { id: 'gr-1', url: 'https://videos.pexels.com/video-files/857195/857195-hd_1920_1080_25fps.mp4', category: 'gradient', orientation: 'landscape', duration: 12 },
  { id: 'gr-2', url: 'https://videos.pexels.com/video-files/5737731/5737731-uhd_2560_1440_25fps.mp4', category: 'gradient', orientation: 'landscape', duration: 18 },
  { id: 'gr-3', url: 'https://videos.pexels.com/video-files/4812203/4812203-uhd_2560_1440_25fps.mp4', category: 'gradient', orientation: 'landscape', duration: 20 },
  { id: 'gr-4', url: 'https://videos.pexels.com/video-files/6984162/6984162-uhd_2560_1440_25fps.mp4', category: 'gradient', orientation: 'landscape', duration: 15 },

  // ---- nature ----
  { id: 'na-1', url: 'https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4', category: 'nature', orientation: 'landscape', duration: 20 },
  { id: 'na-2', url: 'https://videos.pexels.com/video-files/2491284/2491284-uhd_2560_1440_24fps.mp4', category: 'nature', orientation: 'landscape', duration: 22 },
  { id: 'na-3', url: 'https://videos.pexels.com/video-files/1918465/1918465-uhd_2560_1440_24fps.mp4', category: 'nature', orientation: 'landscape', duration: 30 },

  // ---- space ----
  { id: 'sp-1', url: 'https://videos.pexels.com/video-files/1851190/1851190-uhd_2560_1440_24fps.mp4', category: 'space', orientation: 'landscape', duration: 20 },
  { id: 'sp-2', url: 'https://videos.pexels.com/video-files/3194277/3194277-uhd_2560_1440_30fps.mp4', category: 'space', orientation: 'landscape', duration: 25 },
  { id: 'sp-3', url: 'https://videos.pexels.com/video-files/4588052/4588052-uhd_2560_1440_25fps.mp4', category: 'space', orientation: 'landscape', duration: 18 },

  // ---- minimal ----
  { id: 'mi-1', url: 'https://videos.pexels.com/video-files/5377700/5377700-uhd_2560_1440_25fps.mp4', category: 'minimal', orientation: 'landscape', duration: 20 },
  { id: 'mi-2', url: 'https://videos.pexels.com/video-files/4812197/4812197-uhd_2560_1440_25fps.mp4', category: 'minimal', orientation: 'landscape', duration: 15 },
  { id: 'mi-3', url: 'https://videos.pexels.com/video-files/4625502/4625502-uhd_2560_1440_30fps.mp4', category: 'minimal', orientation: 'landscape', duration: 22 },
];

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
