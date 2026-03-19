import React, { useState } from 'react';

interface Props {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6',
  '#EC4899', '#14B8A6', '#06B6D4', '#6366F1', '#A855F7', '#F43F5E',
  '#DC2626', '#EA580C', '#CA8A04', '#16A34A', '#2563EB', '#7C3AED',
  '#DB2777', '#0D9488', '#0891B2', '#4F46E5', '#9333EA', '#E11D48',
];

export default function ColorPicker({ color, onChange, onClose }: Props) {
  const [customColor, setCustomColor] = useState(color);

  return (
    <div
      className="bg-white rounded-lg shadow-xl border border-slate-200 p-3 w-56 z-[300]"
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="grid grid-cols-6 gap-1.5 mb-3">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            onMouseDown={(e) => {
              e.preventDefault();
              onChange(c);
            }}
            className={`w-7 h-7 rounded-md border-2 transition-transform hover:scale-110 ${
              color.toUpperCase() === c ? 'border-indigo-500 scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <div
          className="w-7 h-7 rounded-md border border-slate-200"
          style={{ backgroundColor: customColor }}
        />
        <input
          type="text"
          value={customColor}
          onChange={(e) => {
            setCustomColor(e.target.value);
            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
              onChange(e.target.value);
            }
          }}
          className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 focus:outline-none focus:border-indigo-500"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}
