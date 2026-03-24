import React, { useRef, useEffect } from 'react';
import type { SlideVideoBackground } from '@/types/presentation';

interface Props {
  video: SlideVideoBackground;
  scale: number;
}

/**
 * Lightweight video background for the editor canvas.
 * Shows the video muted at low resolution as a preview.
 * For HLS streams, falls back to a poster/thumbnail approach.
 */
export default function EditorVideoBackground({ video, scale }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // For MP4, just set src directly
    if (video.type === 'mp4') {
      el.src = video.url;
      el.play().catch(() => {});
      return;
    }

    // For HLS, try native support first (Safari), otherwise skip in editor
    if (video.type === 'hls') {
      if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = video.url;
        el.play().catch(() => {});
      }
      // Non-Safari: HLS won't play in editor preview (too heavy)
      // Show a dark overlay instead — video plays in presentation mode
    }
  }, [video.url, video.type]);

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: 'inherit' }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          opacity: video.opacity ?? 0.3,
          filter: video.filter || undefined,
          transform: video.transform || undefined,
        }}
      />
      {/* Dark overlay so elements are visible while editing */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.15)' }} />
    </div>
  );
}
