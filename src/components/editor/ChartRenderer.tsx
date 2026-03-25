import React from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadarChart, Radar as ReRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ChartData } from '@/types/presentation';

const DEFAULT_COLORS = ['#4F46E5', '#9333EA', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];

interface Props {
  config: ChartData;
  interactive?: boolean; // tooltips & hover in editor/presentation
}

export default function ChartRenderer({ config, interactive = true }: Props) {
  const { chartType, data, dataKeys, nameKey, colors, title, showGrid, showLegend, unit } = config;
  const palette = colors?.length ? colors : DEFAULT_COLORS;

  const commonProps = {
    data,
    margin: { top: title ? 30 : 10, right: 20, left: 10, bottom: 10 },
  };

  const renderTitle = () =>
    title ? (
      <text x="50%" y={16} textAnchor="middle" className="fill-slate-700" style={{ fontSize: 14, fontWeight: 600 }}>
        {title}
      </text>
    ) : null;

  const formatValue = (v: number) => (unit ? `${v}${unit}` : String(v));

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {renderTitle()}
          <Pie
            data={data}
            dataKey={dataKeys[0] || 'value'}
            nameKey={nameKey || 'name'}
            cx="50%"
            cy="50%"
            outerRadius="70%"
            label={({ name, value }) => `${name}: ${formatValue(value)}`}
            labelLine
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          {interactive && <Tooltip formatter={(v: number) => formatValue(v)} />}
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'doughnut') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {renderTitle()}
          <Pie data={data} dataKey={dataKeys[0] || 'value'} nameKey={nameKey || 'name'}
            cx="50%" cy="50%" outerRadius="70%" innerRadius="40%"
            label={({ name, value }) => `${name}: ${formatValue(value)}`} labelLine stroke="none">
            {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Pie>
          {interactive && <Tooltip formatter={(v: number) => formatValue(v)} />}
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'radar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          {renderTitle()}
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey={nameKey || 'name'} tick={{ fontSize: 10 }} />
          <PolarRadiusAxis tick={{ fontSize: 9 }} />
          {dataKeys.map((key, i) => (
            <ReRadar key={key} dataKey={key} stroke={palette[i % palette.length]}
              fill={palette[i % palette.length]} fillOpacity={0.2} strokeWidth={2} />
          ))}
          {interactive && <Tooltip formatter={(v: number) => formatValue(v)} />}
          {showLegend && <Legend />}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: title ? 30 : 10, right: 20, left: 10, bottom: 10 }}>
          {renderTitle()}
          {showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
          <XAxis dataKey={nameKey || 'name'} tick={{ fontSize: 11 }} stroke="#94a3b8" name="X" />
          <YAxis dataKey={dataKeys[0] || 'value'} tick={{ fontSize: 11 }} stroke="#94a3b8" name="Y" />
          {interactive && <Tooltip cursor={{ strokeDasharray: '3 3' }} />}
          {showLegend && <Legend />}
          <Scatter data={data} fill={palette[0]}>
            {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  const ChartComponent = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent {...commonProps}>
        {renderTitle()}
        {showGrid !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />}
        <XAxis dataKey={nameKey || 'name'} tick={{ fontSize: 11 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={formatValue} />
        {interactive && <Tooltip formatter={(v: number) => formatValue(v)} />}
        {showLegend && <Legend />}
        {dataKeys.map((key, i) => {
          const color = palette[i % palette.length];
          if (chartType === 'line') {
            return <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color }} activeDot={{ r: 6 }} />;
          }
          if (chartType === 'area') {
            return <Area key={key} type="monotone" dataKey={key} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />;
          }
          return <Bar key={key} dataKey={key} fill={color} radius={[4, 4, 0, 0]} />;
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}
