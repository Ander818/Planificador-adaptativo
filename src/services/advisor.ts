import { ProductivitySuggestion, Task } from '../types';

export class AdvisorService {
  /**
   * Generates actionable productivity recommendations based on the task distribution
   */
  public static analyzeSchedule(tasks: Task[]): ProductivitySuggestion[] {
    const suggestions: ProductivitySuggestion[] = [];

    // Rule 1: High energy task placed in post-lunch dip (13:30 - 15:30)
    tasks.forEach((t) => {
      const [hour] = t.startTime.split(':').map(Number);
      if (t.energyLevel === 'high' && hour >= 13 && hour <= 15 && t.status !== 'completed') {
        suggestions.push({
          id: `sug-energy-${t.id}`,
          type: 'energy_alignment',
          taskRefId: t.id,
          title: `Optimizar pico cognitivo: "${t.title}"`,
          explanation: `Esta tarea requiere alta energía mental pero está programada a las ${t.startTime} (valle circadiano posprandial). Rendirías un 28% más si la programas entre las 09:00 y las 11:30.`,
          proposedAction: 'Mover a las 09:30 mañana o adelantar a bloque matutino.',
          oldValue: t.startTime,
          newValue: '09:30',
          applied: false,
        });
      }
    });

    // Rule 2: Tasks longer than 90 mins without buffer
    tasks.forEach((t) => {
      if (t.durationMinutes > 90 && t.status !== 'completed') {
        suggestions.push({
          id: `sug-chunk-${t.id}`,
          type: 'break_down',
          taskRefId: t.id,
          title: `Dividir bloque extenso: "${t.title}" (${t.durationMinutes} min)`,
          explanation: `Los bloques continuos mayores a 90 minutos experimentan una caída progresiva de retención y velocidad de ejecución tras el minuto 50.`,
          proposedAction: 'Dividir en 2 sprints de 45 min con 10 min de pausa activa.',
          applied: false,
        });
      }
    });

    // Rule 3: Heavy daily load check
    const totalMinutes = tasks
      .filter((t) => t.status !== 'completed')
      .reduce((acc, curr) => acc + curr.durationMinutes, 0);

    if (totalMinutes > 420) { // > 7 hours planned
      suggestions.push({
        id: 'sug-overload',
        type: 'shift_slot',
        taskRefId: 'global',
        title: 'Alerta de sobrecarga cognitiva diaria',
        explanation: `Tienes ${Math.round(totalMinutes / 60)} horas de pendientes hoy. Las jornadas con más de 6 horas de tareas densas sufren una tasa de abandono del 42%.`,
        proposedAction: 'Diferir 1 o 2 tareas secundarias (P3) al día siguiente para mantener excelencia.',
        applied: false,
      });
    }

    return suggestions;
  }

  /**
   * Play clean synthesized chime using Web Audio API (zero external assets needed)
   */
  public static playChime(type: 'notification' | 'focus_start' | 'focus_complete' | 'alert' = 'notification') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'focus_complete') {
        // Joyful major arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + idx * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.12 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.4);
        });
      } else if (type === 'alert') {
        // Attention dual beep
        [440, 554.37].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.15);
          osc.stop(ctx.currentTime + idx * 0.15 + 0.25);
        });
      } else {
        // Subtle crisp droplet chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // Audio context disabled or suppressed
    }
  }
}
