// Service for Browser Notification API, Proactive Task Reminders, and Service Worker Sync
import { Task, UserSettings } from '../types';
import { AdvisorService } from './advisor';

export interface TaskReminderPayload {
  id: string; // unique reminder key: `${taskId}_${reminderMinutes}`
  taskId: string;
  title: string;
  body: string;
  triggerAt: number; // Unix timestamp in ms
  taskDate: string;
  taskStartTime: string;
  priority: string;
  category: string;
  reminderMinutes: number;
}

export interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  actions?: Array<{ action: string; title: string; icon?: string }>;
  taskId?: string;
  url?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
}

const NOTIFIED_CACHE_KEY = 'khoros_notified_reminders_v1';

export class NotificationService {
  private static registeredServiceWorker: ServiceWorkerRegistration | null = null;

  /**
   * Check if Notification API is supported by the current browser environment
   */
  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get current notification permission state
   */
  public static getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request permission from the user to show native system notifications
   */
  public static async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn('[NotificationService] Error requesting permission:', err);
      return Notification.permission;
    }
  }

  /**
   * Get or initialize the active ServiceWorkerRegistration
   */
  public static async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.registeredServiceWorker) {
      return this.registeredServiceWorker;
    }

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        this.registeredServiceWorker = reg;
        return reg;
      } catch (err) {
        console.warn('[NotificationService] ServiceWorker not ready:', err);
      }
    }
    return null;
  }

  /**
   * Read the set of reminder keys that have already been fired to prevent duplicate alerts
   */
  private static getNotifiedKeys(): Set<string> {
    try {
      const data = localStorage.getItem(NOTIFIED_CACHE_KEY);
      if (data) {
        return new Set(JSON.parse(data));
      }
    } catch (e) {
      console.warn('[NotificationService] Failed to read notified cache', e);
    }
    return new Set<string>();
  }

  /**
   * Mark a reminder key as fired
   */
  private static markKeyAsNotified(key: string): void {
    try {
      const set = this.getNotifiedKeys();
      set.add(key);
      // Keep cache size bounded to last 200 alerts
      const arr = Array.from(set).slice(-200);
      localStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(arr));
    } catch (e) {
      console.warn('[NotificationService] Failed to write notified cache', e);
    }
  }

  /**
   * Build human-readable reminder message for a task
   */
  public static createReminderPayload(task: Task, minutesBefore: number = task.reminderMinutesBefore): TaskReminderPayload {
    const [year, month, day] = task.date.split('-').map(Number);
    const [hour, minute] = task.startTime.split(':').map(Number);
    const targetDate = new Date(year, month - 1, day, hour, minute, 0, 0);

    const triggerAt = targetDate.getTime() - minutesBefore * 60 * 1000;
    const reminderId = `${task.id}_${minutesBefore}`;

    const priorityLabel = task.priority === 'p1' ? '🔴 [P1 Alta]' : task.priority === 'p2' ? '🟡 [P2 Media]' : '⚪ [P3 Baja]';
    const timingText = minutesBefore === 0
      ? `¡Comienza ahora a las ${task.startTime}!`
      : `Comienza en ${minutesBefore} min (${task.startTime})`;

    const bodyParts: string[] = [
      `${priorityLabel} ${timingText}`,
      `Duración: ${task.durationMinutes} min`,
    ];
    if (task.description) {
      bodyParts.push(task.description.length > 80 ? `${task.description.slice(0, 77)}...` : task.description);
    }

    return {
      id: reminderId,
      taskId: task.id,
      title: `⏰ Recordatorio: ${task.title}`,
      body: bodyParts.join(' · '),
      triggerAt,
      taskDate: task.date,
      taskStartTime: task.startTime,
      priority: task.priority,
      category: task.category,
      reminderMinutes: minutesBefore,
    };
  }

  /**
   * Calculate all upcoming task reminders for active tasks
   */
  public static calculateUpcomingReminders(tasks: Task[]): TaskReminderPayload[] {
    const now = Date.now();
    const reminders: TaskReminderPayload[] = [];
    const notified = this.getNotifiedKeys();

    tasks.forEach((task) => {
      // Skip completed or deferred tasks
      if (task.status === 'completed' || task.status === 'deferred') return;

      const [year, month, day] = task.date.split('-').map(Number);
      const [hour, minute] = task.startTime.split(':').map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) return;

      const targetDate = new Date(year, month - 1, day, hour, minute, 0, 0);
      const targetTime = targetDate.getTime();
      const minutesBefore = typeof task.reminderMinutesBefore === 'number' ? task.reminderMinutesBefore : 10;
      const triggerAt = targetTime - minutesBefore * 60 * 1000;

      const reminderKey = `${task.id}_${minutesBefore}`;

      // Only schedule if reminder is in future or within a recent 3-minute grace window, and not already fired
      if (triggerAt > now - 3 * 60 * 1000 && !notified.has(reminderKey)) {
        reminders.push(this.createReminderPayload(task, minutesBefore));
      }
    });

    return reminders;
  }

  /**
   * Sync active schedule with the Service Worker so background reminders can fire even if the tab is inactive
   */
  public static async syncScheduleWithServiceWorker(tasks: Task[]): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const reg = await this.getServiceWorkerRegistration();
      const upcoming = this.calculateUpcomingReminders(tasks);

      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SCHEDULE_REMINDERS',
          reminders: upcoming,
        });
      } else if (reg && reg.active) {
        reg.active.postMessage({
          type: 'SCHEDULE_REMINDERS',
          reminders: upcoming,
        });
      }
    } catch (err) {
      console.warn('[NotificationService] Failed to sync schedule with Service Worker:', err);
    }
  }

  /**
   * Send a system notification using ServiceWorkerRegistration.showNotification (recommended for PWA)
   * with fallback to new Notification()
   */
  public static async showSystemNotification(
    title: string,
    options: ExtendedNotificationOptions = {}
  ): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    try {
      const reg = await this.getServiceWorkerRegistration();

      const notificationOptions: ExtendedNotificationOptions = {
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
        vibrate: [200, 100, 200],
        silent: false,
        requireInteraction: true,
        tag: options.tag || 'khoros-general-alert',
        renotify: true,
        ...options,
        data: {
          taskId: options.taskId,
          url: options.url || (options.taskId ? `/?taskId=${options.taskId}` : '/'),
          ...options.data,
        },
        actions: options.actions || [
          { action: 'view', title: 'Ver Tarea' },
          { action: 'snooze_5', title: 'Posponer 5m' },
        ],
      };

      if (reg && 'showNotification' in reg) {
        await (reg as any).showNotification(title, notificationOptions);
        return true;
      }

      // Fallback to standard window Notification constructor
      const n = new Notification(title, notificationOptions);
      n.onclick = () => {
        window.focus();
        if (options.taskId) {
          window.location.hash = `task-${options.taskId}`;
        }
        n.close();
      };
      return true;
    } catch (err) {
      console.warn('[NotificationService] Failed to display notification:', err);
      return false;
    }
  }

  /**
   * Send a task reminder immediately and play audio chime if enabled
   */
  public static async fireTaskReminder(
    task: Task,
    minutesBefore: number,
    settings?: UserSettings
  ): Promise<boolean> {
    const payload = this.createReminderPayload(task, minutesBefore);
    const key = payload.id;

    // Check if Do Not Disturb is active
    if (settings?.dndActive) {
      console.log(`[NotificationService] Suppressing reminder for "${task.title}" (Do Not Disturb active)`);
      return false;
    }

    // Play subtle audio chime if enabled
    if (settings?.audioChimesEnabled !== false) {
      AdvisorService.playChime('notification');
    }

    const shown = await this.showSystemNotification(payload.title, {
      body: payload.body,
      tag: `task-${task.id}`,
      taskId: task.id,
      url: `/?taskId=${task.id}`,
      data: { taskId: task.id },
    });

    if (shown) {
      this.markKeyAsNotified(key);
    }

    return shown;
  }

  /**
   * Send an immediate test notification to verify OS-level notification permissions
   */
  public static async sendTestNotification(): Promise<boolean> {
    const perm = await this.requestPermission();
    if (perm !== 'granted') return false;

    AdvisorService.playChime('notification');

    return this.showSystemNotification('🔔 Notificación de prueba activa', {
      body: 'Khoros está configurado para avisarte puntualmente antes de cada bloque de trabajo y reunión.',
      tag: 'test-notification',
      actions: [
        { action: 'ok', title: 'Entendido' },
      ],
    });
  }

  /**
   * Start proactive recurring ticker (runs every 15 seconds)
   * to catch upcoming reminders and sync with background Service Worker
   */
  public static startProactiveScheduler(
    getTasks: () => Task[],
    getSettings: () => UserSettings,
    onOpenTask?: (task: Task) => void
  ): () => void {
    const evaluate = async () => {
      const tasks = getTasks();
      const settings = getSettings();

      if (settings.smartNotifications === false) return;
      if (Notification.permission !== 'granted') return;

      const now = Date.now();
      const notified = this.getNotifiedKeys();

      tasks.forEach((task) => {
        if (task.status === 'completed' || task.status === 'deferred') return;

        const [year, month, day] = task.date.split('-').map(Number);
        const [hour, minute] = task.startTime.split(':').map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) return;

        const targetDate = new Date(year, month - 1, day, hour, minute, 0, 0);
        const targetTime = targetDate.getTime();
        const minutesBefore = typeof task.reminderMinutesBefore === 'number' ? task.reminderMinutesBefore : 10;
        const triggerAt = targetTime - minutesBefore * 60 * 1000;

        const key = `${task.id}_${minutesBefore}`;

        // Fire if we are within the trigger window [triggerAt, triggerAt + 90 seconds]
        if (now >= triggerAt && now <= triggerAt + 90 * 1000 && !notified.has(key)) {
          this.fireTaskReminder(task, minutesBefore, settings);
        }
      });

      // Keep Service Worker informed of upcoming reminders
      this.syncScheduleWithServiceWorker(tasks);
    };

    // Run first check after 2 seconds
    const timeout = setTimeout(evaluate, 2000);

    // Then check every 15 seconds
    const interval = window.setInterval(evaluate, 15000);

    // Also check immediately when tab becomes visible again
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        evaluate();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Listen to messages from Service Worker (e.g. user clicked notification or action)
    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_TASK' && event.data?.taskId && onOpenTask) {
        const found = getTasks().find((t) => t.id === event.data.taskId);
        if (found) {
          onOpenTask(found);
        }
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
    }

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', onSwMessage);
      }
    };
  }

  /**
   * Reset the cache of notified reminders (useful for testing or daily reset)
   */
  public static clearNotifiedHistory(): void {
    try {
      localStorage.removeItem(NOTIFIED_CACHE_KEY);
    } catch (e) {
      console.warn('[NotificationService] Error clearing notified history', e);
    }
  }
}
