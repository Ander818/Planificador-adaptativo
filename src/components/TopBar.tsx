import React from 'react';
import { 
  Plus, 
  ShieldCheck, 
  ShieldAlert, 
  Sun, 
  Moon, 
  SlidersHorizontal,
  Cloud,
  Wifi,
  WifiOff,
  BellOff
} from 'lucide-react';
import { Task, UserSettings } from '../types';

import { PWAInstallButton } from './PWAInstallButton';
import { NotificationBellButton } from './NotificationBellButton';

interface TopBarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenNewTask: () => void;
  onOpenCustomize: () => void;
  onOpenVault: () => void;
  onOpenIntegrations: () => void;
  settings: UserSettings;
  tasks?: Task[];
  onToggleTheme: () => void;
  isOnline: boolean;
  vaultLocked: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewTask,
  onOpenCustomize,
  onOpenVault,
  onOpenIntegrations,
  settings,
  tasks = [],
  onToggleTheme,
  isOnline,
  vaultLocked,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => onSelectTab('tablero')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              Khoros
            </span>
          </button>

          {/* Quiet connection & security indicators (Unboxed, clean text) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-3 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={onOpenVault}
              className="flex items-center gap-1.5 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title={vaultLocked ? 'Bóveda E2EE Bloqueada' : 'Bóveda E2EE Activa (AES-GCM-256)'}
            >
              {vaultLocked ? (
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span className="font-mono">{vaultLocked ? 'E2EE Bloqueado' : 'E2EE Cifrado'}</span>
            </button>

            <span aria-hidden="true">·</span>

            <span className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>{isOnline ? 'En línea' : 'Modo Offline'}</span>
            </span>

            {settings.dndActive && (
              <>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-1 text-indigo-500">
                  <BellOff className="w-3.5 h-3.5" />
                  <span>DND Activo</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => onSelectTab('tablero')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'tablero'
                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tablero
          </button>

          <button
            onClick={() => onSelectTab('agenda')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'agenda'
                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Agenda
          </button>

          <button
            onClick={() => onSelectTab('metas')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'metas'
                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Metas
          </button>

          <button
            onClick={() => onSelectTab('reportes')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'reportes'
                ? 'text-slate-900 dark:text-white border-b-2 border-slate-900 dark:border-white font-semibold'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Reporte Semanal
          </button>

          <button
            onClick={onOpenIntegrations}
            className="whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white transition-colors py-1"
          >
            Integraciones
          </button>
        </nav>

        {/* Zone 3: Actions & 1 Primary Action Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <PWAInstallButton />

          <NotificationBellButton
            settings={settings}
            tasks={tasks}
            onOpenCustomize={onOpenCustomize}
          />

          <button
            onClick={onOpenCustomize}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Personalizar Tablero y Widgets"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={settings.theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Tarea</span>
          </button>
        </div>

      </div>

      {/* Mobile nav subrow for small screens */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-200 dark:border-slate-800 py-2 px-3 text-xs font-medium text-slate-600 dark:text-slate-400">
        <button
          onClick={() => onSelectTab('tablero')}
          className={currentTab === 'tablero' ? 'text-slate-900 dark:text-white font-semibold' : ''}
        >
          Tablero
        </button>
        <button
          onClick={() => onSelectTab('agenda')}
          className={currentTab === 'agenda' ? 'text-slate-900 dark:text-white font-semibold' : ''}
        >
          Agenda
        </button>
        <button
          onClick={() => onSelectTab('metas')}
          className={currentTab === 'metas' ? 'text-slate-900 dark:text-white font-semibold' : ''}
        >
          Metas
        </button>
        <button
          onClick={() => onSelectTab('reportes')}
          className={currentTab === 'reportes' ? 'text-slate-900 dark:text-white font-semibold' : ''}
        >
          Reporte PDF
        </button>
        <button
          onClick={onOpenIntegrations}
          className="hover:text-slate-900 dark:hover:text-white"
        >
          Integración
        </button>
      </div>
    </header>
  );
};
