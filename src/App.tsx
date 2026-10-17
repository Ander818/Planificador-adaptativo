/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Task, 
  Goal, 
  Habit, 
  WidgetSetting, 
  UserSettings, 
  ProductivitySuggestion,
  WeeklyProductivityStats 
} from './types';
import { StorageService } from './services/storage';
import { CryptoService } from './services/crypto';
import { StatsService } from './services/stats';
import { AdvisorService } from './services/advisor';
import { CalendarService } from './services/calendar';
import { TagSuggesterService } from './services/tagSuggester';
import { NotificationService } from './services/notifications';

import { TopBar } from './components/TopBar';
import { TaskModal } from './components/TaskModal';
import { MonthlyCalendarWidget } from './components/Widgets/MonthlyCalendarWidget';
import { TimelineWidget } from './components/Widgets/TimelineWidget';
import { TasksPriorityWidget } from './components/Widgets/TasksPriorityWidget';
import { PomodoroWidget } from './components/Widgets/PomodoroWidget';
import { GoalsWidget } from './components/Widgets/GoalsWidget';
import { HabitsWidget } from './components/Widgets/HabitsWidget';
import { MetricsOverviewWidget } from './components/Widgets/MetricsOverviewWidget';
import { ReschedulerWidget } from './components/Widgets/ReschedulerWidget';
import { SuggestionsWidget } from './components/Widgets/SuggestionsWidget';

import { WeeklyReportModal } from './components/WeeklyReportModal';
import { IntegrationsModal } from './components/IntegrationsModal';
import { VaultModal } from './components/VaultModal';
import { CustomizeWidgetsModal } from './components/CustomizeWidgetsModal';
import { WeeklyWorkloadChart } from './components/WeeklyWorkloadChart';

