import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { loadGoogleFont } from '@/lib/font-loader';

interface Props {
  currentFont: string;
  onSelect: (font: string) => void;
}

// Top 150 Google Fonts by popularity — no API key needed
const GOOGLE_FONTS = [
  'Roboto', 'Open Sans', 'Noto Sans', 'Montserrat', 'Lato', 'Poppins', 'Inter',
  'Roboto Condensed', 'Oswald', 'Raleway', 'Nunito', 'Ubuntu', 'Rubik', 'Playfair Display',
  'Merriweather', 'Nunito Sans', 'PT Sans', 'Roboto Slab', 'Work Sans', 'Quicksand',
  'Mulish', 'Barlow', 'DM Sans', 'Fira Sans', 'Heebo', 'Karla', 'Manrope', 'Libre Franklin',
  'Josefin Sans', 'Outfit', 'Space Grotesk', 'Arimo', 'Hind', 'Cabin', 'Dosis',
  'Source Code Pro', 'Bitter', 'Abel', 'Archivo', 'Overpass', 'Exo 2', 'Signika',
  'Comfortaa', 'Cairo', 'Assistant', 'Varela Round', 'Catamaran', 'Cormorant Garamond',
  'Sora', 'Figtree', 'Lexend', 'Plus Jakarta Sans', 'Red Hat Display',
  'Titillium Web', 'IBM Plex Sans', 'Noto Serif', 'PT Serif', 'Crimson Text',
  'Lora', 'EB Garamond', 'Libre Baskerville', 'Vollkorn', 'Spectral', 'Cardo',
  'Alegreya', 'Old Standard TT', 'Cormorant', 'Gentium Book Plus',
  'Fira Code', 'JetBrains Mono', 'Source Code Pro', 'Roboto Mono', 'IBM Plex Mono', 'Space Mono',
  'Pacifico', 'Lobster', 'Dancing Script', 'Caveat', 'Satisfy', 'Great Vibes',
  'Permanent Marker', 'Shadows Into Light', 'Indie Flower', 'Amatic SC',
  'Bebas Neue', 'Anton', 'Righteous', 'Fredoka', 'Lilita One',
  'Archivo Black', 'Black Ops One', 'Russo One', 'Bungee',
  'Kanit', 'Sarabun', 'Prompt', 'Chakra Petch', 'Kodchasan',
  'Nanum Gothic', 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC',
  'Secular One', 'Alef', 'Heebo', 'Assistant',
  'Geologica', 'Onest', 'Geist', 'Instrument Sans',
  'Gabarito', 'Bricolage Grotesque', 'Funnel Sans', 'Savate',
  'Albert Sans', 'Wix Madefor Display', 'Epilogue', 'Urbanist', 'Satoshi',
  'General Sans', 'Clash Display', 'Cabinet Grotesk', 'Switzer',
  'DM Serif Display', 'DM Serif Text', 'Fraunces', 'Newsreader',
  'Bodoni Moda', 'Gilda Display', 'Yeseva One', 'Rozha One',
  'Advent Pro', 'Michroma', 'Orbitron', 'Electrolize', 'Audiowide',
  'Protest Guerrilla', 'Protest Strike', 'Lugrasimo',
  'Prata', 'Cormorant Upright', 'Marcellus', 'Forum', 'Yaldevi',
  'Manjari', 'Inconsolata', 'Karla', 'Inter Tight',
].filter((v, i, a) => a.indexOf(v) === i); // dedupe

// Track which fonts have been loaded for preview
const previewedFonts = new Set<string>();

export default function FontPicker({ currentFont, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Lazy load fonts as they scroll into view
  const fontRefCallback = useCallback((node: HTMLButtonElement | null) => {
    if (!node) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const fontFamily = (entry.target as HTMLElement).dataset.font;
              if (fontFamily && !previewedFonts.has(fontFamily)) {
                previewedFonts.add(fontFamily);
                loadGoogleFont(fontFamily);
              }
            }
          }
        },
        { root: listRef.current, rootMargin: '100px' },
      );
    }
    observerRef.current.observe(node);
  }, []);

  useEffect(() => {
    return () => { observerRef.current?.disconnect(); };
  }, []);

  const filtered = search
    ? GOOGLE_FONTS.filter(f => f.toLowerCase().includes(search.toLowerCase()))
    : GOOGLE_FONTS;

  return (
    <div
      className="bg-white rounded-lg shadow-xl border border-slate-200 w-60 z-[300]"
      data-formatting-dropdown
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="p-2 border-b border-slate-100">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search 150+ fonts..."
          className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-indigo-500"
          autoFocus
        />
      </div>
      <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
        {filtered.map(font => (
          <button
            key={font}
            ref={fontRefCallback}
            data-font={font}
            onMouseDown={(e) => {
              e.preventDefault();
              loadGoogleFont(font);
              onSelect(font);
            }}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 transition-colors ${
              currentFont.includes(font) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
            }`}
            style={{ fontFamily: `"${font}", sans-serif` }}
          >
            {font}
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-4 text-xs text-slate-400">No fonts found</div>
        )}
      </div>
    </div>
  );
}
