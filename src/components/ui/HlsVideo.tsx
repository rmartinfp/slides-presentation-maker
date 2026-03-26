import React, { useRef, useEffect } from 'react';
import Hls from 'hls.js';

interface Props {
  src: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Lightweight video element that handles both MP4 and HLS (.m3u8).
 * Uses hls.js for Chrome/Firefox, native HLS for Safari.
 */
export default function HlsVideo({ src, className, style }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    // Cleanup previous
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const isHls = src.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: false });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) hls.destroy(); });
    } else {
      video.src = src;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [src]);

  return (
    <video
      ref={ref}
      autoPlay muted loop playsInline
      className={className}
      style={style}
    />
  );
}
