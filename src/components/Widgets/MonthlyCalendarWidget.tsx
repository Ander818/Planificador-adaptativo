import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
  Filter,
  Edit3,
  Flame,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Task, TaskCategory } from '../../types';
import { CalendarService } from '../../services/calendar';

interface MonthlyCalendarWidgetProps {
  tasks: Task[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onToggleStatus: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onNewTaskForDate?: (dateStr: string) => void;
  onDeleteTask?: (taskId: string) => void;
  categoryColors?: Record<TaskCategory, string>;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const WEEKDAY_NAMES = [
  { short: 'Lun', full: 'Lunes' },
  { short: 'Mar', full: 'Martes' },
  { short: 'Mié', full: 'Miércoles' },
  { short: 'Jue', full: 'Jueves' },
  { short: 'Vie', full: 'Viernes' },
  { short: 'Sáb', full: 'Sábado' },
  { short: 'Dom', full: 'Domingo' },
];

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  deep_work: 'Deep Work',
  meetings: 'Reuniones',
  admin: 'Admin',
  learning: 'Aprendizaje',
  health: 'Salud',
};

const DEFAULT_COLORS: Record<TaskCategory, string> = {
  deep_work: '#6366f1',
  meetings: '#f59e0b',
  admin: '#64748b',
  learning: '#a855f7',
  health: '#10b981',
};

export const MonthlyCalendarWidget: React.FC<MonthlyCalendarWidgetProps> = ({
  tasks,
  selectedDate,
  onSelectDate,
  onToggleStatus,
  onEditTask,
  onNewTaskForDate,
  onDeleteTask,
  categoryColors = DEFAULT_COLORS,
}) => {
  // Parse initial month from selectedDate or current date
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, 1);
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [dayStatusFilter, setDayStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper to format Date to YYYY-MM-DD
  const formatDateString = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = useMemo(() => formatDateString(new Date()), []);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(todayStr);
  };

