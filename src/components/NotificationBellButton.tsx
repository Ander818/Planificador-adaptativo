import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, BellOff, Check, Sparkles, ExternalLink } from 'lucide-react';
import { NotificationService } from '../services/notifications';
import { Task, UserSettings } from '../types';

interface NotificationBellButtonProps {
  settings: UserSettings;
  tasks: Task[];
  onOpenCustomize: () => void;
}

export const NotificationBellButton: React.FC<NotificationBellButtonProps> = ({
  settings,
  tasks,
  onOpenCustomize,
}) => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isOpen, setIsOpen] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPermission(NotificationService.getPermission());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRequestPermission = async () => {
    const res = await NotificationService.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      NotificationService.syncScheduleWithServiceWorker(tasks);
    }
  };

  const handleSendTest = async () => {
    setTestSent(true);
    await NotificationService.sendTestNotification();
    setTimeout(() => setTestSent(false), 3000);
  };

  const upcomingReminders = NotificationService.calculateUpcomingReminders(tasks).slice(0, 3);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => {
          if (permission !== 'granted') {
            handleRequestPermission();
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
          permission === 'granted'
            ? 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60'
        }`}
        title={
          permission === 'granted'
            ? 'Notificaciones del navegador activas'
            : 'Activar recordatorios del navegador'
        }
      >
        {permission === 'granted' ? (
          <Bell className="w-4 h-4" />
        ) : (
          <BellRing className="w-4 h-4 animate-pulse" />
        )}

        {/* Small badge if pending permission or if upcoming tasks today */}
        {permission !== 'granted' ? (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-950" />
        ) : upcomingReminders.length > 0 ? (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-950" />
        ) : null}
      </button>

      {/* Floating Panel when clicked and permission is granted */}
      {isOpen && permission === 'granted' && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-4 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-emerald-500" />
              Notificaciones del Navegador
            </span>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-medium px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Segundo Plano Activo
            </span>
          </div>

          <p className="mt-2 text-slate-500 dark:text-slate-400 leading-relaxed text-[11px]">
            El Service Worker monitorea tus bloques de tareas y enviará alertas proactivas antes de que comiencen, incluso si esta pestaña está minimizada o cerrada.
          </p>

          {/* Upcoming Reminders List */}
          <div className="mt-3 space-y-1.5">
            <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
              Próximos avisos programados:
            </div>
            {upcomingReminders.length === 0 ? (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 italic py-1">
                No hay más tareas pendientes con recordatorio para hoy.
              </div>
            ) : (
              upcomingReminders.map((r) => (
                <div
                  key={r.id}
                  className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {r.title.replace(/^⏰\s*Recordatorio:\s*/, '')}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Inicio {r.taskStartTime} · Aviso {r.reminderMinutes}m antes
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {r.priority.toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testSent}
              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors cursor-pointer flex items-center gap-1"
            >
              {testSent ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span>Enviada</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Probar aviso</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCustomize();
              }}
              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>Ajustes</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
