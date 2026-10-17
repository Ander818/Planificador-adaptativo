import React, { useState } from 'react';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Edit3,
  Flame,
  AlertTriangle,
  Tag
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority } from '../../types';

interface TasksPriorityWidgetProps {
  tasks: Task[];
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  categoryColors?: Record<TaskCategory, string>;
}

export const TasksPriorityWidget: React.FC<TasksPriorityWidgetProps> = ({
  tasks,
  onToggleStatus,
  onEditTask,
  onDeleteTask,
  categoryColors,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const availableTags = Array.from(
    new Set(tasks.flatMap((t) => t.tags || []).filter(Boolean))
  ).slice(0, 10);

  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter === 'pending' && t.status === 'completed') return false;
    if (statusFilter === 'completed' && t.status !== 'completed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchTags = t.tags.some((tag) => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Matriz de Prioridades & Tareas
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Filtrado por criticidad, estado y búsqueda en tiempo real
          </p>
        </div>

        {/* Priority Segmented Controls (Interactive buttons) */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium">
          <button
            onClick={() => setPriorityFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              priorityFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setPriorityFilter('p1')}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              priorityFilter === 'p1'
                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            P1 Urgente
          </button>
          <button
            onClick={() => setPriorityFilter('p2')}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              priorityFilter === 'p2'
                ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            P2 Clave
          </button>
          <button
            onClick={() => setPriorityFilter('p3')}
            className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              priorityFilter === 'p3'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            P3 Secundarias
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, etiquetas o notas..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
          >
            <option value="pending">Pendientes</option>
            <option value="completed">Completadas</option>
            <option value="all">Todas</option>
          </select>
        </div>
      </div>

      {/* Quick Filter Tag Chips for Organization */}
      {availableTags.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3.5 text-xs">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0 flex items-center gap-1">
            <Tag className="w-3 h-3 text-indigo-500" />
            Etiquetas:
          </span>
          {availableTags.map((tag) => {
            const isActive = searchQuery.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchQuery(isActive ? '' : tag)}
                className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                #{tag}
              </button>
            );
          })}
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline px-1.5 shrink-0 cursor-pointer"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}

      {/* List */}
      {filteredTasks.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No se encontraron tareas con los filtros actuales
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            return (
              <div
                key={task.id}
                className={`group flex items-start justify-between gap-3 p-2.5 rounded-lg border transition-all ${
                  isDone
                    ? 'bg-slate-50/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 opacity-60'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    onClick={() => onToggleStatus(task.id)}
                    className="mt-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer shrink-0"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-medium truncate ${
                        isDone
                          ? 'line-through text-slate-500 dark:text-slate-500'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {task.title}
                    </p>

                    {/* Clean unboxed metadata with subtle typographic separators */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span
                        className="font-medium inline-flex items-center gap-1"
                        style={{ color: categoryColors?.[task.category] || undefined }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: categoryColors?.[task.category] || '#6366f1' }}
                        />
                        <span className="capitalize">{task.category.replace('_', ' ')}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{task.startTime}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{task.durationMinutes}m</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          task.priority === 'p1'
                            ? 'text-rose-600 dark:text-rose-400 font-semibold'
                            : task.priority === 'p2'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-500'
                        }
                      >
                        {task.priority.toUpperCase()}
                      </span>
                      {task.tags.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="flex items-center gap-1 truncate max-w-[180px]">
                            {task.tags.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSearchQuery(tag);
                                }}
                                className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-colors cursor-pointer"
                                title={`Filtrar por etiqueta #${tag}`}
                              >
                                #{tag}
                              </button>
                            ))}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => onEditTask(task)}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md"
                    title="Editar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