  // Pre-filter tasks by search and category for the calendar view
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q) ?? false;
        const matchesTags = t.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false;
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }
      return true;
    });
  }, [tasks, categoryFilter, searchQuery]);

  // Group tasks by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const list = map.get(task.date) || [];
      list.push(task);
      map.set(task.date, list);
    }
    // Sort each day's tasks chronologically
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));
    }
    return map;
  }, [filteredTasks]);

  // Monthly statistics
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthTasks = tasks.filter((t) => t.date.startsWith(monthPrefix));
    const completed = monthTasks.filter((t) => t.status === 'completed').length;
    const pending = monthTasks.length - completed;
    const totalMinutes = monthTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
    return {
      total: monthTasks.length,
      completed,
      pending,
      totalMinutes,
    };
  }, [tasks, year, month]);

  // Build the 35 or 42 grid cells
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    // getDay returns 0 for Sunday, 1 for Monday... We want Monday = 0, Sunday = 6
    const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isPrevMonth: boolean;
      isNextMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      dayTasks: Task[];
    }> = [];

    // 1. Previous month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = formatDateString(prevDate);
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayTasks: tasksByDate.get(dateStr) || [],
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const curDate = new Date(year, month, d);
      const dateStr = formatDateString(curDate);
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayTasks: tasksByDate.get(dateStr) || [],
      });
    }

    // 3. Next month days to complete remaining cells (multiples of 7, usually 35 or 42)
    const totalCellsNeeded = cells.length > 35 ? 42 : 35;
    const remaining = totalCellsNeeded - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = formatDateString(nextDate);
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate,
        dayTasks: tasksByDate.get(dateStr) || [],
      });
    }

    return cells;
  }, [year, month, selectedDate, todayStr, tasksByDate]);

  // Tasks for the selected day
  const selectedDayTasks = useMemo(() => {
    const raw = tasks.filter((t) => t.date === selectedDate);
    const sorted = [...raw].sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

    if (dayStatusFilter === 'pending') {
      return sorted.filter((t) => t.status !== 'completed');
    }
    if (dayStatusFilter === 'completed') {
      return sorted.filter((t) => t.status === 'completed');
    }
    return sorted;
  }, [tasks, selectedDate, dayStatusFilter]);

  // Human readable selected date header
  const formattedSelectedDayHeader = useMemo(() => {
    if (!selectedDate) return 'Día seleccionado';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayName = WEEKDAY_NAMES[(dateObj.getDay() + 6) % 7].full;
    const monthName = MONTH_NAMES[m - 1];
    return `${dayName}, ${d} de ${monthName} de ${y}`;
  }, [selectedDate]);

  const selectedDayTotalMinutes = useMemo(() => {
    return selectedDayTasks.reduce((acc, t) => acc + (t.durationMinutes || 0), 0);
  }, [selectedDayTasks]);

  const selectedDayCompletedCount = useMemo(() => {
    return tasks.filter((t) => t.date === selectedDate && t.status === 'completed').length;
  }, [tasks, selectedDate]);

  const selectedDayAllTasksCount = useMemo(() => {
    return tasks.filter((t) => t.date === selectedDate).length;
  }, [tasks, selectedDate]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
      {/* Top Header & Monthly Controls */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Title & Month Name */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                  (Calendario Mensual)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <span>{monthStats.total} tareas en el mes</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-600 dark:text-emerald-400">{monthStats.completed} completadas</span>
                <span aria-hidden="true">·</span>
                <span>{Math.round(monthStats.totalMinutes / 60)}h estimadas</span>
              </div>
            </div>
          </div>

          {/* Month Navigation & Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleGoToToday}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Ir al mes actual y seleccionar hoy"
            >
              Hoy
            </button>

            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Mes anterior"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Mes siguiente"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => CalendarService.downloadIcs(tasks, `khoros_${year}_${month + 1}.ics`)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Exportar tareas del mes a .ics"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar .ics</span>
            </button>

            {onNewTaskForDate && (
              <button
                onClick={() => onNewTaskForDate(selectedDate)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nueva Tarea</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter bar: categories and text search */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Filtrar:
            </span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Todas
            </button>
            {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map((cat) => {
              const active = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(active ? 'all' : cat)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: categoryColors[cat] || DEFAULT_COLORS[cat] }}
                  />
                  <span>{CATEGORY_LABELS[cat]}</span>
                </button>
              );
            })}
          </div>

          <div className="w-full sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el calendario..."
              className="w-full sm:w-48 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-center py-2 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
        {WEEKDAY_NAMES.map((d) => (
          <div key={d.short} className="truncate px-1">
            <span className="hidden sm:inline">{d.full}</span>
            <span className="sm:hidden">{d.short}</span>
          </div>
        ))}
      </div>

      {/* Calendar 7-Column Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/70 border-b border-slate-200 dark:border-slate-800">
        {calendarGrid.map((cell) => {
          const hasTasks = cell.dayTasks.length > 0;
          const completedCount = cell.dayTasks.filter((t) => t.status === 'completed').length;
          const allCompleted = hasTasks && completedCount === cell.dayTasks.length;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[82px] sm:min-h-[105px] p-1.5 sm:p-2 transition-all cursor-pointer relative flex flex-col justify-between group ${
                cell.isCurrentMonth
                  ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  : 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 hover:bg-slate-100/50'
              } ${
                cell.isSelected
                  ? 'ring-2 ring-indigo-500/80 dark:ring-indigo-400/90 bg-indigo-50/30 dark:bg-indigo-950/25 z-10'
                  : ''
              }`}
              role="button"
              tabIndex={0}
              aria-label={`${cell.dayNum} de ${MONTH_NAMES[month]}, ${cell.dayTasks.length} tareas`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDate(cell.dateStr);
                }
              }}
            >
              {/* Day Cell Header: Number + Badges */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-mono font-medium inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                    cell.isToday
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold shadow-2xs'
                      : cell.isSelected
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : cell.isCurrentMonth
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {cell.dayNum}
                </span>

                {/* Day Task Count Indicator */}
                {hasTasks && (
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded font-medium ${
                        allCompleted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                      title={`${completedCount} de ${cell.dayTasks.length} tareas completadas`}
                    >
                      {completedCount}/{cell.dayTasks.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Tasks preview inside day cell */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {/* Desktop View: Mini Task Bars */}
                <div className="hidden sm:flex flex-col gap-1">
                  {cell.dayTasks.slice(0, 3).map((task) => {
                    const isDone = task.status === 'completed';
                    const color = categoryColors[task.category] || DEFAULT_COLORS[task.category] || '#6366f1';

                    return (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDate(cell.dateStr);
                        }}
                        className={`text-[11px] px-1.5 py-0.5 rounded truncate flex items-center gap-1.5 border transition-opacity ${
                          isDone
                            ? 'opacity-60 bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 line-through text-slate-500'
                            : 'bg-slate-50 dark:bg-slate-800/90 border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 hover:border-slate-300'
                        }`}
                        title={`${task.startTime || ''} ${task.title} (${CATEGORY_LABELS[task.category]})`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                          {task.startTime || ''}
                        </span>
                        <span className="truncate">{task.title}</span>
                      </div>
                    );
                  })}
                  {cell.dayTasks.length > 3 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 pl-1 font-medium">
                      +{cell.dayTasks.length - 3} más
                    </span>
                  )}
                </div>

                {/* Mobile View: Visual category dots */}
                <div className="sm:hidden flex flex-wrap gap-1 items-center mt-1">
                  {cell.dayTasks.slice(0, 4).map((task) => {
                    const color = categoryColors[task.category] || DEFAULT_COLORS[task.category] || '#6366f1';
                    return (
                      <span
                        key={task.id}
                        className={`w-1.5 h-1.5 rounded-full ${
                          task.status === 'completed' ? 'opacity-40' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    );
                  })}
                  {cell.dayTasks.length > 4 && (
                    <span className="text-[9px] text-slate-400 leading-none">
                      +{cell.dayTasks.length - 4}
                    </span>
                  )}
                </div>
              </div>

              {/* Hover Quick Action to add task */}
              {onNewTaskForDate && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDate(cell.dateStr);
                      onNewTaskForDate(cell.dateStr);
                    }}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                    title={`Añadir tarea para el ${cell.dayNum}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FILTERED DAY SPECIFIC VIEW / PANEL DE TAREAS DEL DÍA SELECCIONADO */}
      <div className="p-5 bg-slate-50/50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {formattedSelectedDayHeader}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{selectedDayAllTasksCount} tareas programadas</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {selectedDayCompletedCount} completadas
              </span>
              <span aria-hidden="true">·</span>
              <span>{Math.round(selectedDayTotalMinutes / 60 * 10) / 10} horas totales</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Day filter tabs */}
            <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg text-xs">
              <button
                onClick={() => setDayStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  dayStatusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Todas ({selectedDayAllTasksCount})
              </button>
              <button
                onClick={() => setDayStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  dayStatusFilter === 'pending'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Pendientes ({selectedDayAllTasksCount - selectedDayCompletedCount})
              </button>
              <button
                onClick={() => setDayStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  dayStatusFilter === 'completed'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Completadas ({selectedDayCompletedCount})
              </button>
            </div>

            {onNewTaskForDate && (
              <button
                onClick={() => onNewTaskForDate(selectedDate)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir a este día</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Day Task List */}
        {selectedDayTasks.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40">
            <CalendarIcon className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-600 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No hay tareas {dayStatusFilter !== 'all' ? `(${dayStatusFilter === 'pending' ? 'pendientes' : 'completadas'})` : ''} para {selectedDate}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Haz clic en "Añadir a este día" o pulsa sobre cualquier otra casilla del mes para inspeccionar sus actividades.
            </p>
            {onNewTaskForDate && (
              <button
                onClick={() => onNewTaskForDate(selectedDate)}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Programar tarea en esta fecha</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {selectedDayTasks.map((task) => {
              const isDone = task.status === 'completed';
              const color = categoryColors[task.category] || DEFAULT_COLORS[task.category] || '#6366f1';

              // Calculate start and end time
              let timeLabel = task.startTime;
              if (task.startTime && task.durationMinutes) {
                const [sh, sm] = task.startTime.split(':').map(Number);
                const endMinutes = sh * 60 + sm + task.durationMinutes;
                const eh = Math.floor(endMinutes / 60) % 24;
                const em = endMinutes % 60;
                timeLabel = `${task.startTime} - ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
              }

              return (
                <div
                  key={task.id}
                  className={`flex items-start justify-between gap-3 p-3 bg-white dark:bg-slate-900 border rounded-xl transition-all ${
                    isDone
                      ? 'border-slate-200/70 dark:border-slate-800/70 opacity-70 bg-slate-50/50 dark:bg-slate-900/40'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Checkbox */}
                    <button
                      onClick={() => onToggleStatus(task.id)}
                      className="mt-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 cursor-pointer"
                      title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>

                    {/* Task Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold ${
                            isDone
                              ? 'line-through text-slate-500 dark:text-slate-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {task.title}
                        </span>

                        {/* Priority tag */}
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium ${
                            task.priority === 'p1'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : task.priority === 'p2'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {task.priority.toUpperCase()}
                        </span>

                        {/* Category label */}
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span>{CATEGORY_LABELS[task.category]}</span>
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-1.5">
                          {task.description}
                        </p>
                      )}

                      {/* Clean Unboxed Metadata Line */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{timeLabel}</span>
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{task.durationMinutes} min</span>
                        {task.energyLevel && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <Flame className="w-3 h-3 text-amber-500" />
                              <span className="capitalize">{task.energyLevel} energía</span>
                            </span>
                          </>
                        )}
                        {task.tags && task.tags.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <span>{task.tags.join(', ')}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="Editar tarea"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {onDeleteTask && (
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar tarea"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
