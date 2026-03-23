import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, X, Plus, Trash2, TrendingUp, PieChart, AreaChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { toast } from 'sonner';
import ChartRenderer from './ChartRenderer';
import type { ChartType, ChartData } from '@/types/presentation';

const CHART_TYPES: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'bar', label: 'Bar', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'line', label: 'Line', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'area', label: 'Area', icon: <AreaChart className="w-4 h-4" /> },
  { value: 'pie', label: 'Pie', icon: <PieChart className="w-4 h-4" /> },
];

const DEFAULT_COLORS = ['#4F46E5', '#9333EA', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

const SAMPLE_DATA = [
  { name: 'Q1', value: 1200 },
  { name: 'Q2', value: 1800 },
  { name: 'Q3', value: 1500 },
  { name: 'Q4', value: 2200 },
];

interface Props {
  onClose: () => void;
  /** If provided, edit existing chart element */
  editElementId?: string;
}

export default function ChartDialog({ onClose, editElementId }: Props) {
  const { addElement, updateElement, presentation, activeSlideIndex } = useEditorStore();

  // Load existing chart data if editing
  const existingElement = editElementId
    ? presentation.slides[activeSlideIndex]?.elements?.find(e => e.id === editElementId)
    : null;
  const existingConfig = existingElement ? (() => {
    try { return JSON.parse(existingElement.content) as ChartData; } catch { return null; }
  })() : null;

  const [chartType, setChartType] = useState<ChartType>(existingConfig?.chartType || 'bar');
  const [title, setTitle] = useState(existingConfig?.title || '');
  const [rows, setRows] = useState<{ name: string; values: number[] }[]>(() => {
    if (existingConfig) {
      return existingConfig.data.map(d => ({
        name: String(d[existingConfig.nameKey] || ''),
        values: existingConfig.dataKeys.map(k => Number(d[k]) || 0),
      }));
    }
    return SAMPLE_DATA.map(d => ({ name: d.name, values: [d.value] }));
  });
  const [seriesNames, setSeriesNames] = useState<string[]>(
    existingConfig?.dataKeys || ['Value']
  );
  const [colors, setColors] = useState<string[]>(existingConfig?.colors || DEFAULT_COLORS);
  const [unit, setUnit] = useState(existingConfig?.unit || '');

  // Build ChartData for preview
  const chartData: ChartData = {
    chartType,
    data: rows.map(r => {
      const obj: Record<string, string | number> = { name: r.name };
      seriesNames.forEach((key, i) => { obj[key] = r.values[i] ?? 0; });
      return obj;
    }),
    dataKeys: seriesNames,
    nameKey: 'name',
    colors: colors.slice(0, seriesNames.length),
    title: title || undefined,
    showGrid: true,
    showLegend: seriesNames.length > 1,
    unit: unit || undefined,
  };

  const addRow = () => {
    setRows([...rows, { name: `Item ${rows.length + 1}`, values: seriesNames.map(() => 0) }]);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  const updateRowName = (idx: number, name: string) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], name };
    setRows(updated);
  };

  const updateRowValue = (rowIdx: number, valIdx: number, value: string) => {
    const updated = [...rows];
    const values = [...updated[rowIdx].values];
    values[valIdx] = parseFloat(value) || 0;
    updated[rowIdx] = { ...updated[rowIdx], values };
    setRows(updated);
  };

  const addSeries = () => {
    const newName = `Series ${seriesNames.length + 1}`;
    setSeriesNames([...seriesNames, newName]);
    setRows(rows.map(r => ({ ...r, values: [...r.values, 0] })));
  };

  const removeSeries = (idx: number) => {
    if (seriesNames.length <= 1) return;
    setSeriesNames(seriesNames.filter((_, i) => i !== idx));
    setRows(rows.map(r => ({ ...r, values: r.values.filter((_, i) => i !== idx) })));
  };

  const handleInsert = () => {
    const content = JSON.stringify(chartData);

    if (editElementId) {
      updateElement(editElementId, { content });
      toast.success('Chart updated!');
    } else {
      addElement({
        type: 'chart',
        content,
        x: 280,
        y: 160,
        width: 800,
        height: 500,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
        style: { borderRadius: 12 },
      });
      toast.success('Chart added to slide!');
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#9333EA] flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">{editElementId ? 'Edit Chart' : 'Insert Chart'}</h3>
              <p className="text-xs text-slate-400">Add your data and customize the chart</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Chart type + title row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 mb-1 block font-medium">Chart Type</label>
              <div className="flex gap-1">
                {CHART_TYPES.map(ct => (
                  <button
                    key={ct.value}
                    onClick={() => setChartType(ct.value)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center justify-center gap-1 ${
                      chartType === ct.value
                        ? 'bg-gradient-to-r from-[#4F46E5] to-[#9333EA] text-white shadow-sm'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {ct.icon}
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="w-48">
              <label className="text-[10px] text-slate-500 mb-1 block font-medium">Title (optional)</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Chart title..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20"
              />
            </div>
            <div className="w-20">
              <label className="text-[10px] text-slate-500 mb-1 block font-medium">Unit</label>
              <input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                placeholder="$, %, ..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5]/20"
              />
            </div>
          </div>

          {/* Data table */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] text-slate-500 font-medium">Data</label>
              <div className="flex gap-1">
                <button onClick={addSeries} className="text-[10px] text-[#4F46E5] hover:text-[#4338CA] font-medium px-2 py-0.5 rounded hover:bg-indigo-50 transition-colors">
                  + Series
                </button>
                <button onClick={addRow} className="text-[10px] text-[#4F46E5] hover:text-[#4338CA] font-medium px-2 py-0.5 rounded hover:bg-indigo-50 transition-colors">
                  + Row
                </button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-slate-500 w-32">Label</th>
                    {seriesNames.map((name, i) => (
                      <th key={i} className="px-2 py-1.5 text-[10px] font-semibold text-slate-500">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                          <input
                            value={name}
                            onChange={e => {
                              const updated = [...seriesNames];
                              updated[i] = e.target.value;
                              setSeriesNames(updated);
                            }}
                            className="w-full bg-transparent text-[10px] font-semibold text-slate-600 focus:outline-none"
                          />
                          {seriesNames.length > 1 && (
                            <button onClick={() => removeSeries(i)} className="text-slate-300 hover:text-red-400">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr key={ri} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-3 py-1">
                        <input
                          value={row.name}
                          onChange={e => updateRowName(ri, e.target.value)}
                          className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                        />
                      </td>
                      {row.values.map((val, vi) => (
                        <td key={vi} className="px-2 py-1">
                          <input
                            type="number"
                            value={val}
                            onChange={e => updateRowValue(ri, vi, e.target.value)}
                            className="w-full bg-transparent text-sm text-slate-700 text-center focus:outline-none focus:bg-indigo-50 rounded px-1"
                          />
                        </td>
                      ))}
                      <td className="px-1">
                        {rows.length > 1 && (
                          <button onClick={() => removeRow(ri)} className="text-slate-300 hover:text-red-400 p-0.5">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Live preview */}
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block font-medium">Preview</label>
            <div className="rounded-xl border border-slate-200 bg-white p-2" style={{ height: 260 }}>
              <ChartRenderer config={chartData} interactive />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 shrink-0">
          <Button
            onClick={handleInsert}
            className="w-full bg-gradient-to-r from-[#4F46E5] to-[#9333EA] hover:from-[#4338CA] hover:to-[#7E22CE] text-white rounded-xl shadow-lg shadow-[#4F46E5]/20"
          >
            {editElementId ? 'Update Chart' : 'Insert Chart'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
