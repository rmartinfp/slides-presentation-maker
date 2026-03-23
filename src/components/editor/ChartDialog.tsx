import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, X, Loader2, PieChart, TrendingUp, AreaChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEditorStore } from '@/stores/editor-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart as ReAreaChart, Area,
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

type ChartType = 'auto' | 'bar' | 'line' | 'area' | 'pie';

interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie';
  data: Record<string, any>[];
  dataKeys: string[];
  nameKey: string;
  title?: string;
  colors: string[];
}

const CHART_TYPES: { value: ChartType; label: string; icon: React.ReactNode }[] = [
  { value: 'auto', label: 'Auto', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'bar', label: 'Bar', icon: <BarChart3 className="w-4 h-4" /> },
  { value: 'line', label: 'Line', icon: <TrendingUp className="w-4 h-4" /> },
  { value: 'area', label: 'Area', icon: <AreaChart className="w-4 h-4" /> },
  { value: 'pie', label: 'Pie', icon: <PieChart className="w-4 h-4" /> },
];

const DEFAULT_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
];

interface Props {
  onClose: () => void;
}

export default function ChartDialog({ onClose }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('auto');
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { addElement } = useEditorStore();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setChartConfig(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-chart', {
        body: {
          prompt: prompt.trim(),
          chartType: chartType === 'auto' ? undefined : chartType,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.config) throw new Error('No chart config returned');

      const config: ChartConfig = {
        ...data.config,
        colors: data.config.colors?.length ? data.config.colors : DEFAULT_COLORS,
      };

      setChartConfig(config);
    } catch (err: any) {
      console.error('Chart generation error:', err);
      toast.error(err.message || 'Failed to generate chart. Check your API configuration.');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = useCallback(() => {
    if (!chartRef.current) return;

    const svgElement = chartRef.current.querySelector('svg');
    if (!svgElement) {
      toast.error('Could not find chart SVG');
      return;
    }

    // Clone the SVG so we can modify it for export
    const cloned = svgElement.cloneNode(true) as SVGSVGElement;
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    cloned.setAttribute('width', '800');
    cloned.setAttribute('height', '500');

    // Inline computed styles for proper rendering as data URL
    const allElements = cloned.querySelectorAll('*');
    allElements.forEach((el) => {
      const computed = window.getComputedStyle(el as Element);
      const importantProps = ['font-family', 'font-size', 'fill', 'stroke', 'stroke-width', 'opacity'];
      importantProps.forEach((prop) => {
        const val = computed.getPropertyValue(prop);
        if (val) (el as HTMLElement).style.setProperty(prop, val);
      });
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(cloned);
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    addElement({
      type: 'image',
      content: dataUrl,
      x: 280,
      y: 160,
      width: 800,
      height: 500,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      style: { objectFit: 'contain', borderRadius: 8 },
    });

    toast.success('Chart added to slide!');
    onClose();
  }, [addElement, onClose]);

  const renderChart = (config: ChartConfig) => {
    const { type, data, dataKeys, nameKey, colors } = config;

    if (type === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <RePieChart>
            <Pie
              data={data}
              dataKey={dataKeys[0]}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </RePieChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {dataKeys.map((key, i) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (type === 'area') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <ReAreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {dataKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.3}
              />
            ))}
          </ReAreaChart>
        </ResponsiveContainer>
      );
    }

    // Default: bar
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          {dataKeys.map((key, i) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[i % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Chart Generator</h3>
              <p className="text-xs text-slate-400">Describe your data to create a chart</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Chart type selector */}
          <div>
            <label className="text-xs text-slate-500 mb-2 block">Chart Type</label>
            <div className="flex gap-2">
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setChartType(ct.value)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    chartType === ct.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ct.icon}
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart preview */}
          {chartConfig && (
            <div
              ref={chartRef}
              className="rounded-xl border border-slate-200 bg-white p-4"
              style={{ width: 480, height: 300, margin: '0 auto' }}
            >
              {renderChart(chartConfig)}
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">Generating chart...</p>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="space-y-2">
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && !loading) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Sales by quarter: Q1 $1.2M, Q2 $1.5M, Q3 $1.8M, Q4 $2.1M"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
              rows={3}
              autoFocus
              disabled={loading}
            />
            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white rounded-xl"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating...</>
              ) : (
                <><BarChart3 className="w-4 h-4 mr-2" /> Generate Chart</>
              )}
            </Button>
          </div>

          {/* Insert button */}
          {chartConfig && (
            <Button
              onClick={handleInsert}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
            >
              Insert into Slide
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
