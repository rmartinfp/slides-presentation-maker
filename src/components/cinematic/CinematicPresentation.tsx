import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Slide } from '@/types/presentation';
import { CinematicPreset, CinematicSlideType, AnimationRule } from '@/types/cinematic';
import { SlideUpLine, WordByWordReveal, BlurReveal, FadeIn, ScaleUp, Counter } from './AnimatedText';
import VideoBackground from './VideoBackground';
import { loadGoogleFont } from '@/lib/font-loader';
import { getVideosForSlides } from '@/lib/video-pool';

// ============ Types ============

interface Props {
  slides: Slide[];
  preset: CinematicPreset;
  startIndex?: number;
  metadata?: { type?: string; author?: string; date?: string; industry?: string };
  onExit: () => void;
}

interface ClassifiedElements {
  title: { content: string; raw: string } | null;
  subtitle: { content: string; raw: string } | null;
  body: { content: string; raw: string }[];
  stats: { value: number; suffix: string; prefix: string; label: string }[];
  images: string[];
}

// ============ Helpers ============

/** Strip HTML tags to plain text */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

/** Try to extract numeric stat from text like "95%" or "$2.4M" or "500+" */
function parseStatText(text: string): { value: number; prefix: string; suffix: string; label: string } | null {
  const clean = stripHtml(text);
  const match = clean.match(/^([^\d]*)(\d[\d,.]*)([\w%+$]*)\s*(.*)/);
  if (!match) return null;
  const numStr = match[2].replace(/,/g, '');
  const value = parseFloat(numStr);
  if (isNaN(value)) return null;
  return { prefix: match[1].trim(), value, suffix: match[3].trim(), label: match[4].trim() };
}

/** Determine slide type heuristically */
function classifySlideType(
  slideIndex: number,
  totalSlides: number,
  classified: ClassifiedElements,
): CinematicSlideType {
  if (slideIndex === 0) return 'hero';
  if (slideIndex === totalSlides - 1) return 'closing';
  if (classified.stats.length >= 2) return 'stats';
  if (!classified.subtitle && classified.body.length === 0) return 'section';
  return 'content';
}

/** Classify slide elements by role */
function classifyElements(slide: Slide): ClassifiedElements {
  const textElements = [...(slide.elements || [])]
    .filter(e => e.type === 'text')
    .sort((a, b) => (b.style.fontSize || 0) - (a.style.fontSize || 0));

  const title = textElements[0]
    ? { content: stripHtml(textElements[0].content), raw: textElements[0].content }
    : null;
  const subtitle = textElements[1]
    ? { content: stripHtml(textElements[1].content), raw: textElements[1].content }
    : null;

  const bodyElements = textElements.slice(2).map(e => ({
    content: stripHtml(e.content),
    raw: e.content,
  }));

  // Try to find stat-like elements (numbers with labels)
  const stats: ClassifiedElements['stats'] = [];
  for (const el of textElements) {
    const parsed = parseStatText(el.content);
    if (parsed && parsed.value > 0) {
      stats.push(parsed);
    }
  }

  const images = (slide.elements || [])
    .filter(e => e.type === 'image' && e.content)
    .map(e => e.content);

  return { title, subtitle, body: bodyElements, stats, images };
}

/** Get animation rule for a target from preset */
function getRule(preset: CinematicPreset, slideType: CinematicSlideType, target: AnimationRule['target']): AnimationRule | undefined {
  const rules = preset.animations[slideType] || preset.animations.content;
  return rules.find(r => r.target === target);
}

// ============ Sub-components ============

function MetaItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <span style={{ color, fontSize: 13, letterSpacing: '0.04em' }}>{label}</span>
      <span className="text-white" style={{ fontSize: 13 }}>{value}</span>
    </div>
  );
}

function StatCard({
  stat,
  index,
  accentColor,
  secondaryColor,
  fontHeading,
  delay,
  easing,
}: {
  stat: { value: number; prefix: string; suffix: string; label: string };
  index: number;
  accentColor: string;
  secondaryColor: string;
  fontHeading: string;
  delay: number;
  easing: number[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay + index * 0.12, ease: easing }}
      className="flex flex-col items-center px-8 py-6"
    >
      <Counter
        value={stat.value}
        prefix={stat.prefix}
        suffix={stat.suffix}
        delay={delay + index * 0.12 + 0.2}
        className="leading-none tracking-tight"
        style={{
          color: accentColor,
          fontFamily: `'${fontHeading}', sans-serif`,
          fontSize: 'clamp(36px, 6vw, 80px)',
          fontWeight: 700,
        } as React.CSSProperties}
      />
      {stat.label && (
        <span
          className="mt-2 text-center"
          style={{ color: secondaryColor, fontSize: 'clamp(11px, 1vw, 16px)' }}
        >
          {stat.label}
        </span>
      )}
    </motion.div>
  );
}

