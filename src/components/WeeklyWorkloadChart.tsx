import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  Line
} from 'recharts';
import { DailyWorkloadItem, TaskCategory } from '../types';
import { BarChart3, Layers, TrendingUp, Clock, Info } from 'lucide-react';

interface WeeklyWorkloadChartProps {
  data: DailyWorkloadItem[];
  isDark?: boolean;
  categoryColors?: Record<TaskCategory, string>;
}

export const WeeklyWorkloadChart: React.FC<WeeklyWorkloadChartProps> = ({
  data,
  isDark = true,
  categoryColors,
}) => {
  const [chartMode, setChartMode] = useState<'stacked_categories' | 'planned_vs_completed' | 'trend_area'>('stacked_categories');

  // Colors aligned with Khoros design tokens and user custom colors
  const colors = {
    deepWork: categoryColors?.deep_work || '#6366f1',
    meetings: categoryColors?.meetings || '#f59e0b',
    admin: categoryColors?.admin || '#64748b',
    learning: categoryColors?.learning || '#a855f7',
    health: categoryColors?.health || '#10b981',
    planned: isDark ? '#475569' : '#cbd5e1',
    completed: '#0ea5e9', // Sky 500
    gridStroke: isDark ? '#1e293b' : '#f1f5f9',
    axisColor: isDark ? '#94a3b8' : '#64748b',
  };

  // Calculate summary metrics
  const totalWeekHours = data.reduce((acc, curr) => acc + curr.totalHours, 0);
  const avgHoursPerDay = Number((totalWeekHours / Math.max(1, data.length)).toFixed(1));
  const peakDay = [...data].sort((a, b) => b.totalHours - a.totalHours)[0];
  const totalDeepWork = data.reduce((acc, curr) => acc + curr.deepWork, 0);
  const totalMeetings = data.reduce((acc, curr) => acc + curr.meetings, 0);
  const deepWorkRatio = Number((totalDeepWork / Math.max(0.5, totalMeetings)).toFixed(1));

  // Custom high-fidelity Tooltip conforming to zero-pill & tabular figures rules
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item: DailyWorkloadItem | undefined = payload[0]?.payload;
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950/95 border border-slate-700 dark:border-slate-800 rounded-lg p-3 shadow-xl backdrop-blur-xs text-xs text-white min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="font-semibold text-slate-200">{item?.label || label}</span>
            <span className="font-mono tabular-nums font-bold text-indigo-400">
              {item ? `${item.totalHours}h totales` : ''}
            </span>
          </div>

          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={`tooltip-${index}`} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-400">{entry.name}</span>
                </div>
                <span className="font-mono tabular-nums font-semibold text-slate-200">
                  {entry.value}h
                </span>
              </div>
            ))}
          </div>

          {item && chartMode === 'stacked_categories' && (
            <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Planificado: {item.plannedHours}h</span>
              <span className="text-emerald-400 font-mono">
                {Math.round((item.completedHours / Math.max(1, item.plannedHours)) * 100)}% cumplido
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
      
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            Distribución de la Carga de Trabajo Semanal (Horas)
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
            <span>Auditoría de 7 días con Recharts</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{totalWeekHours}h acumuladas</span>
          </div>
        </div>

        {/* Interactive Segmented Control (Anti-slop compliant button tabs) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setChartMode('stacked_categories')}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              chartMode === 'stacked_categories'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Por Categorías
          </button>

          <button
            type="button"
            onClick={() => setChartMode('planned_vs_completed')}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              chartMode === 'planned_vs_completed'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Plan vs Ejecutado
          </button>

          <button
            type="button"
            onClick={() => setChartMode('trend_area')}
            className={`px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              chartMode === 'trend_area'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tendencia de Foco
          </button>
        </div>
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/70 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
            Promedio Diario de Carga
          </span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
            {avgHoursPerDay}h <span className="text-xs font-normal text-slate-500">/ día</span>
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            Jornada equilibrada sin excesos
          </span>
        </div>

        <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/70 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
            Pico de Intensidad Semanal
          </span>
          <p className="text-xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 mt-0.5">
            {peakDay?.day}: {peakDay?.totalHours}h
          </p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            {peakDay?.deepWork}h dedicadas a Deep Work
          </span>
        </div>

        <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/70 dark:border-slate-800">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
            Ratio Foco vs. Reuniones
          </span>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
            {deepWorkRatio}x
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            {totalDeepWork}h foco vs {totalMeetings}h reuniones
          </span>
        </div>
      </div>

      {/* Main Recharts Visualization Container */}
      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'stacked_categories' ? (
            /* 1. Stacked Bars by Category */
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.gridStroke} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.axisColor, fontSize: 12, fontFamily: 'Plus Jakarta Sans' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.axisColor, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                unit="h"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '14px', fontSize: '11px', fontFamily: 'Plus Jakarta Sans' }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="deepWork" name="Enfoque Profundo" stackId="hours" fill={colors.deepWork} radius={[0, 0, 0, 0]} />
              <Bar dataKey="meetings" name="Reuniones" stackId="hours" fill={colors.meetings} radius={[0, 0, 0, 0]} />
              <Bar dataKey="admin" name="Administrativo" stackId="hours" fill={colors.admin} radius={[0, 0, 0, 0]} />
              <Bar dataKey="learning" name="Aprendizaje" stackId="hours" fill={colors.learning} radius={[0, 0, 0, 0]} />
              <Bar dataKey="health" name="Salud & Bienestar" stackId="hours" fill={colors.health} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartMode === 'planned_vs_completed' ? (
            /* 2. Grouped Planned vs Completed Hours */
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.gridStroke} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.axisColor, fontSize: 12, fontFamily: 'Plus Jakarta Sans' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.axisColor, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                unit="h"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '14px', fontSize: '11px', fontFamily: 'Plus Jakarta Sans' }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="plannedHours" name="Horas Planificadas" fill={colors.planned} radius={[4, 4, 0, 0]} />
              <Bar dataKey="completedHours" name="Horas Ejecutadas" fill={colors.completed} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            /* 3. Trend Area Curve */
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="deepWorkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.deepWork} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={colors.deepWork} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.completed} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={colors.completed} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.gridStroke} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.axisColor, fontSize: 12, fontFamily: 'Plus Jakarta Sans' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: colors.axisColor, fontSize: 11, fontFamily: 'JetBrains Mono' }}
                unit="h"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '14px', fontSize: '11px', fontFamily: 'Plus Jakarta Sans' }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="totalHours"
                name="Carga Total (h)"
                stroke={colors.completed}
                fillOpacity={1}
                fill="url(#totalGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="deepWork"
                name="Horas Deep Work"
                stroke={colors.deepWork}
                fillOpacity={1}
                fill="url(#deepWorkGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Narrative Insight */}
      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          Miércoles concentró el bloque más largo de Deep Work ({peakDay?.deepWork}h), coincidiendo con la política de cero reuniones.
        </span>
        <span className="font-mono tabular-nums text-slate-400 hidden sm:inline">
          Meta semanal: 38.5h
        </span>
      </div>

    </div>
  );
};
