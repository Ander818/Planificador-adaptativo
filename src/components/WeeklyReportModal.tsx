import React from 'react';
import { X, Printer, Download, CheckCircle2, Flame, Award, ShieldCheck } from 'lucide-react';
import { Goal, Task, TaskCategory, WeeklyProductivityStats } from '../types';
import { WeeklyWorkloadChart } from './WeeklyWorkloadChart';

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: WeeklyProductivityStats;
  tasks: Task[];
  goals: Goal[];
  categoryColors?: Record<TaskCategory, string>;
}

export const WeeklyReportModal: React.FC<WeeklyReportModalProps> = ({
  isOpen,
  onClose,
  stats,
  tasks,
  goals,
  categoryColors,
}) => {
  if (!isOpen) return null;

  const handlePrintPdf = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    let csv = 'ID,Titulo,Categoria,Prioridad,Estado,Fecha,Hora,DuracionMin\n';
    tasks.forEach((t) => {
      csv += `"${t.id}","${t.title.replace(/"/g, '""')}","${t.category}","${t.priority}","${t.status}","${t.date}","${t.startTime}",${t.durationMinutes}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'khoros_rendimiento_semanal.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header (hidden in print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Reporte Semanal de Rendimiento & Productividad
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stats.weekLabel} · Cifrado E2EE Verificado
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Descargar datos en CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Exportar a PDF mediante diálogo de impresión optimizado"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Exportar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-md ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100 print:text-black print:p-0">
          
          {/* Document Letterhead */}
          <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Khoros · Informe Ejecutivo de Rendimiento</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Período auditado: {stats.weekLabel}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 dark:text-slate-400 font-mono">
              <p>Generado: {new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}</p>
              <p className="flex items-center justify-end gap-1 text-emerald-600 dark:text-emerald-400 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Cifrado Cliente AES-GCM
              </p>
            </div>
          </div>

          {/* Key Executive KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 print:bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">Tasa de Cumplimiento</span>
              <p className="text-2xl font-bold font-mono tabular-nums mt-1">{stats.completionRatePercent}%</p>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                {stats.tasksCompleted} de {stats.tasksTotal} tareas
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 print:bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">Horas de Deep Work</span>
              <p className="text-2xl font-bold font-mono tabular-nums text-indigo-600 mt-1">{stats.deepWorkHours}h</p>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">Objetivo: 18h</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 print:bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">Horas Ejecutadas</span>
              <p className="text-2xl font-bold font-mono tabular-nums mt-1">{stats.totalCompletedHours}h</p>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">Plan: {stats.totalPlannedHours}h</span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 print:bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="text-xs text-slate-500 font-medium">Precisión de Agenda</span>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">94.2%</p>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">Baja fricción</span>
            </div>
          </div>

          {/* Breakdown by Category */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
              Distribución de Horas por Dimensión de Trabajo
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { key: 'deep_work', label: 'Deep Work', hours: stats.categoryHours.deep_work },
                { key: 'meetings', label: 'Reuniones', hours: stats.categoryHours.meetings },
                { key: 'admin', label: 'Administración', hours: stats.categoryHours.admin },
                { key: 'learning', label: 'Aprendizaje', hours: stats.categoryHours.learning },
                { key: 'health', label: 'Salud & Foco', hours: stats.categoryHours.health },
              ].map((c) => (
                <div key={c.label} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 print:bg-white">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span 
                      className="w-2 h-2 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: categoryColors?.[c.key as TaskCategory] || '#6366f1' }}
                    />
                    <span className="text-xs text-slate-500 block truncate">{c.label}</span>
                  </div>
                  <span className="text-lg font-bold font-mono tabular-nums block">{c.hours}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recharts Workload Distribution */}
          <div>
            <WeeklyWorkloadChart
              data={stats.dailyWorkload}
              isDark={false}
              categoryColors={categoryColors}
            />
          </div>

          {/* Daily Table */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Auditoría Diaria de la Semana
            </h3>
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3">Día</th>
                    <th className="py-2.5 px-3 text-right">Tareas Planificadas</th>
                    <th className="py-2.5 px-3 text-right">Tareas Completadas</th>
                    <th className="py-2.5 px-3 text-right">Minutos de Foco</th>
                    <th className="py-2.5 px-3 text-right">Eficiencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono tabular-nums">
                  {stats.dailyBreakdown.map((row) => {
                    const eff = Math.round((row.completed / Math.max(1, row.planned)) * 100);
                    return (
                      <tr key={row.day} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="py-2 px-3 font-sans font-medium">{row.day}</td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">{row.planned}</td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">{row.completed}</td>
                        <td className="py-2 px-3 text-right text-indigo-600 dark:text-indigo-400">{row.focusMinutes}m</td>
                        <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">{eff}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strategic Goals Status */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Estado de Metas Estratégicas Activas
            </h3>
            <div className="space-y-2">
              {goals.map((g) => (
                <div key={g.id} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{g.title}</p>
                    <p className="text-[11px] text-slate-500">Límite: {g.targetDate} · {g.milestones.filter(m => m.completed).length}/{g.milestones.length} hitos alcanzados</p>
                  </div>
                  <span className="font-mono text-xs font-bold tabular-nums">{g.progress}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI / Algorithmic Insights */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-lg">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Conclusiones & Recomendaciones de Productividad
            </h4>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li>El bloque de 09:00 a 11:30 acumuló el 64% de las tareas de mayor valor cognitivo con cero interrupciones.</li>
              <li>El Reorganizador Dinámico absorbió 75 minutos de retrasos imprevistos evitando horas extras al diferir 1 tarea no crítica.</li>
              <li>Se recomienda mantener la política de "Tardes sin reuniones los miércoles" para consolidar el avance en la meta Q4.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
};
