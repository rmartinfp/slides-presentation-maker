import React from 'react';
import { SlideOverlays } from '@/types/cinematic';

/**
 * Cinematic overlay effects — vignette, film grain, scrim gradients.
 * Renders as absolutely positioned layers on top of the video background.
 */
export default function CinematicOverlays({ config }: { config: SlideOverlays }) {
  return (
    <>
      {/* Scrim gradient for text readability */}
      {config.scrim !== 'none' && <ScrimOverlay type={config.scrim} opacity={config.scrimOpacity ?? 0.5} />}

      {/* Radial vignette */}
      {config.vignette && <VignetteOverlay intensity={config.vignetteIntensity ?? 0.4} />}

      {/* Film grain texture */}
      {config.filmGrain && <FilmGrainOverlay opacity={config.filmGrainOpacity ?? 0.04} />}

      {/* Color grade filter (applied as a tinted overlay) */}
      {config.colorGrade && (
        <div className="absolute inset-0 pointer-events-none z-[1]" style={{ filter: config.colorGrade, mixBlendMode: 'overlay' }} />
      )}
    </>
  );
}

function ScrimOverlay({ type, opacity }: { type: SlideOverlays['scrim']; opacity: number }) {
  const gradients: Record<string, string> = {
    bottom: `linear-gradient(to top, rgba(0,0,0,${opacity * 1.2}) 0%, rgba(0,0,0,${opacity * 0.5}) 35%, rgba(0,0,0,0.05) 65%, transparent 100%)`,
    top: `linear-gradient(to bottom, rgba(0,0,0,${opacity * 0.9}) 0%, rgba(0,0,0,${opacity * 0.3}) 40%, transparent 100%)`,
    left: `linear-gradient(to right, rgba(0,0,0,${opacity * 1.1}) 0%, rgba(0,0,0,${opacity * 0.4}) 45%, transparent 100%)`,
    right: `linear-gradient(to left, rgba(0,0,0,${opacity * 1.1}) 0%, rgba(0,0,0,${opacity * 0.4}) 45%, transparent 100%)`,
    radial: `radial-gradient(ellipse at center, transparent 25%, rgba(0,0,0,${opacity}) 100%)`,
    dual: `linear-gradient(to bottom, rgba(0,0,0,${opacity * 0.7}) 0%, transparent 20%, transparent 70%, rgba(0,0,0,${opacity * 1.0}) 100%)`,
  };

  const bg = gradients[type || 'bottom'] || gradients.bottom;

  return <div className="absolute inset-0 pointer-events-none z-[2]" style={{ background: bg }} />;
}

function VignetteOverlay({ intensity }: { intensity: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[3]"
      style={{
        background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
      }}
    />
  );
}

function FilmGrainOverlay({ opacity }: { opacity: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-[4]"
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        mixBlendMode: 'overlay',
      }}
    />
  );
}

/**
 * Glassmorphism card container for cinematic elements.
 */
export function GlassCard({
  children,
  className = '',
  intensity = 'medium',
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: 'light' | 'medium' | 'heavy';
}) {
  const styles: Record<string, React.CSSProperties> = {
    light: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(12px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(24px) saturate(1.3)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
    },
    heavy: {
      background: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(40px) saturate(1.5)',
      WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
    },
  };

  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        ...styles[intensity],
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
      }}
    >
      {children}
    </div>
  );
}
