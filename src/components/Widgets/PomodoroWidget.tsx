import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  BellOff, 
  Bell, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Flame
} from 'lucide-react';
import { AdvisorService } from '../../services/advisor';

interface PomodoroWidgetProps {
  dndActive: boolean;
  onToggleDnd: () => void;
}

export const PomodoroWidget: React.FC<PomodoroWidgetProps> = ({
  dndActive,
  onToggleDnd,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(25 * 60); // seconds
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [soundscape, setSoundscape] = useState<'none' | 'white_noise' | 'rain'>('none');

  // Web Audio noise generator references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  // Timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            AdvisorService.playChime('focus_complete');
            stopAudioNoise();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // Handle ambient sound generator via Web Audio API
  const startAudioNoise = (type: 'white_noise' | 'rain') => {
    try {
      stopAudioNoise();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate brown/pink/white ambient frequency curve
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'rain') {
          // Brown noise (softer rain/waterfall timbre)
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.5;
        } else {
          // Gentle pink noise
          data[i] = (white + lastOut) * 0.15;
          lastOut = white;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(type === 'rain' ? 800 : 1200, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(0);
      noiseNodeRef.current = noise;
    } catch {
      // Audio context disabled
    }
  };

  const stopAudioNoise = () => {
    try {
      if (noiseNodeRef.current) {
        (noiseNodeRef.current as any).stop?.();
        noiseNodeRef.current.disconnect();
        noiseNodeRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch {
      // Cleanup safe
    }
  };

  const handleToggleTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
      AdvisorService.playChime('focus_start');
      if (soundscape !== 'none') {
        startAudioNoise(soundscape);
      }
    } else {
      setIsRunning(false);
      stopAudioNoise();
    }
  };

  const handleReset = (durationSec: number = selectedDuration) => {
    setIsRunning(false);
    stopAudioNoise();
    setSelectedDuration(durationSec);
    setTimeLeft(durationSec);
  };

  const handleSoundscapeChange = (val: 'none' | 'white_noise' | 'rain') => {
    setSoundscape(val);
    if (isRunning) {
      if (val === 'none') {
        stopAudioNoise();
      } else {
        startAudioNoise(val);
      }
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = ((selectedDuration - timeLeft) / selectedDuration) * 100;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            Temporizador de Enfoque Profundo
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Bloques de concentración con supresión inteligente de distracciones
          </p>
        </div>

        {/* DND Toggle Button */}
        <button
          onClick={onToggleDnd}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
            dndActive
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950 dark:border-indigo-800 dark:text-indigo-300'
              : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
          }`}
          title="Modo No Molestar para bloquear notificaciones irrelevantes"
        >
          {dndActive ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          <span className="whitespace-nowrap">{dndActive ? 'No Molestar: ON' : 'No Molestar: OFF'}</span>
        </button>
      </div>

      {/* Preset duration buttons */}
      <div className="flex items-center gap-2 mb-4">
        {[
          { label: '25m Focus', sec: 25 * 60 },
          { label: '50m Deep Work', sec: 50 * 60 },
          { label: '15m Sprint', sec: 15 * 60 },
          { label: '5m Pausa', sec: 5 * 60 },
        ].map((item) => (
          <button
            key={item.label}
            onClick={() => handleReset(item.sec)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-colors cursor-pointer ${
              selectedDuration === item.sec
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 font-semibold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Timer Display */}
      <div className="flex flex-col items-center justify-center py-4 bg-slate-50/70 dark:bg-slate-850/40 rounded-xl border border-slate-200/80 dark:border-slate-800 mb-4">
        <div className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums">
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>

        {/* Progress bar line */}
        <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-slate-900 dark:bg-slate-100 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleToggleTimer}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isRunning ? 'Pausar' : 'Comenzar Enfoque'}</span>
          </button>

          <button
            onClick={() => handleReset()}
            className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Reiniciar temporizador"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ambient Soundscapes */}
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <Volume2 className="w-3.5 h-3.5" />
          Ambiente acústico:
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSoundscapeChange('none')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
              soundscape === 'none'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Silencio
          </button>
          <button
            onClick={() => handleSoundscapeChange('rain')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
              soundscape === 'rain'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Lluvia Suave
          </button>
          <button
            onClick={() => handleSoundscapeChange('white_noise')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
              soundscape === 'white_noise'
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Ruido Rosa
          </button>
        </div>
      </div>
    </div>
  );
};