export default function App() {
  // State loaded from offline-first local storage
  const [tasks, setTasks] = useState<Task[]>(() => StorageService.getTasks());
  const [goals, setGoals] = useState<Goal[]>(() => StorageService.getGoals());
  const [habits, setHabits] = useState<Habit[]>(() => StorageService.getHabits());
  const [widgets, setWidgets] = useState<WidgetSetting[]>(() => StorageService.getWidgets());
  const [settings, setSettings] = useState<UserSettings>(() => StorageService.getSettings());
  const [suggestions, setSuggestions] = useState<ProductivitySuggestion[]>(() => StorageService.getSuggestions());

  // Date selection (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Active view tab
  const [currentTab, setCurrentTab] = useState<string>('tablero');

  // Agenda subview layout mode
  const [agendaView, setAgendaView] = useState<'both' | 'calendar' | 'timeline'>('both');

  // Online / Offline status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isWeeklyReportOpen, setIsWeeklyReportOpen] = useState<boolean>(false);
  const [isIntegrationsOpen, setIsIntegrationsOpen] = useState<boolean>(false);
  const [isVaultOpen, setIsVaultOpen] = useState<boolean>(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState<boolean>(false);

  // E2EE Lock state
  const [vaultLocked, setVaultLocked] = useState<boolean>(!CryptoService.isVaultUnlocked());

  // Dark mode effect
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Online/Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcut listener ('N' for new task)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingTask(null);
        setIsTaskModalOpen(true);
      }
      if (e.key === 'Escape') {
        setIsTaskModalOpen(false);
        setIsWeeklyReportOpen(false);
        setIsIntegrationsOpen(false);
        setIsVaultOpen(false);
        setIsCustomizeOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Proactive background reminder scheduler (monitors tasks & syncs with Service Worker)
  useEffect(() => {
    const stopScheduler = NotificationService.startProactiveScheduler(
      () => tasks,
      () => settings,
      (taskToOpen) => {
        setSelectedDate(taskToOpen.date);
        setEditingTask(taskToOpen);
        setIsTaskModalOpen(true);
      }
    );

    // Initial schedule sync with Service Worker
    NotificationService.syncScheduleWithServiceWorker(tasks);

    return () => stopScheduler();
  }, [tasks, settings]);

  // Deep-link handler when opening app from system notification (?taskId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linkedTaskId = params.get('taskId');
    if (linkedTaskId) {
      const match = tasks.find((t) => t.id === linkedTaskId);
      if (match) {
        setSelectedDate(match.date);
        setEditingTask(match);
        setIsTaskModalOpen(true);
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [tasks]);

  const handleSaveTask = (taskData: Omit<Task, 'id'>, existingId?: string) => {
    let updatedTasks: Task[];
    const userTaxonomy = TagSuggesterService.getAllUserTags(tasks);

    let finalTags = taskData.tags || [];
    if (finalTags.length === 0 && settings.autoTagSuggestions !== false) {
      const autoTags = TagSuggesterService.suggestTagsForTask(
        { title: taskData.title, description: taskData.description, category: taskData.category },
        userTaxonomy
      );
      if (autoTags.length > 0) {
        finalTags = autoTags;
      }
    }

    const resolvedTaskData = {
      ...taskData,
      tags: finalTags,
    };

    if (existingId) {
      updatedTasks = tasks.map((t) => (t.id === existingId ? { ...resolvedTaskData, id: existingId } : t));
    } else {
      const newTask: Task = {
        ...resolvedTaskData,
        id: `task-${Date.now()}`,
      };
      updatedTasks = [...tasks, newTask];
      AdvisorService.playChime('notification');
    }
    setTasks(updatedTasks);
    StorageService.saveTasks(updatedTasks);
  };

  const handleSaveMultipleTasks = (tasksData: Omit<Task, 'id'>[]) => {
    const userTaxonomy = TagSuggesterService.getAllUserTags(tasks);
    const newTasks: Task[] = tasksData.map((td, index) => {
      let finalTags = td.tags || [];
      if (finalTags.length === 0 && settings.autoTagSuggestions !== false) {
        const autoTags = TagSuggesterService.suggestTagsForTask(
          { title: td.title, description: td.description, category: td.category },
          userTaxonomy
        );
        if (autoTags.length > 0) {
          finalTags = autoTags;
        }
      }
      return {
        ...td,
        tags: finalTags,
        id: `task-${Date.now()}-${index}`,
      };
    });
    const updated = [...tasks, ...newTasks];
    setTasks(updated);
    StorageService.saveTasks(updated);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'completed' ? 'pending' : 'completed';
        if (nextStatus === 'completed') {
          AdvisorService.playChime('focus_complete');
        }
        return {
          ...t,
          status: nextStatus as any,
          completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined,
        };
      }
      return t;
    });
    setTasks(updated);
    StorageService.saveTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    const updated = tasks.filter((t) => t.id !== taskId);
    setTasks(updated);
    StorageService.saveTasks(updated);
  };

  const handleOpenNewTaskForDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const handleApplyReorganization = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    StorageService.saveTasks(updatedTasks);
  };

  const handleToggleHabit = (habitId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const updated = habits.map((h) => {
      if (h.id === habitId) {
        const alreadyDone = h.completedDates.includes(todayStr);
        let newDates: string[];
        let newStreak = h.streak;

        if (alreadyDone) {
          newDates = h.completedDates.filter((d) => d !== todayStr);
          newStreak = Math.max(0, h.streak - 1);
        } else {
          newDates = [...h.completedDates, todayStr];
          newStreak = h.streak + 1;
          AdvisorService.playChime('notification');
        }
        return { ...h, completedDates: newDates, streak: newStreak };
      }
      return h;
    });
    setHabits(updated);
    StorageService.saveHabits(updated);
  };

  const handleAddHabit = (newH: Habit) => {
    const updated = [...habits, newH];
    setHabits(updated);
    StorageService.saveHabits(updated);
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    const updated = goals.map((g) => (g.id === updatedGoal.id ? updatedGoal : g));
    setGoals(updated);
    StorageService.saveGoals(updated);
  };

  const handleAddGoal = (newG: Goal) => {
    const updated = [...goals, newG];
    setGoals(updated);
    StorageService.saveGoals(updated);
  };

  const handleApplySuggestion = (sug: ProductivitySuggestion) => {
    let updatedTasks = [...tasks];
    if (sug.taskRefId && sug.taskRefId !== 'global' && sug.newValue) {
      updatedTasks = updatedTasks.map((t) =>
        t.id === sug.taskRefId ? { ...t, startTime: sug.newValue! } : t
      );
      setTasks(updatedTasks);
      StorageService.saveTasks(updatedTasks);
    }

    const updatedSugs = suggestions.map((s) => (s.id === sug.id ? { ...s, applied: true } : s));
    setSuggestions(updatedSugs);
    StorageService.saveSuggestions(updatedSugs);
    AdvisorService.playChime('focus_complete');
  };

  const handleRefreshAnalysis = () => {
    const newSugs = AdvisorService.analyzeSchedule(tasks);
    setSuggestions(newSugs);
    StorageService.saveSuggestions(newSugs);
    AdvisorService.playChime('notification');
  };

  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = { ...settings, theme: newTheme as any };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const handleToggleDnd = () => {
    const updated = { ...settings, dndActive: !settings.dndActive };
    setSettings(updated);
    StorageService.saveSettings(updated);
    AdvisorService.playChime('notification');
  };

  const handleImportTasks = (importedTasks: Partial<Task>[]) => {
    const userTaxonomy = TagSuggesterService.getAllUserTags(tasks);
    const newEntries: Task[] = importedTasks.map((it, idx) => {
      let inferred = it.tags;
      if (!inferred || inferred.length === 0) {
        if (settings.autoTagSuggestions !== false) {
          const auto = TagSuggesterService.suggestTagsForTask(
            { title: it.title || '', description: it.description, category: it.category },
            userTaxonomy
          );
          inferred = auto.length > 0 ? auto : ['Importado'];
        } else {
          inferred = ['Importado'];
        }
      }
      return {
        id: `imported-${Date.now()}-${idx}`,
        title: it.title || 'Evento importado',
        description: it.description || '',
        category: it.category || 'meetings',
        priority: it.priority || 'p2',
        status: 'pending',
        date: it.date || selectedDate,
        startTime: it.startTime || '10:00',
        durationMinutes: it.durationMinutes || 60,
        energyLevel: it.energyLevel || 'medium',
        reminderMinutesBefore: it.reminderMinutesBefore || 15,
        tags: inferred,
        isLockedTime: true,
      };
    });
    const merged = [...tasks, ...newEntries];
    setTasks(merged);
    StorageService.saveTasks(merged);
  };

  // Compute live weekly stats
  const weeklyStats: WeeklyProductivityStats = StatsService.calculateWeeklyStats(tasks);

  // Sort widgets by configured order
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  // Widget render resolver
  const renderWidget = (id: string) => {
    switch (id) {
      case 'rescheduler':
        return (
          <ReschedulerWidget
            key="rescheduler"
            tasks={tasks}
            onApplyPlan={handleApplyReorganization}
            workdayEnd={settings.workdayEnd}
          />
        );
      case 'monthly_calendar':
        return (
          <MonthlyCalendarWidget
            key="monthly_calendar"
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onToggleStatus={handleToggleTaskStatus}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onNewTaskForDate={handleOpenNewTaskForDate}
            onDeleteTask={handleDeleteTask}
            categoryColors={settings.categoryColors}
          />
        );
      case 'timeline':
        return (
          <TimelineWidget
            key="timeline"
            tasks={tasks}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onToggleStatus={handleToggleTaskStatus}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onExportIcs={() => CalendarService.downloadIcs(tasks, 'khoros_agenda.ics')}
            categoryColors={settings.categoryColors}
          />
        );
      case 'quick_tasks':
        return (
          <TasksPriorityWidget
            key="quick_tasks"
            tasks={tasks}
            onToggleStatus={handleToggleTaskStatus}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            categoryColors={settings.categoryColors}
          />
        );
      case 'pomodoro':
        return (
          <PomodoroWidget
            key="pomodoro"
            dndActive={settings.dndActive}
            onToggleDnd={handleToggleDnd}
          />
        );
      case 'goals':
        return (
          <GoalsWidget
            key="goals"
            goals={goals}
            onUpdateGoal={handleUpdateGoal}
            onAddGoal={handleAddGoal}
          />
        );
      case 'habits':
        return (
          <HabitsWidget
            key="habits"
            habits={habits}
            onToggleHabit={handleToggleHabit}
            onAddHabit={handleAddHabit}
          />
        );
      case 'metrics':
        return (
          <MetricsOverviewWidget
            key="metrics"
            stats={weeklyStats}
            onOpenWeeklyReport={() => setIsWeeklyReportOpen(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Universal Top Bar */}
      <TopBar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenNewTask={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
        onOpenCustomize={() => setIsCustomizeOpen(true)}
        onOpenVault={() => setIsVaultOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsOpen(true)}
        settings={settings}
        tasks={tasks}
        onToggleTheme={handleToggleTheme}
        isOnline={isOnline}
        vaultLocked={vaultLocked}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: EXECUTIVE COCKPIT / TABLERO CENTRAL */}
        {currentTab === 'tablero' && (
          <div className="space-y-6">
            
            {/* Top row: Intelligent suggestions banner */}
            <SuggestionsWidget
              suggestions={suggestions}
              tasks={tasks}
              onApplySuggestion={handleApplySuggestion}
              onRefreshAnalysis={handleRefreshAnalysis}
            />

            {/* Configured Widgets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (Primary Daily & Monthly Workflow: Rescheduler, Monthly Calendar, Timeline, Tasks) */}
              <div className="lg:col-span-7 space-y-6">
                {sortedWidgets
                  .filter((w) => w.enabled && ['rescheduler', 'monthly_calendar', 'timeline', 'quick_tasks'].includes(w.id))
                  .map((w) => renderWidget(w.id))}
              </div>

              {/* Right Column (Focus, Goals, Habits, Metrics) */}
              <div className="lg:col-span-5 space-y-6">
                {sortedWidgets
                  .filter((w) => w.enabled && ['pomodoro', 'goals', 'habits', 'metrics'].includes(w.id))
                  .map((w) => renderWidget(w.id))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AGENDA & CRONOGRAMA */}
        {currentTab === 'agenda' && (
          <div className="space-y-6">
            {/* View Selector for Agenda */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Agenda & Planificación Temporal
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Visualiza tus bloques de tiempo en cuadrícula mensual interactiva y en cronograma horario diario.
                </p>
              </div>

              {/* Segmented controls */}
              <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs shrink-0">
                <button
                  onClick={() => setAgendaView('both')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    agendaView === 'both'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Vista Dividida
                </button>
                <button
                  onClick={() => setAgendaView('calendar')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    agendaView === 'calendar'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Calendario Mensual
                </button>
                <button
                  onClick={() => setAgendaView('timeline')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                    agendaView === 'timeline'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Cronograma Diario
                </button>
              </div>
            </div>

            <ReschedulerWidget
              tasks={tasks}
              onApplyPlan={handleApplyReorganization}
              workdayEnd={settings.workdayEnd}
            />

            {(agendaView === 'both' || agendaView === 'calendar') && (
              <MonthlyCalendarWidget
                tasks={tasks}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onToggleStatus={handleToggleTaskStatus}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setIsTaskModalOpen(true);
                }}
                onNewTaskForDate={handleOpenNewTaskForDate}
                onDeleteTask={handleDeleteTask}
                categoryColors={settings.categoryColors}
              />
            )}

            {(agendaView === 'both' || agendaView === 'timeline') && (
              <>
                <TimelineWidget
                  tasks={tasks}
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  onToggleStatus={handleToggleTaskStatus}
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                  onExportIcs={() => CalendarService.downloadIcs(tasks, 'khoros_agenda.ics')}
                  categoryColors={settings.categoryColors}
                />
                <TasksPriorityWidget
                  tasks={tasks}
                  onToggleStatus={handleToggleTaskStatus}
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                  onDeleteTask={handleDeleteTask}
                  categoryColors={settings.categoryColors}
                />
              </>
            )}
          </div>
        )}

        {/* TAB 3: METAS & OBJETIVOS */}
        {currentTab === 'metas' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8">
                <GoalsWidget
                  goals={goals}
                  onUpdateGoal={handleUpdateGoal}
                  onAddGoal={handleAddGoal}
                />
              </div>
              <div className="md:col-span-4 space-y-6">
                <HabitsWidget
                  habits={habits}
                  onToggleHabit={handleToggleHabit}
                  onAddHabit={handleAddHabit}
                />
                <MetricsOverviewWidget
                  stats={weeklyStats}
                  onOpenWeeklyReport={() => setIsWeeklyReportOpen(true)}
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REPORTES SEMANALES */}
        {currentTab === 'reportes' && (
          <div className="space-y-6">
            <WeeklyWorkloadChart
              data={weeklyStats.dailyWorkload}
              isDark={settings.theme === 'dark'}
              categoryColors={settings.categoryColors}
            />

            <MetricsOverviewWidget
              stats={weeklyStats}
              onOpenWeeklyReport={() => setIsWeeklyReportOpen(true)}
            />

            <div className="text-center py-4">
              <button
                onClick={() => setIsWeeklyReportOpen(true)}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Abrir Vista de Impresión & Exportación PDF
              </button>
            </div>
          </div>
        )}

      </main>

      {/* MODALS */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onSaveMultiple={handleSaveMultipleTasks}
        editingTask={editingTask}
        selectedDate={selectedDate}
        categoryColors={settings.categoryColors}
        existingTasks={tasks}
        autoTagEnabled={settings.autoTagSuggestions !== false}
      />

      <WeeklyReportModal
        isOpen={isWeeklyReportOpen}
        onClose={() => setIsWeeklyReportOpen(false)}
        stats={weeklyStats}
        tasks={tasks}
        goals={goals}
        categoryColors={settings.categoryColors}
      />

      <IntegrationsModal
        isOpen={isIntegrationsOpen}
        onClose={() => setIsIntegrationsOpen(false)}
        tasks={tasks}
        settings={settings}
        onUpdateSettings={(s) => {
          setSettings(s);
          StorageService.saveSettings(s);
        }}
        onImportTasks={handleImportTasks}
      />

      <VaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        vaultLocked={vaultLocked}
        onVaultStateChange={(unlocked) => setVaultLocked(!unlocked)}
      />

      <CustomizeWidgetsModal
        isOpen={isCustomizeOpen}
        onClose={() => setIsCustomizeOpen(false)}
        widgets={widgets}
        onUpdateWidgets={(w) => {
          setWidgets(w);
          StorageService.saveWidgets(w);
        }}
        settings={settings}
        onUpdateSettings={(s) => {
          setSettings(s);
          StorageService.saveSettings(s);
        }}
      />

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-amber-600 text-white px-3.5 py-2 text-xs font-medium shadow-xl border border-amber-500/40">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <span>Modo Offline activo — Trabajando con datos locales y almacenamiento cifrado.</span>
        </div>
      )}
    </div>
  );
}
