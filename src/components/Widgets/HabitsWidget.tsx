import React, { useState } from 'react';
import { Award, Check, Plus, Flame } from 'lucide-react';
import { Habit } from '../../types';

interface HabitsWidgetProps {
  habits: Habit[];
  onToggleHabit: (habitId: string) => void;
  onAddHabit: (newHabit: Habit) => void;
}

export const HabitsWidget: React.FC<HabitsWidgetProps> = ({
  habits,
  onToggleHabit,
  onAddHabit,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const todayStr = new Date().toISOString().split('T')[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newH: Habit = {
      id: `habit-${Date.now()}`,
      title: newTitle.trim(),
      category: 'health',
      frequency: 'daily',
      streak: 1,
      completedDates: [],
    };

    onAddHabit(newH);
    setNewTitle('');
    setIsAdding(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Rastreador de Hábitos & Disciplina
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Construcción de rutinas y rachas consecutivas
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Hábito</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="mb-3 flex items-center gap-2">
          <input
            type="text"
            required
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Nuevo hábito (ej: 10m meditación, gimnasio)..."
            className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 rounded-md"
          >
            Guardar
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {habits.map((habit) => {
          const isDoneToday = habit.completedDates.includes(todayStr);

          return (
            <div
              key={habit.id}
              onClick={() => onToggleHabit(habit.id)}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                isDoneToday
                  ? 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                    isDoneToday
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'border border-slate-300 dark:border-slate-600 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-xs font-medium truncate ${
                    isDoneToday
                      ? 'line-through text-slate-400 dark:text-slate-500'
                      : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {habit.title}
                </span>
              </div>

              <div className="flex items-center gap-1 font-mono text-xs tabular-nums text-amber-600 dark:text-amber-400 shrink-0 pl-2">
                <Flame className="w-3 h-3 fill-current" />
                <span>{habit.streak}d</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
