import React, { useState } from 'react';
import { Download, Share2, CheckCircle2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running as an installed PWA or just finished install
  if (isInstalled || justInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        PWA Instalada
      </span>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={async () => {
          const success = await install();
          if (success) setJustInstalled(true);
        }}
        title="Instalar Khoros como aplicación de escritorio o móvil"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-300 dark:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-md transition-colors shadow-xs"
      >
        <Download className="w-3.5 h-3.5 text-indigo-400" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Instalar en pantalla de inicio de iPhone / iPad"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-md transition-colors shadow-xs"
        >
          <Share2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Download className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Instalar Khoros en iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-mono text-[11px] font-bold shrink-0">1</span>
                  <p>Toca el botón <strong className="text-white">Compartir</strong> (icono de cuadrado con flecha hacia arriba) en la barra inferior de Safari.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-mono text-[11px] font-bold shrink-0">2</span>
                  <p>Desplázate hacia abajo y selecciona <strong className="text-white">"Añadir a la pantalla de inicio"</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-800/60 border border-slate-700/50">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 font-mono text-[11px] font-bold shrink-0">3</span>
                  <p>Presiona <strong className="text-white">Añadir</strong>. Podrás usar la app a pantalla completa y sin conexión a internet.</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-medium text-slate-200 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback: Show discreet quick install / PWA ready button
  return (
    <button
      onClick={() => {
        alert?.('Para instalar esta app en tu navegador, abre el menú del navegador y selecciona "Instalar aplicación" o añade a favoritos.');
      }}
      title="Aplicación instalable (PWA)"
      className="hidden md:inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-slate-200 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 rounded-md transition-colors"
    >
      <Download className="w-3 h-3 text-slate-400" />
      <span>PWA Lista</span>
    </button>
  );
};
