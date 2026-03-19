import React, { useState } from 'react';

interface Props {
  currentFont: string;
  onSelect: (font: string) => void;
}

const FONT_LIST = [
  { name: 'Inter', family: 'Inter, sans-serif' },
  { name: 'Arial', family: 'Arial, sans-serif' },
  { name: 'Helvetica', family: 'Helvetica, sans-serif' },
  { name: 'Georgia', family: 'Georgia, serif' },
  { name: 'Times New Roman', family: '"Times New Roman", serif' },
  { name: 'Roboto', family: 'Roboto, sans-serif' },
  { name: 'Open Sans', family: '"Open Sans", sans-serif' },
  { name: 'Lato', family: 'Lato, sans-serif' },
  { name: 'Montserrat', family: 'Montserrat, sans-serif' },
  { name: 'Poppins', family: 'Poppins, sans-serif' },
  { name: 'Playfair Display', family: '"Playfair Display", serif' },
  { name: 'Merriweather', family: 'Merriweather, serif' },
  { name: 'Source Code Pro', family: '"Source Code Pro", monospace' },
  { name: 'Fira Code', family: '"Fira Code", monospace' },
  { name: 'Raleway', family: 'Raleway, sans-serif' },
  { name: 'Nunito', family: 'Nunito, sans-serif' },
  { name: 'Oswald', family: 'Oswald, sans-serif' },
  { name: 'Quicksand', family: 'Quicksand, sans-serif' },
];

export default function FontPicker({ currentFont, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = FONT_LIST.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className="bg-white rounded-lg shadow-xl border border-slate-200 w-56 z-[300]"
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="p-2 border-b border-slate-100">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search fonts..."
          className="w-full px-2 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-indigo-500"
          autoFocus
        />
      </div>
      <div className="max-h-56 overflow-y-auto py-1">
        {filtered.map(font => (
          <button
            key={font.name}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(font.family);
            }}
            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 transition-colors ${
              currentFont.includes(font.name) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
            }`}
            style={{ fontFamily: font.family }}
          >
            {font.name}
          </button>
        ))}
      </div>
    </div>
  );
}
