import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { VideoBackground as VideoBackgroundConfig } from '@/types/cinematic';

interface Props {
  config: VideoBackgroundConfig;
  className?: string;
}

/**
 * Renders a fullscreen video background with HLS/MP4 support.
 * Handles hls.js lifecycle, Safari native HLS fallback, and error states.
 */
export default function VideoBackground({ config, className = '' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setHasError(false);

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (config.type === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            setHasError(true);
            hls.destroy();
          }
        });

        hls.loadSource(config.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = config.url;
        video.addEventListener('loadedmetadata', () => {
          video.play().catch(() => {});
        });
      } else {
        setHasError(true);
      }
    } else {
      // MP4 direct
      video.src = config.url;
      video.play().catch(() => {});
    }

    // Set playback rate
    if (config.playbackRate) {
      video.playbackRate = config.playbackRate;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [config.url, config.type, config.playbackRate]);

  if (hasError) {
    // Fallback to black — no visible error
    return <div className={`absolute inset-0 bg-black ${className}`} />;
  }

  return (
    <video
      ref={videoRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      autoPlay
      muted
      loop
      playsInline
      onError={() => setHasError(true)}
      style={{
        objectFit: config.objectFit || 'cover',
        opacity: config.opacity ?? 1,
        filter: config.filter || 'none',
        transform: config.transform || 'none',
      }}
    />
  );
}
