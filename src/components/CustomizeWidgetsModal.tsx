import React from 'react';
import { 
  X, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Sliders, 
  Bell, 
  Volume2, 
  Clock, 
  Palette, 
  RotateCcw,
  Tag,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BellRing
} from 'lucide-react';
import { TaskCategory, UserSettings, WidgetSetting } from '../types';
import { DEFAULT_CATEGORY_COLORS } from '../services/storage';
import { NotificationService } from '../services/notifications';

interface CustomizeWidgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetSetting[];
  onUpdateWidgets: (w: WidgetSetting[]) => void;
  settings: UserSettings;
  onUpdateSettings: (s: UserSettings) => void;
}

const CATEGORY_LIST: { id: TaskCategory; label: string }[] = [
  { id: 'deep_work', label: 'Enfoque Profundo (Deep Work)' },
  { id: 'meetings', label: 'Reuniones & Coordinación' },
  { id: 'admin', label: 'Administrativo & Trámites' },
  { id: 'learning', label: 'Aprendizaje & Lectura' },
  { id: 'health', label: 'Salud & Bienestar' },
];

export const CustomizeWidgetsModal: React.FC<CustomizeWidgetsModalProps> = ({
  isOpen,
  onClose,
  widgets,
  onUpdateWidgets,
  settings,
  onUpdateSettings,
}) => {
  const [perm, setPerm] = React.useState<NotificationPermission | 'unsupported'>(() => NotificationService.getPermission());
  const [testStatus, setTestStatus] = React.useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleRequestPermission = async () => {
    const res = await NotificationService.requestPermission();
    setPerm(res);
    if (res === 'granted') {
      onUpdateSettings({ ...settings, smartNotifications: true });
    }
  };

  const handleTestNotification = async () => {
    setTestStatus('testing');
    try {
      const ok = await NotificationService.sendTestNotification();
      if (ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
        setTimeout(() => setTestStatus('idle'), 4000);
      }
    } catch {
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 4000);
    }
  };

  if (!isOpen) return null;

  const handleToggleWidget = (id: string) => {
    const updated = widgets.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w));
    onUpdateWidgets(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;

    const copy = [...widgets];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    // reindex order
    const reindexed = copy.map((w, idx) => ({ ...w, order: idx + 1 }));
    onUpdateWidgets(reindexed);
  };

  const handleCategoryColorChange = (cat: TaskCategory, newColor: string) => {
    const updatedColors: Record<TaskCategory, string> = {
      ...settings.categoryColors,
      [cat]: newColor,
    };
    onUpdateSettings({
      ...settings,
      categoryColors: updatedColors,
    });
  };

  const handleResetCategoryColors = () => {
    onUpdateSettings({
      ...settings,
      categoryColors: { ...DEFAULT_CATEGORY_COLORS },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Personalización del Tablero & Widgets
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Custom Category Colors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-indigo-500" />
                Colores Personalizados por Categoría
              </h3>
              <button
                type="button"
                onClick={handleResetCategoryColors}
                className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                title="Restablecer a la paleta predeterminada"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Personaliza el color de cada categoría para sincronizarlo en la agenda, gráficos y etiquetas.
            </p>

            <div className="space-y-2">
              {CATEGORY_LIST.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10 dark:border-white/20 shadow-2xs"
                      style={{ backgroundColor: settings.categoryColors[cat.id] }}
                    />
                    <span className="font-medium text-slate-900 dark:text-slate-100">{cat.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums uppercase">
                      {settings.categoryColors[cat.id]}
                    </span>
                    <input
                      type="color"
                      value={settings.categoryColors[cat.id]}
                      onChange={(e) => handleCategoryColorChange(cat.id, e.target.value)}
                      className="w-7 h-7 rounded border border-slate-300 dark:border-slate-600 cursor-pointer bg-transparent p-0"
                      title={`Cambiar color para ${cat.label}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widgets List */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Visibilidad y Orden de Widgets
            </h3>
            <div className="space-y-2">
              {widgets.map((widget, idx) => (
                <div
                  key={widget.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => handleToggleWidget(widget.id)}
                      className={`p-1 rounded cursor-pointer ${
                        widget.enabled
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                      title={widget.enabled ? 'Ocultar widget' : 'Mostrar widget'}
                    >
                      {widget.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <span
                      className={`font-medium truncate ${
                        widget.enabled
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-400 line-through'
                      }`}
                    >
                      {widget.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === widgets.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workday Boundaries for Auto-rescheduler */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Límites de Jornada Laboral
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              El Reorganizador Dinámico respetará esta hora de corte para no sobrecargarte tarde.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  Inicio de Jornada
                </label>
                <input
                  type="time"
                  value={settings.workdayStart}
                  onChange={(e) => onUpdateSettings({ ...settings, workdayStart: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                  Fin de Jornada (Corte)
                </label>
                <input
                  type="time"
                  value={settings.workdayEnd}
                  onChange={(e) => onUpdateSettings({ ...settings, workdayEnd: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Browser Notification API & Audio Signals */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5" />
                API de Notificaciones del Navegador (PWA)
              </h3>
              {/* Permission Badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                perm === 'granted'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  : perm === 'denied'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
              }`}>
                {perm === 'granted' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    Permitidas en el SO
                  </>
                ) : perm === 'denied' ? (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    Bloqueadas en navegador
                  </>
                ) : (
                  <>
                    <Bell className="w-3 h-3" />
                    Sin configurar
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Envía avisos proactivos del sistema antes de cada tarea mediante el <span className="font-semibold text-slate-700 dark:text-slate-300">Service Worker</span>, incluso si la aplicación está minimizada en segundo plano o cerrada.
            </p>

            {/* Permission Action CTA if not granted */}
            {perm !== 'granted' && (
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  {perm === 'denied'
                    ? 'Has bloqueado las notificaciones en el navegador. Haz clic en el candado de la barra de direcciones para habilitarlas.'
                    : 'Activa los permisos del navegador para recibir avisos acústicos y visuales a tiempo.'}
                </div>
                {perm !== 'denied' && (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition-colors cursor-pointer shadow-xs"
                  >
                    Activar Notificaciones
                  </button>
                )}
              </div>
            )}

            {/* Test Notification & Status if granted */}
            {perm === 'granted' && (
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-600 dark:text-slate-300">
                  Verificar entrega de notificaciones en este equipo
                </span>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  disabled={testStatus === 'testing'}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded transition-colors cursor-pointer"
                >
                  {testStatus === 'testing'
                    ? 'Enviando...'
                    : testStatus === 'success'
                    ? '¡Enviada con éxito!'
                    : testStatus === 'error'
                    ? 'Error al enviar'
                    : 'Probar Notificación'}
                </button>
              </div>
            )}

            {/* Toggles */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  Recordatorios proactivos de tareas en segundo plano
                </span>
                <input
                  type="checkbox"
                  checked={settings.smartNotifications}
                  onChange={(e) => onUpdateSettings({ ...settings, smartNotifications: e.target.checked })}
                  className="rounded text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5" />
                  Señal sonora sintetizada (Web Audio API Chime)
                </span>
                <input
                  type="checkbox"
                  checked={settings.audioChimesEnabled}
                  onChange={(e) => onUpdateSettings({ ...settings, audioChimesEnabled: e.target.checked })}
                  className="rounded text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Background Tag Suggestions & Categorization */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Categorización Inteligente & Etiquetas
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Un proceso en segundo plano (Web Worker) analiza la descripción de las tareas para sugerir etiquetas relevantes automáticamente.
            </p>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Sugerencias automáticas de etiquetas en segundo plano
              </span>
              <input
                type="checkbox"
                checked={settings.autoTagSuggestions !== false}
                onChange={(e) => onUpdateSettings({ ...settings, autoTagSuggestions: e.target.checked })}
                className="rounded text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
