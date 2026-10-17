import React, { useState } from 'react';
import { 
  Sparkles, 
  Clock, 
  ArrowRight, 
  AlertCircle, 
  CheckCheck, 
  RotateCcw,
  Zap
} from 'lucide-react';
import { ScheduleReorganizationPlan, Task } from '../../types';
import { ReschedulerService } from '../../services/rescheduler';
import { AdvisorService } from '../../services/advisor';

interface ReschedulerWidgetProps {
  tasks: Task[];
  onApplyPlan: (updatedTasks: Task[]) => void;
  workdayEnd: string;
}

export const ReschedulerWidget: React.FC<ReschedulerWidgetProps> = ({
  tasks,
  onApplyPlan,
  workdayEnd,
}) => {
  const [delayMinutes, setDelayMinutes] = useState<number>(30);
  const [reason, setReason] = useState<string>('Reunión anterior se extendió');
  const [currentPlan, setCurrentPlan] = useState<ScheduleReorganizationPlan | null>(null);
  const [previousTasksBackup, setPreviousTasksBackup] = useState<Task[] | null>(null);
  const [appliedSuccessfully, setAppliedSuccessfully] = useState(false);

  const reasonsList = [
    'Reunión anterior se extendió',
    'Urgencia imprevista atendida',
    'Retraso en transporte o logística',
    'Bloque de deep work necesitó más tiempo',
    'Fatiga / Pausa de recuperación necesaria',
  ];

  const handleCalculatePlan = () => {
    // Reference time: use either now or 11:00 default
    const now = new Date();
    const currentHourStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const plan = ReschedulerService.generatePlan(
      tasks,
      delayMinutes,
      reason,
      currentHourStr,
      workdayEnd
    );
    setCurrentPlan(plan);
    setAppliedSuccessfully(false);
  };

  const handleExecuteReorganization = () => {
    if (!currentPlan) return;
    setPreviousTasksBackup([...tasks]);
    const updated = ReschedulerService.applyPlan(tasks, currentPlan);
    onApplyPlan(updated);
    setAppliedSuccessfully(true);
    AdvisorService.playChime('focus_complete');
  };

  const handleRevert = () => {
    if (previousTasksBackup) {
      onApplyPlan(previousTasksBackup);
      setPreviousTasksBackup(null);
      setCurrentPlan(null);
      setAppliedSuccessfully(false);
      AdvisorService.playChime('notification');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Reorganizador Inteligente de Agenda
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Adapta tu jornada ante imprevistos o demoras sin intervención manual excesiva
          </p>
        </div>
      </div>

      {/* Quick Inconvenience / Delay Input */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        <div className="md:col-span-5">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Motivo del cambio
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
          >
            {reasonsList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-4">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Minutos de retraso
          </label>
          <div className="flex items-center gap-1.5">
            {[15, 30, 45, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDelayMinutes(mins)}
                className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors cursor-pointer ${
                  delayMinutes === mins
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700'
                }`}
              >
                +{mins}m
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-3 flex items-end">
          <button
            type="button"
            onClick={handleCalculatePlan}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
            <span>Calcular Plan</span>
          </button>
        </div>
      </div>

      {/* Plan Preview / Diff */}
      {currentPlan && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/70 dark:bg-slate-800/30">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Propuesta de Reorganización Dinámica (+{currentPlan.delayMinutes} min)
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {currentPlan.impactSummary}
              </p>
            </div>

            {!appliedSuccessfully ? (
              <button
                onClick={handleExecuteReorganization}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Aplicar a mi Agenda</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCheck className="w-4 h-4" />
                  Aplicado
                </span>
                <button
                  onClick={handleRevert}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer ml-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  Revertir
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {currentPlan.adjustments.map((adj) => (
              <div
                key={adj.taskId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate block">
                    {adj.taskTitle}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">
                    {adj.reason}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                  <span className="text-slate-400 line-through">{adj.oldStartTime}</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span
                    className={`font-semibold ${
                      adj.action === 'deferred_to_tomorrow'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    {adj.newStartTime}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
