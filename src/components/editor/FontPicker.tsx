import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { loadGoogleFont } from '@/lib/font-loader';

interface Props {
  currentFont: string;
  onSelect: (font: string) => void;
}

interface GoogleFont {
  family: string;
  category: string;
  variants: string[];
}

// Cache fonts globally so we only fetch once
let cachedFonts: GoogleFont[] | null = null;
let fetchPromise: Promise<GoogleFont[]> | null = null;

const API_KEY = 'AIzaSyCQZhKtrwGnPtR5m1SFLplZoFWflz0hsdA';

async function fetchGoogleFonts(): Promise<GoogleFont[]> {
  if (cachedFonts) return cachedFonts;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(
    `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
  )
    .then(res => res.json())
    .then(data => {
      cachedFonts = (data.items || []).slice(0, 500); // Top 500 by popularity
      return cachedFonts;
    })
    .catch(() => {
      // Fallback to hardcoded list
      cachedFonts = FALLBACK_FONTS;
      return cachedFonts;
    });

  return fetchPromise;
}

const FALLBACK_FONTS: GoogleFont[] = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Oswald', 'Raleway', 'Nunito', 'Playfair Display', 'Merriweather',
  'Source Code Pro', 'Quicksand', 'Work Sans', 'DM Sans', 'Karla',
  'Fira Code', 'Outfit', 'Sora', 'Space Grotesk',
].map(f => ({ family: f, category: 'sans-serif', variants: ['regular', '700'] }));

// Track which fonts have been loaded for preview
const previewedFonts = new Set<string>();

export default function FontPicker({ currentFont, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [fonts, setFonts] = useState<GoogleFont[]>(FALLBACK_FONTS);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch fonts on mount
  useEffect(() => {
    fetchGoogleFonts().then(f => {
      setFonts(f);
      setLoading(false);
    });
  }, []);

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

  // Cleanup observer
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const filtered = fonts.filter(f =>
    f.family.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className="bg-white rounded-lg shadow-xl border border-slate-200 w-60 z-[300]"
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="p-2 border-b border-slate-100">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search 500+ fonts..."
          className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-indigo-500"
          autoFocus
        />
      </div>
      <div ref={listRef} className="max-h-64 overflow-y-auto py-1">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          </div>
        )}
        {filtered.slice(0, 100).map(font => (
          <button
            key={font.family}
            ref={fontRefCallback}
            data-font={font.family}
            onMouseDown={(e) => {
              e.preventDefault();
              loadGoogleFont(font.family);
              onSelect(font.family);
            }}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 transition-colors ${
              currentFont.includes(font.family) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
            }`}
            style={{ fontFamily: `"${font.family}", ${font.category}` }}
          >
            {font.family}
          </button>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="text-center py-4 text-xs text-slate-400">No fonts found</div>
        )}
        {filtered.length > 100 && (
          <div className="text-center py-2 text-xs text-slate-400">
            Showing first 100 — type to filter
          </div>
        )}
      </div>
    </div>
  );
}