// ============ Navigation Components ============

function NavigationDots({
  count,
  current,
  onNavigate,
}: {
  count: number;
  current: number;
  onNavigate: (i: number) => void;
}) {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex gap-2">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onNavigate(i)}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'bg-white w-6 h-2'
              : 'bg-white/40 w-2 h-2 hover:bg-white/60'
          }`}
        />
      ))}
    </div>
  );
}

function ProgressBar({
  count,
  current,
}: {
  count: number;
  current: number;
}) {
  const progress = count > 1 ? ((current) / (count - 1)) * 100 : 100;
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 h-[3px] bg-white/10">
      <motion.div
        className="h-full bg-white/60"
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
  );
}

function NumberNav({
  count,
  current,
  secondaryColor,
}: {
  count: number;
  current: number;
  secondaryColor: string;
}) {
  return (
    <div className="absolute bottom-5 right-[5%] z-20" style={{ color: secondaryColor, fontSize: 14 }}>
      {String(current + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
    </div>
  );
}

// ============ Main Component ============

export default function CinematicPresentation({
  slides, preset, startIndex = 0, metadata, onExit,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [activationCounts, setActivationCounts] = useState<number[]>(() =>
    slides.map((_, i) => (i === startIndex ? 1 : 0))
  );

  // Assign videos: use stored videoBackground per slide if available, otherwise from pool
  const poolVideos = useMemo(
    () => getVideosForSlides(preset.videoCategory, slides.length),
    [preset.videoCategory, slides.length]
  );
  const slideVideos = useMemo(
    () => poolVideos.map((poolVideo, i) => {
      const stored = slides[i]?.videoBackground;
      if (stored) return { url: stored.url, type: stored.type, opacity: stored.opacity, filter: stored.filter, transform: stored.transform };
      return poolVideo ? { url: poolVideo.url, type: poolVideo.url.includes('.m3u8') ? 'hls' as const : 'mp4' as const, opacity: preset.videoOpacity, filter: preset.videoFilter } : null;
    }),
    [poolVideos, slides, preset.videoOpacity, preset.videoFilter]
  );

  // Load preset fonts
  useEffect(() => {
    loadGoogleFont(preset.fontHeading);
    loadGoogleFont(preset.fontBody);
  }, [preset]);

  // Fullscreen
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { document.exitFullscreen?.().catch(() => {}); };
  }, []);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= slides.length || index === currentIndex) return;
    setCurrentIndex(index);
    setActivationCounts(prev => {
      const next = [...prev];
      next[index] = (next[index] || 0) + 1;
      return next;
    });
  }, [currentIndex, slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onExit(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        goTo(currentIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        goTo(currentIndex - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, goTo, onExit]);

  // Pre-classify all slides
  const slideData = useMemo(() => {
    return slides.map((s, i) => {
      const classified = classifyElements(s);
      const slideType = classifySlideType(i, slides.length, classified);
      return { slide: s, classified, slideType };
    });
  }, [slides]);

  // ---- Render a single slide ----
  const renderSlide = (slideIndex: number) => {
    const { slide, classified, slideType } = slideData[slideIndex];
    const isActive = slideIndex === currentIndex;
    const activationKey = activationCounts[slideIndex] || 0;
    const video = slideVideos[slideIndex];

    const titleText = classified.title?.content || '';
    const subtitleText = classified.subtitle?.content || '';
    const bodyText = classified.body.map(b => b.content).join(' ');

    const titleRule = getRule(preset, slideType, 'title');
    const statRule = getRule(preset, slideType, 'stat');

    return (
      <motion.div
        key={slideIndex}
        className="absolute inset-0"
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: preset.transitionDuration, ease: 'easeInOut' }}
        style={{
          zIndex: isActive ? 10 : 0,
          pointerEvents: isActive ? 'auto' : 'none',
        }}
      >
        {/* Background layer — stays mounted, never re-keyed */}
        <div className="absolute inset-0" style={{ backgroundColor: preset.backgroundColor }}>
          {/* Video background */}
          {video && (
            <VideoBackground
              config={{
                url: video.url,
                type: video.type || 'mp4',
                opacity: video.opacity ?? preset.videoOpacity,
                filter: video.filter || preset.videoFilter,
                transform: video.transform,
                objectFit: 'cover',
              }}
            />
          )}

          {/* Slide background image overlay */}
          {slide.background?.type === 'image' && slide.background.value && (
            <img
              src={slide.background.value}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.5, filter: 'brightness(0.5)' }}
            />
          )}

          {/* Gradient overlay for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
        </div>

        {/* Content wrapper — re-mount on activation to replay animations */}
        {isActive && (
          <div
            key={activationKey}
            className="relative z-10 w-full h-full flex flex-col"
            style={{ fontFamily: `'${preset.fontBody}', sans-serif` }}
          >
            {/* ---- Top bar ---- */}
            <BlurReveal delay={0.05} className="px-[5%] pt-[3.5%] flex items-center justify-between">
              <div
                className="text-sm font-medium tracking-widest uppercase"
                style={{
                  color: preset.secondaryTextColor,
                  fontFamily: `'${preset.fontHeading}', sans-serif`,
                  fontSize: 'clamp(10px, 0.9vw, 14px)',
                }}
              >
                {metadata?.author || metadata?.type || ''}
              </div>
              {preset.showSlideNumbers && (
                <div style={{ color: preset.secondaryTextColor, fontSize: 'clamp(14px, 1.2vw, 20px)' }}>
                  {String(slideIndex + 1).padStart(2, '0')}
                </div>
              )}
            </BlurReveal>

            {/* ---- Divider ---- */}
            <div className="mt-3 mx-[5%]">
              <div className="w-full h-px bg-white/[0.12]" />
            </div>

            {/* ---- Metadata bar (hero slide only) ---- */}
            {preset.showMetadata && slideIndex === 0 && metadata && (
              <BlurReveal delay={0.12} className="px-[5%] mt-4 flex gap-8">
                {metadata.type && <MetaItem label="Type" value={metadata.type} color={preset.secondaryTextColor} />}
                {metadata.author && <MetaItem label="Author" value={metadata.author} color={preset.secondaryTextColor} />}
                {metadata.date && <MetaItem label="Date" value={metadata.date} color={preset.secondaryTextColor} />}
                {metadata.industry && <MetaItem label="Industry" value={metadata.industry} color={preset.secondaryTextColor} />}
              </BlurReveal>
            )}

            {/* ---- Main content by slide type ---- */}
            {slideType === 'hero' && (
              <div className="flex-1 flex items-end px-[5%] pb-[8%]">
                <div className="max-w-[85%]">
                  <h1
                    className="leading-[0.9] tracking-tight"
                    style={{
                      color: preset.primaryTextColor,
                      fontFamily: `'${preset.fontHeading}', sans-serif`,
                      fontSize: 'clamp(48px, 10vw, 140px)',
                      fontWeight: 700,
                    }}
                  >
                    {renderTitle(titleText, titleRule)}
                  </h1>
                  {subtitleText && (
                    <BlurReveal delay={0.7} className="mt-6">
                      <p style={{
                        color: preset.secondaryTextColor,
                        fontSize: 'clamp(14px, 1.4vw, 22px)',
                        lineHeight: 1.5,
                      }}>
                        {subtitleText}
                      </p>
                    </BlurReveal>
                  )}
                </div>
              </div>
            )}

            {slideType === 'content' && (
              <div className="flex-1 flex flex-col justify-between px-[5%] pt-[4%] pb-[5%]">
                <div className="max-w-[85%]">
                  {subtitleText && (
                    <BlurReveal delay={0.15}>
                      <p style={{
                        color: preset.secondaryTextColor,
                        fontSize: 'clamp(11px, 1.1vw, 16px)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                      }}>
                        {subtitleText}
                      </p>
                    </BlurReveal>
                  )}
                  {titleText && (
                    <div className="mt-3">
                      <h2
                        className="leading-[1.04] tracking-tight"
                        style={{
                          color: preset.primaryTextColor,
                          fontFamily: `'${preset.fontHeading}', sans-serif`,
                          fontSize: 'clamp(24px, 3.8vw, 60px)',
                          fontWeight: 600,
                        }}
                      >
                        {renderTitle(titleText, titleRule)}
                      </h2>
                    </div>
                  )}
                  {bodyText && (
                    <BlurReveal delay={0.8} className="mt-6 max-w-[75%]">
                      <p style={{
                        color: preset.secondaryTextColor,
                        fontSize: 'clamp(13px, 1.15vw, 18px)',
                        lineHeight: 1.7,
                      }}>
                        {bodyText}
                      </p>
                    </BlurReveal>
                  )}
                </div>
              </div>
            )}

            {slideType === 'stats' && (
              <div className="flex-1 flex flex-col px-[5%] pt-[4%] pb-[5%]">
                {titleText && (
                  <div className="mb-8">
                    <h2
                      className="leading-[1.04] tracking-tight"
                      style={{
                        color: preset.primaryTextColor,
                        fontFamily: `'${preset.fontHeading}', sans-serif`,
                        fontSize: 'clamp(22px, 3.2vw, 48px)',
                        fontWeight: 600,
                      }}
                    >
                      {renderTitle(titleText, titleRule)}
                    </h2>
                  </div>
                )}
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-wrap justify-center gap-8">
                    {classified.stats.map((stat, i) => (
                      <StatCard
                        key={i}
                        stat={stat}
                        index={i}
                        accentColor={preset.accentColor}
                        secondaryColor={preset.secondaryTextColor}
                        fontHeading={preset.fontHeading}
                        delay={statRule?.delay ?? 0.5}
                        easing={statRule?.easing ?? [0.25, 0.1, 0.25, 1]}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {slideType === 'section' && (
              <div className="flex-1 flex items-center justify-center px-[10%]">
                <h1
                  className="text-center leading-[0.95] tracking-tight"
                  style={{
                    color: preset.primaryTextColor,
                    fontFamily: `'${preset.fontHeading}', sans-serif`,
                    fontSize: 'clamp(36px, 8vw, 120px)',
                    fontWeight: 700,
                  }}
                >
                  {renderTitle(titleText, titleRule)}
                </h1>
              </div>
            )}

            {slideType === 'closing' && (
              <div className="flex-1 flex flex-col items-center justify-center px-[10%]">
                <h1
                  className="text-center leading-[0.95] tracking-tight"
                  style={{
                    color: preset.primaryTextColor,
                    fontFamily: `'${preset.fontHeading}', sans-serif`,
                    fontSize: 'clamp(36px, 8vw, 120px)',
                    fontWeight: 700,
                  }}
                >
                  {renderTitle(titleText, titleRule)}
                </h1>
                {subtitleText && (
                  <BlurReveal delay={0.6} className="mt-6">
                    <p className="text-center" style={{
                      color: preset.secondaryTextColor,
                      fontSize: 'clamp(14px, 1.4vw, 22px)',
                      lineHeight: 1.5,
                    }}>
                      {subtitleText}
                    </p>
                  </BlurReveal>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  /** Render title text with the appropriate animation */
  function renderTitle(text: string, rule?: AnimationRule): React.ReactNode {
    if (!text) return null;
    const animation = rule?.animation ?? 'slide-up';
    const delay = rule?.delay ?? 0.3;
    const duration = rule?.duration ?? 0.7;
    const easing = rule?.easing ?? [0.25, 0.1, 0.25, 1];
    const stagger = rule?.stagger ?? 0.035;

    switch (animation) {
      case 'word-by-word':
        return (
          <WordByWordReveal
            text={text}
            delay={delay}
            stagger={stagger}
            duration={duration}
            easing={easing}
          />
        );

      case 'blur-in':
        return (
          <BlurReveal delay={delay} duration={duration} easing={easing}>
            {text}
          </BlurReveal>
        );

      case 'fade-in':
        return (
          <FadeIn delay={delay} duration={duration}>
            {text}
          </FadeIn>
        );

      case 'scale-up':
        return (
          <ScaleUp delay={delay} duration={duration} easing={easing}>
            {text}
          </ScaleUp>
        );

      case 'slide-up':
      default: {
        const words = text.split(' ');
        if (words.length > 4) {
          const mid = Math.ceil(words.length / 2);
          return (
            <>
              <SlideUpLine delay={delay} duration={duration} easing={easing}>
                {words.slice(0, mid).join(' ')}
              </SlideUpLine>
              <br />
              <SlideUpLine delay={delay + 0.1} duration={duration} easing={easing}>
                {words.slice(mid).join(' ')}
              </SlideUpLine>
            </>
          );
        }
        return (
          <SlideUpLine delay={delay} duration={duration} easing={easing}>
            {text}
          </SlideUpLine>
        );
      }
    }
  }

  // ---- Main render ----
  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden cursor-none"
      style={{
        backgroundColor: preset.backgroundColor,
        fontFamily: `'${preset.fontBody}', sans-serif`,
      }}
    >
      {/* Exit button — visible on hover */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all opacity-0 hover:opacity-100 cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      {/* All slides mounted simultaneously — only opacity changes */}
      {slides.map((_, i) => renderSlide(i))}

      {/* Navigation */}
      {preset.navStyle === 'dots' && (
        <NavigationDots count={slides.length} current={currentIndex} onNavigate={goTo} />
      )}
      {preset.navStyle === 'progress-bar' && (
        <ProgressBar count={slides.length} current={currentIndex} />
      )}
      {preset.navStyle === 'numbers' && (
        <NumberNav count={slides.length} current={currentIndex} secondaryColor={preset.secondaryTextColor} />
      )}
    </div>
  );
}
