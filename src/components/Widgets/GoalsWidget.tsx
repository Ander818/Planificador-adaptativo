import React, { useState } from 'react';
import { Target, Plus, CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import { Goal, Milestone } from '../../types';

interface GoalsWidgetProps {
  goals: Goal[];
  onUpdateGoal: (updatedGoal: Goal) => void;
  onAddGoal: (newGoal: Goal) => void;
}

export const GoalsWidget: React.FC<GoalsWidgetProps> = ({
  goals,
  onUpdateGoal,
  onAddGoal,
}) => {
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(goals[0]?.id || null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('2026-11-30');

  const toggleMilestone = (goal: Goal, milestoneId: string) => {
    const updatedMilestones = goal.milestones.map((m) =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const completedCount = updatedMilestones.filter((m) => m.completed).length;
    const progress = Math.round((completedCount / Math.max(1, updatedMilestones.length)) * 100);

    onUpdateGoal({
      ...goal,
      milestones: updatedMilestones,
      progress,
    });
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title: newTitle.trim(),
      category: 'deep_work',
      targetDate: newTargetDate,
      progress: 0,
      milestones: [
        { id: `m-${Date.now()}-1`, title: 'Primer hito inicial', completed: false },
        { id: `m-${Date.now()}-2`, title: 'Fase de revisión y entrega', completed: false },
      ],
      notes: 'Objetivo estratégico personal',
    };

    onAddGoal(newGoal);
    setNewTitle('');
    setIsAdding(false);
    setExpandedGoalId(newGoal.id);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Metas & Objetivos Estratégicos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Progreso medible por hitos y fechas límite
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Meta</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreateGoal} className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Título del objetivo (ej. Certificación Cloud, 10km carrera)..."
            className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-2">
            <input
              type="date"
              value={newTargetDate}
              onChange={(e) => setNewTargetDate(e.target.value)}
              className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md font-mono text-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-md"
              >
                Crear
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {goals.map((goal) => {
          const isExpanded = expandedGoalId === goal.id;
          return (
            <div
              key={goal.id}
              className="border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 bg-slate-50/40 dark:bg-slate-850/20"
            >
              <div
                className="flex items-center justify-between gap-3 cursor-pointer"
                onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {goal.title}
                    </p>
                    <span className="font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-slate-100">
                      {goal.progress}%
                    </span>
                  </div>

                  {/* Clean progress bar */}
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 dark:bg-slate-100 transition-all duration-300"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    <span>Meta: {goal.targetDate}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {goal.milestones.filter((m) => m.completed).length} de {goal.milestones.length} hitos
                    </span>
                  </div>
                </div>

                <div className="text-slate-400 pl-2">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {/* Milestones Checklist */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Hitos para cumplimiento
                  </p>
                  {goal.milestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      onClick={() => toggleMilestone(goal, milestone.id)}
                      className="flex items-center gap-2 text-xs py-1 px-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                    >
                      {milestone.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span
                        className={`truncate ${
                          milestone.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {milestone.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
