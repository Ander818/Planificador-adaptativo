import { ScheduleReorganizationPlan, Task, TaskAdjustment } from '../types';

/**
 * Utility functions for time conversions
 */
export const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (totalMinutes: number): string => {
  const normalized = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export class ReschedulerService {
  /**
   * Generates a smart reorganization plan when an unexpected delay or change occurs.
   * @param currentTasks Today's task list
   * @param delayMinutes How many minutes of delay or push occurred
   * @param reason What happened (e.g., "Reunión extendida", "Tráfico inesperado", "Urgencia técnica")
   * @param currentTimeStr Reference time from which tasks get shifted (default: now or first uncompleted task)
   * @param workdayEndCutoff Workday closing time (e.g., "18:30")
   */
  public static generatePlan(
    currentTasks: Task[],
    delayMinutes: number,
    reason: string,
    currentTimeStr: string = '11:00',
    workdayEndCutoff: string = '18:30'
  ): ScheduleReorganizationPlan {
    const referenceMinutes = timeToMinutes(currentTimeStr);
    const cutoffMinutes = timeToMinutes(workdayEndCutoff);

    // Only process pending or in_progress tasks for today
    const upcomingTasks = currentTasks
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const adjustments: TaskAdjustment[] = [];
    let currentCursor = referenceMinutes + delayMinutes;
    let deferredCount = 0;
    let shiftedCount = 0;

    for (const task of upcomingTasks) {
      const taskStartMin = timeToMinutes(task.startTime);

      // If task already started before the incident, leave it
      if (taskStartMin < referenceMinutes) {
        continue;
      }

      // If task is locked (e.g. fixed external client meeting)
      if (task.isLockedTime) {
        // We cannot move this task. We advance the cursor to after this fixed meeting.
        const taskEndMin = taskStartMin + task.durationMinutes;
        if (taskStartMin < currentCursor) {
          // Conflict: delay collides with locked event!
          // We must shift our cursor to after the locked meeting
          currentCursor = Math.max(currentCursor, taskEndMin + 10);
        } else {
          // No collision; cursor can fit before or aligns with it
          currentCursor = Math.max(currentCursor, taskEndMin + 10);
        }
        continue;
      }

      const calculatedStartMin = Math.max(taskStartMin + delayMinutes, currentCursor);
      const calculatedEndMin = calculatedStartMin + task.durationMinutes;

      // Check if new time overflows the workday cutoff and is low priority
      if (calculatedEndMin > cutoffMinutes && (task.priority === 'p3' || (task.priority === 'p2' && task.energyLevel === 'low'))) {
        adjustments.push({
          taskId: task.id,
          taskTitle: task.title,
          oldStartTime: task.startTime,
          newStartTime: 'Mañana 09:00',
          action: 'deferred_to_tomorrow',
          reason: `Evitar sobrecarga laboral post ${workdayEndCutoff}. Se reprograma automáticamente al primer bloque disponible de mañana.`,
        });
        deferredCount++;
      } else {
        const newTimeStr = minutesToTime(calculatedStartMin);
        adjustments.push({
          taskId: task.id,
          taskTitle: task.title,
          oldStartTime: task.startTime,
          newStartTime: newTimeStr,
          action: 'shifted',
          reason: `Desplazado ${delayMinutes} min para absorber el retraso por "${reason}".`,
        });
        shiftedCount++;
        currentCursor = calculatedStartMin + task.durationMinutes + 10; // 10 min healthy transition buffer
      }
    }

    const impactSummary = deferredCount > 0
      ? `Se reorganizaron ${shiftedCount} tareas manteniendo descansos y se postergó ${deferredCount} tarea(s) secundaria(s) a mañana para proteger tu descanso.`
      : `Se recalibraron ${shiftedCount} tareas sin solapamientos, garantizando la finalización dentro de tu jornada habitual.`;

    return {
      delayMinutes,
      inconvenienceReason: reason,
      adjustments,
      impactSummary,
    };
  }

  /**
   * Applies the reorganization plan directly to the tasks array
   */
  public static applyPlan(tasks: Task[], plan: ScheduleReorganizationPlan): Task[] {
    const adjMap = new Map<string, TaskAdjustment>();
    plan.adjustments.forEach((adj) => adjMap.set(adj.taskId, adj));

    return tasks.map((t) => {
      const adj = adjMap.get(t.id);
      if (!adj) return t;

      if (adj.action === 'deferred_to_tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        return {
          ...t,
          date: tomorrowStr,
          startTime: '09:30',
          status: 'deferred',
          description: `${t.description || ''} [Reorganizado automáticamente desde ayer]`.trim(),
        };
      }

      if (adj.action === 'shifted') {
        return {
          ...t,
          startTime: adj.newStartTime,
        };
      }

      return t;
    });
  }
}
