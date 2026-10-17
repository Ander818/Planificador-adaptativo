import React from 'react';
import { BarChart3, TrendingUp, CheckCircle, Clock, FileText } from 'lucide-react';
import { WeeklyProductivityStats } from '../../types';

interface MetricsOverviewWidgetProps {
  stats: WeeklyProductivityStats;
  onOpenWeeklyReport: () => void;
}

export const MetricsOverviewWidget: React.FC<MetricsOverviewWidgetProps> = ({
  stats,
  onOpenWeeklyReport,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Rendimiento Semanal en Vivo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {stats.weekLabel}
          </p>
        </div>

        <button
          onClick={onOpenWeeklyReport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 dark:text-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Reporte PDF</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/70 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tasa de Cumplimiento</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.completionRatePercent}%
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">+4% vs. semana anterior</p>
        </div>

        <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/70 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Horas de Deep Work</p>
          <p className="text-xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.deepWorkHours}h
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Meta: 18h / sem</p>
        </div>

        <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/70 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Tareas Completadas</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.tasksCompleted} / {stats.tasksTotal}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">En 7 días</p>
        </div>

        <div className="p-3 bg-slate-50/70 dark:bg-slate-800/40 rounded-lg border border-slate-200/70 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Horas Ejecutadas</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {stats.totalCompletedHours}h
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Planificado: {stats.totalPlannedHours}h</p>
        </div>
      </div>

      {/* Daily Sparkline Bars */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Distribución de Carga Diaria (Lun - Dom)
        </p>
        <div className="grid grid-cols-7 gap-2">
          {stats.dailyBreakdown.map((d) => {
            const heightPercent = Math.min(100, Math.round((d.completed / Math.max(1, d.planned)) * 100));
            return (
              <div key={d.day} className="flex flex-col items-center">
                <div className="w-full h-16 bg-slate-100 dark:bg-slate-800 rounded-md flex items-end p-1 overflow-hidden">
                  <div
                    className="w-full bg-slate-900 dark:bg-slate-200 rounded-xs transition-all duration-300"
                    style={{ height: `${heightPercent}%` }}
                    title={`${d.day}: ${d.completed}/${d.planned} tareas (${d.focusMinutes}m foco)`}
                  />
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1">
                  {d.day}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-slate-400">
                  {d.completed}/{d.planned}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
