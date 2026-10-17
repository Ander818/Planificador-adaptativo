import React from 'react';
import { Sparkles, Check, ArrowRight, Lightbulb } from 'lucide-react';
import { ProductivitySuggestion, Task } from '../../types';
import { AdvisorService } from '../../services/advisor';

interface SuggestionsWidgetProps {
  suggestions: ProductivitySuggestion[];
  tasks: Task[];
  onApplySuggestion: (suggestion: ProductivitySuggestion) => void;
  onRefreshAnalysis: () => void;
}

export const SuggestionsWidget: React.FC<SuggestionsWidgetProps> = ({
  suggestions,
  onApplySuggestion,
  onRefreshAnalysis,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Sugerencias Inteligentes de Productividad
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ajustes recomendados según tus patrones de energía y carga mental
          </p>
        </div>

        <button
          onClick={onRefreshAnalysis}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Analizar</span>
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tu distribución de tareas está equilibrada. No hay conflictos de energía detectados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((sug) => (
            <div
              key={sug.id}
              className={`p-3.5 rounded-lg border transition-all ${
                sug.applied
                  ? 'bg-slate-50/50 dark:bg-slate-850/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {sug.title}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    {sug.explanation}
                  </p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                    Acción: {sug.proposedAction}
                  </p>
                </div>

                <div className="shrink-0">
                  {sug.applied ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      Aplicado
                    </span>
                  ) : (
                    <button
                      onClick={() => onApplySuggestion(sug)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <span>Aplicar</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
