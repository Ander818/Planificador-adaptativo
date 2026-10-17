import React from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  Lock, 
  ExternalLink, 
  Edit3, 
  Calendar as CalendarIcon,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Task, TaskCategory } from '../../types';
import { CalendarService } from '../../services/calendar';

interface TimelineWidgetProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (d: string) => void;
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onExportIcs: () => void;
  categoryColors?: Record<TaskCategory, string>;
}

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({
  tasks,
  selectedDate,
  onSelectDate,
  onToggleStatus,
  onEditTask,
  onExportIcs,
  categoryColors,
}) => {
  // Sort tasks chronologically
  const dayTasks = tasks
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const categoryLabels: Record<string, string> = {
    deep_work: 'Deep Work',
    meetings: 'Reunión',
    admin: 'Administración',
    learning: 'Aprendizaje',
    health: 'Salud',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Cronograma Diario & Bloques de Tiempo
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <span>{dayTasks.length} tareas programadas</span>
            <span aria-hidden="true">·</span>
            <span>{dayTasks.filter((t) => t.status === 'completed').length} completadas</span>
          </div>
        </div>

        {/* Date Selector & ICS sync */}
        <div className="flex items-center gap-2 shrink-0">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums focus:outline-none"
          />

          <button
            onClick={onExportIcs}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            title="Exportar a archivo de calendario (.ics)"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar .ics</span>
          </button>
        </div>
      </div>

      {/* Timeline List */}
      {dayTasks.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <Clock className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No hay bloques de tiempo para esta fecha
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Usa el botón "+ Nueva Tarea" para planificar tu jornada.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {dayTasks.map((task) => {
            const isDone = task.status === 'completed';
            const [sh, sm] = task.startTime.split(':').map(Number);
            const totalEndMin = sh * 60 + sm + task.durationMinutes;
            const endHourStr = `${Math.floor(totalEndMin / 60).toString().padStart(2, '0')}:${(totalEndMin % 60).toString().padStart(2, '0')}`;

            return (
              <div
                key={task.id}
                className={`group flex items-start sm:items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                  isDone
                    ? 'bg-slate-50/50 dark:bg-slate-850/40 border-slate-200/60 dark:border-slate-800/60 opacity-70'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                {/* Left: Time & Checkbox */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => onToggleStatus(task.id)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                    title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 w-24 shrink-0">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{task.startTime}</span>
                    <span className="text-slate-400 text-[10px]"> - {endHourStr}</span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium truncate ${
                          isDone
                            ? 'line-through text-slate-500 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </span>

                      {task.isLockedTime && (
                        <span title="Horario inamovible" className="text-slate-400 shrink-0">
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    {/* Metadata - Strict zero-pill rule: unboxed text with dots */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span 
                        className="font-medium inline-flex items-center gap-1.5"
                        style={{ color: categoryColors?.[task.category] || undefined }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: categoryColors?.[task.category] || '#6366f1' }}
                        />
                        {categoryLabels[task.category] || task.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{task.durationMinutes} min</span>
                      <span aria-hidden="true">·</span>
                      <span className="capitalize">{task.priority.toUpperCase()}</span>
                      {task.energyLevel === 'high' && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <Flame className="w-3 h-3" />
                            Alta energía
                          </span>
                        </>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-400 dark:text-slate-500 truncate max-w-[140px]">
                            {task.tags.map((t) => `#${t}`).join(' ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => {
                      const url = CalendarService.generateGoogleCalendarUrl(task);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Añadir a Google Calendar"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onEditTask(task)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Editar Tarea"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
