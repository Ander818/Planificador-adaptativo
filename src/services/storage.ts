import { Goal, Habit, ProductivitySuggestion, Task, TaskCategory, TaskTemplate, UserSettings, WidgetSetting } from '../types';

const STORAGE_KEYS = {
  TASKS: 'khoros_tasks_v1',
  GOALS: 'khoros_goals_v1',
  HABITS: 'khoros_habits_v1',
  WIDGETS: 'khoros_widgets_v1',
  SETTINGS: 'khoros_settings_v1',
  SUGGESTIONS: 'khoros_suggestions_v1',
  TEMPLATES: 'khoros_templates_v1',
};

const getTodayString = (): string => {
  const d = new Date();
  return d.toISOString().split('T')[0];
};

const getRelativeDateString = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

export const DEFAULT_WIDGETS: WidgetSetting[] = [
  { id: 'rescheduler', name: 'Reorganizador Dinámico de Agenda', enabled: true, order: 1 },
  { id: 'monthly_calendar', name: 'Calendario Mensual Interactivo', enabled: true, order: 2 },
  { id: 'timeline', name: 'Cronograma Diario & Bloques', enabled: true, order: 3 },
  { id: 'quick_tasks', name: 'Matriz de Prioridades & Tareas', enabled: true, order: 4 },
  { id: 'pomodoro', name: 'Temporizador de Enfoque Profundo', enabled: true, order: 5 },
  { id: 'goals', name: 'Metas & Objetivos Clave', enabled: true, order: 6 },
  { id: 'habits', name: 'Rastreador de Hábitos', enabled: true, order: 7 },
  { id: 'metrics', name: 'Métricas & Resumen Semanal', enabled: true, order: 8 },
];

export const DEFAULT_CATEGORY_COLORS: Record<TaskCategory, string> = {
  deep_work: '#6366f1', // Indigo
  meetings: '#f59e0b',  // Amber
  admin: '#64748b',     // Slate
  learning: '#a855f7',  // Purple
  health: '#10b981',    // Emerald
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  accentColor: 'indigo',
  e2eeEnabled: true,
  vaultUnlocked: true,
  dndActive: false,
  cloudSyncEnabled: true,
  lastSyncTime: 'Recién sincronizado',
  deviceId: 'Dispositivo Principal (Web Client)',
  workdayStart: '08:30',
  workdayEnd: '18:30',
  smartNotifications: true,
  audioChimesEnabled: true,
  categoryColors: DEFAULT_CATEGORY_COLORS,
  autoTagSuggestions: true,
};

const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Arquitectura y modelado de datos para informe Q4',
    description: 'Definir esquemas relacionales, dependencias críticas y resumen ejecutivo.',
    category: 'deep_work',
    priority: 'p1',
    status: 'in_progress',
    date: getTodayString(),
    startTime: '09:00',
    durationMinutes: 90,
    energyLevel: 'high',
    reminderMinutesBefore: 10,
    tags: ['Estrategia', 'Q4'],
    isLockedTime: false,
  },
  {
    id: 'task-2',
    title: 'Sincronización con equipo de diseño y producto',
    description: 'Revisión de prototipos de experiencia de usuario y validación de criterios.',
    category: 'meetings',
    priority: 'p2',
    status: 'pending',
    date: getTodayString(),
    startTime: '11:00',
    durationMinutes: 45,
    energyLevel: 'medium',
    reminderMinutesBefore: 15,
    tags: ['Reunión', 'Diseño'],
    isLockedTime: true, // Fixed commitment
  },
  {
    id: 'task-3',
    title: 'Almuerzo consciente y caminata de desconexión',
    description: 'Pausa para recuperar foco y recarga cognitiva.',
    category: 'health',
    priority: 'p3',
    status: 'pending',
    date: getTodayString(),
    startTime: '12:00',
    durationMinutes: 60,
    energyLevel: 'low',
    reminderMinutesBefore: 5,
    tags: ['Salud', 'Recarga'],
    isLockedTime: false,
  },
  {
    id: 'task-4',
    title: 'Depuración y optimización de rendimiento de pipelines',
    description: 'Resolver cuellos de botella en procesamiento asíncrono y consultas lentas.',
    category: 'deep_work',
    priority: 'p1',
    status: 'pending',
    date: getTodayString(),
    startTime: '13:30',
    durationMinutes: 105,
    energyLevel: 'high',
    reminderMinutesBefore: 15,
    tags: ['Ingeniería', 'Performance'],
    isLockedTime: false,
  },
  {
    id: 'task-5',
    title: 'Responder correos pendientes y tramitar facturación',
    description: 'Revisar bandeja de entrada, contestar clientes y confirmar comprobantes.',
    category: 'admin',
    priority: 'p3',
    status: 'pending',
    date: getTodayString(),
    startTime: '15:30',
    durationMinutes: 45,
    energyLevel: 'low',
    reminderMinutesBefore: 10,
    tags: ['Administración'],
    isLockedTime: false,
  },
  {
    id: 'task-6',
    title: 'Lectura de artículo de sistemas distribuidos y toma de notas',
    description: 'Estudio de caso sobre consistencia eventual y tolerancia a particiones.',
    category: 'learning',
    priority: 'p2',
    status: 'pending',
    date: getTodayString(),
    startTime: '16:30',
    durationMinutes: 60,
    energyLevel: 'medium',
    reminderMinutesBefore: 10,
    tags: ['Aprendizaje'],
    isLockedTime: false,
  },
  {
    id: 'task-7',
    title: 'Planificación de sprint y refinamiento de backlog',
    description: 'Desglosar historias de usuario para el ciclo de desarrollo siguiente.',
    category: 'meetings',
    priority: 'p1',
    status: 'pending',
    date: getRelativeDateString(1),
    startTime: '10:00',
    durationMinutes: 60,
    energyLevel: 'high',
    reminderMinutesBefore: 15,
    tags: ['Sprint', 'Producto'],
    isLockedTime: true,
  },
  {
    id: 'task-8',
    title: 'Auditoría de seguridad y cifrado cliente WebCrypto',
    description: 'Validar firmas y rotación de claves en bóveda AES-GCM.',
    category: 'deep_work',
    priority: 'p1',
    status: 'pending',
    date: getRelativeDateString(2),
    startTime: '11:00',
    durationMinutes: 90,
    energyLevel: 'high',
    reminderMinutesBefore: 10,
    tags: ['Seguridad', 'Cripto'],
    isLockedTime: false,
  },
  {
    id: 'task-9',
    title: 'Revisión mensual de métricas y OKRs de ingeniería',
    description: 'Presentación ejecutiva sobre tiempos de entrega y cobertura de tests.',
    category: 'admin',
    priority: 'p2',
    status: 'pending',
    date: getRelativeDateString(4),
    startTime: '14:00',
    durationMinutes: 45,
    energyLevel: 'medium',
    reminderMinutesBefore: 10,
    tags: ['Métricas', 'OKRs'],
    isLockedTime: false,
  },
  {
    id: 'task-10',
    title: 'Entrenamiento funcional y descanso activo',
    description: 'Sesión aeróbica programada para salud cardiovascular.',
    category: 'health',
    priority: 'p3',
    status: 'completed',
    date: getRelativeDateString(-1),
    startTime: '08:00',
    durationMinutes: 45,
    energyLevel: 'high',
    reminderMinutesBefore: 5,
    tags: ['Salud', 'Hábito'],
    isLockedTime: false,
  },
  {
    id: 'task-11',
    title: 'Exploración de Service Workers y Background Sync API',
    description: 'Prototipado de sincronización de notificaciones offline.',
    category: 'learning',
    priority: 'p2',
    status: 'completed',
    date: getRelativeDateString(-2),
    startTime: '16:00',
    durationMinutes: 75,
    energyLevel: 'medium',
    reminderMinutesBefore: 10,
    tags: ['I+D', 'WebAPI'],
    isLockedTime: false,
  },
  {
    id: 'task-12',
    title: 'Demo de entrega a clientes y feedback de stakeholders',
    description: 'Demostración de los nuevos flujos de calendario interactivo y widgets.',
    category: 'meetings',
    priority: 'p1',
    status: 'pending',
    date: getRelativeDateString(7),
    startTime: '15:00',
    durationMinutes: 60,
    energyLevel: 'high',
    reminderMinutesBefore: 15,
    tags: ['Demo', 'Clientes'],
    isLockedTime: true,
  },
];

const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal-1',
    title: 'Completar lanzamiento del nuevo producto Q4',
    category: 'deep_work',
    targetDate: '2026-11-15',
    progress: 68,
    milestones: [
      { id: 'm1', title: 'Diseñar arquitectura escalable', completed: true },
      { id: 'm2', title: 'Pruebas de estrés y seguridad E2EE', completed: true },
      { id: 'm3', title: 'Validación de usuarios piloto', completed: false },
      { id: 'm4', title: 'Despliegue a producción', completed: false },
    ],
    notes: 'Priorizar estabilidad y experiencia offline de primera clase.',
  },
  {
    id: 'goal-2',
    title: 'Mantener 18 horas semanales de Enfoque Profundo',
    category: 'learning',
    targetDate: '2026-12-31',
    progress: 82,
    milestones: [
      { id: 'm5', title: 'Bloques matutinos sin notificaciones', completed: true },
      { id: 'm6', title: 'Restringir reuniones a las tardes', completed: true },
      { id: 'm7', title: 'Auditoría semanal de interrupciones', completed: false },
    ],
    notes: 'Meta continua de productividad personal.',
  },
  {
    id: 'goal-3',
    title: 'Condición física: 4 entrenamientos por semana',
    category: 'health',
    targetDate: '2026-10-31',
    progress: 75,
    milestones: [
      { id: 'm8', title: 'Semana 1: 4 sesiones cumplidas', completed: true },
      { id: 'm9', title: 'Semana 2: 4 sesiones cumplidas', completed: true },
      { id: 'm10', title: 'Semana 3: 3 sesiones en curso', completed: false },
    ],
    notes: 'Hidratación óptima y descanso mínimo de 7.5 horas diarias.',
  },
];

const INITIAL_HABITS: Habit[] = [
  {
    id: 'habit-1',
    title: 'Planificación de 10 min al iniciar el día',
    category: 'admin',
    frequency: 'daily',
    streak: 14,
    completedDates: [getTodayString()],
  },
  {
    id: 'habit-2',
    title: 'Bloque de Deep Work sin distracciones',
    category: 'deep_work',
    frequency: 'weekdays',
    streak: 9,
    completedDates: [getTodayString()],
  },
  {
    id: 'habit-3',
    title: '2 litros de agua y estiramientos',
    category: 'health',
    frequency: 'daily',
    streak: 21,
    completedDates: [getTodayString()],
  },
  {
    id: 'habit-4',
    title: 'Lectura formativa (20 min)',
    category: 'learning',
    frequency: 'daily',
    streak: 5,
    completedDates: [],
  },
];

const INITIAL_SUGGESTIONS: ProductivitySuggestion[] = [
  {
    id: 'sug-1',
    type: 'shift_slot',
    taskRefId: 'task-4',
    title: 'Adelantar bloque cognitivo pesado',
    explanation: 'Tus registros muestran un 24% más de rendimiento en tareas de ingeniería antes de las 14:00.',
    proposedAction: 'Alinear horario de trabajo profundo a tu pico de energía matutino.',
    oldValue: '13:30',
    newValue: '10:00',
    applied: false,
  },
  {
    id: 'sug-2',
    type: 'buffer_needed',
    taskRefId: 'task-2',
    title: 'Margen de amortiguación post-reunión',
    explanation: 'Las reuniones de producto suelen extenderse 10-15 minutos. Conviene añadir un colchón.',
    proposedAction: 'Añadir 15 minutos de amortiguación para evitar retrasos en cadena.',
    applied: false,
  },
];

export class StorageService {
  public static getTasks(): Task[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (data) return JSON.parse(data);
      this.saveTasks(INITIAL_TASKS);
      return INITIAL_TASKS;
    } catch {
      return INITIAL_TASKS;
    }
  }

  public static saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      this.touchSync();
    } catch (e) {
      console.warn('Error saving tasks to local storage', e);
    }
  }

  public static getGoals(): Goal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GOALS);
      if (data) return JSON.parse(data);
      this.saveGoals(INITIAL_GOALS);
      return INITIAL_GOALS;
    } catch {
      return INITIAL_GOALS;
    }
  }

  public static saveGoals(goals: Goal[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
      this.touchSync();
    } catch (e) {
      console.warn('Error saving goals', e);
    }
  }

  public static getHabits(): Habit[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HABITS);
      if (data) return JSON.parse(data);
      this.saveHabits(INITIAL_HABITS);
      return INITIAL_HABITS;
    } catch {
      return INITIAL_HABITS;
    }
  }

  public static saveHabits(habits: Habit[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
      this.touchSync();
    } catch (e) {
      console.warn('Error saving habits', e);
    }
  }

  public static getWidgets(): WidgetSetting[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WIDGETS);
      if (data) {
        const parsed: WidgetSetting[] = JSON.parse(data);
        const existingIds = new Set(parsed.map((w) => w.id));
        const missing = DEFAULT_WIDGETS.filter((dw) => !existingIds.has(dw.id));
        if (missing.length > 0) {
          const merged = [...parsed, ...missing];
          this.saveWidgets(merged);
          return merged;
        }
        return parsed;
      }
      this.saveWidgets(DEFAULT_WIDGETS);
      return DEFAULT_WIDGETS;
    } catch {
      return DEFAULT_WIDGETS;
    }
  }

  public static saveWidgets(widgets: WidgetSetting[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.WIDGETS, JSON.stringify(widgets));
    } catch (e) {
      console.warn('Error saving widgets', e);
    }
  }

  public static getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          categoryColors: {
            ...DEFAULT_CATEGORY_COLORS,
            ...(parsed.categoryColors || {}),
          },
        };
      }
      this.saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static saveSettings(settings: UserSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Error saving settings', e);
    }
  }

  public static getSuggestions(): ProductivitySuggestion[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUGGESTIONS);
      if (data) return JSON.parse(data);
      this.saveSuggestions(INITIAL_SUGGESTIONS);
      return INITIAL_SUGGESTIONS;
    } catch {
      return INITIAL_SUGGESTIONS;
    }
  }

  public static saveSuggestions(sug: ProductivitySuggestion[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SUGGESTIONS, JSON.stringify(sug));
    } catch (e) {
      console.warn('Error saving suggestions', e);
    }
  }

  private static touchSync(): void {
    const settings = this.getSettings();
    if (settings.cloudSyncEnabled) {
      settings.lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }
  }

  public static getTemplates(): TaskTemplate[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      if (data) return JSON.parse(data);
      this.saveTemplates(INITIAL_TEMPLATES);
      return INITIAL_TEMPLATES;
    } catch {
      return INITIAL_TEMPLATES;
    }
  }

  public static saveTemplates(templates: TaskTemplate[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
      this.touchSync();
    } catch (e) {
      console.warn('Error saving templates', e);
    }
  }

  public static addTemplate(template: TaskTemplate): void {
    const list = this.getTemplates();
    const updated = [template, ...list];
    this.saveTemplates(updated);
  }

  public static deleteTemplate(templateId: string): void {
    const list = this.getTemplates();
    const updated = list.filter((t) => t.id !== templateId);
    this.saveTemplates(updated);
  }

  public static exportFullDataBackup(): string {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tasks: this.getTasks(),
      goals: this.getGoals(),
      habits: this.getHabits(),
      templates: this.getTemplates(),
      settings: this.getSettings(),
      widgets: this.getWidgets(),
    };
    return JSON.stringify(backup, null, 2);
  }

  public static importFullDataBackup(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.tasks) this.saveTasks(data.tasks);
      if (data.goals) this.saveGoals(data.goals);
      if (data.habits) this.saveHabits(data.habits);
      if (data.templates) this.saveTemplates(data.templates);
      if (data.settings) this.saveSettings(data.settings);
      if (data.widgets) this.saveWidgets(data.widgets);
      return true;
    } catch {
      return false;
    }
  }
}

export const INITIAL_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tpl-morning-routine',
    name: 'Rutina Matutina de Alto Rendimiento',
    description: 'Secuencia óptima de 3 horas para arrancar el día con máxima claridad y foco.',
    tagline: 'Planificación + 90m Deep Work + Recarga',
    isCustom: false,
    tasks: [
      {
        title: 'Planificación de objetivos del día & triage de inbox',
        description: 'Definir 1 prioridad crítica P1 y revisar mensajes prioritarios.',
        category: 'admin',
        priority: 'p2',
        durationMinutes: 15,
        energyLevel: 'medium',
        reminderMinutesBefore: 5,
        tags: ['Rutina', 'Arranque'],
        isLockedTime: false,
      },
      {
        title: 'Bloque ininterrumpido de Enfoque Profundo (Deep Work)',
        description: 'Avanzar en el entregable o arquitectura de mayor impacto cognitivo.',
        category: 'deep_work',
        priority: 'p1',
        durationMinutes: 90,
        energyLevel: 'high',
        reminderMinutesBefore: 10,
        tags: ['Deep Work', 'Foco'],
        isLockedTime: false,
      },
      {
        title: 'Pausa activa, hidratación y estiramientos',
        description: 'Recuperación cognitiva fuera de pantallas para sostener la energía.',
        category: 'health',
        priority: 'p3',
        durationMinutes: 15,
        energyLevel: 'low',
        reminderMinutesBefore: 0,
        tags: ['Salud', 'Recarga'],
        isLockedTime: false,
      },
      {
        title: 'Ejecución y consolidación de avances clave',
        description: 'Completar tareas asociadas al entregable principal de la jornada.',
        category: 'deep_work',
        priority: 'p2',
        durationMinutes: 60,
        energyLevel: 'high',
        reminderMinutesBefore: 10,
        tags: ['Ejecución'],
        isLockedTime: false,
      },
    ],
  },
  {
    id: 'tpl-friday-wrapup',
    name: 'Sprint de Cierre Semanal (Viernes)',
    description: 'Protocolo para cerrar pendientes, consolidar aprendizajes y dejar lista la semana siguiente.',
    tagline: 'Balance semanal + Limpieza + Plan futuro',
    isCustom: false,
    tasks: [
      {
        title: 'Conciliación de tareas pendientes y balance de métricas',
        description: 'Revisar horas de foco ejecutadas vs planificadas y actualizar metas.',
        category: 'admin',
        priority: 'p2',
        durationMinutes: 45,
        energyLevel: 'medium',
        reminderMinutesBefore: 5,
        tags: ['Cierre', 'Métricas'],
        isLockedTime: false,
      },
      {
        title: 'Retrospectiva personal y lecciones aprendidas',
        description: 'Anotar qué funcionó bien, qué cuellos de botella surgieron y cómo mitigarlos.',
        category: 'learning',
        priority: 'p2',
        durationMinutes: 30,
        energyLevel: 'medium',
        reminderMinutesBefore: 5,
        tags: ['Retrospectiva'],
        isLockedTime: false,
      },
      {
        title: 'Inbox Zero & archivado de documentos de la semana',
        description: 'Limpiar bandeja de entrada y organizar descargas/documentos.',
        category: 'admin',
        priority: 'p3',
        durationMinutes: 30,
        energyLevel: 'low',
        reminderMinutesBefore: 0,
        tags: ['Organización'],
        isLockedTime: false,
      },
      {
        title: 'Planificación preliminar y prioridades del próximo lunes',
        description: 'Configurar los 3 bloques principales para iniciar la semana sin fricción.',
        category: 'deep_work',
        priority: 'p1',
        durationMinutes: 30,
        energyLevel: 'medium',
        reminderMinutesBefore: 5,
        tags: ['Estrategia'],
        isLockedTime: false,
      },
    ],
  },
  {
    id: 'tpl-release-day',
    name: 'Día de Despliegue / Lanzamiento Crítico',
    description: 'Checklist ordenado para lanzamientos y entregas de alto riesgo sin descuidos.',
    tagline: 'Checklist + Sincronización + Despliegue supervisado',
    isCustom: false,
    tasks: [
      {
        title: 'Auditoría de pre-vuelo y verificación de variables de entorno',
        description: 'Revisar migraciones, dependencias y backups de seguridad.',
        category: 'deep_work',
        priority: 'p1',
        durationMinutes: 30,
        energyLevel: 'high',
        reminderMinutesBefore: 10,
        tags: ['Lanzamiento', 'Seguridad'],
        isLockedTime: false,
      },
      {
        title: 'Sincronización de alineación con equipo técnico y soporte',
        description: 'Reunión de confirmación de ventanas de mantenimiento y criterios de rollback.',
        category: 'meetings',
        priority: 'p1',
        durationMinutes: 30,
        energyLevel: 'high',
        reminderMinutesBefore: 15,
        tags: ['Coordinación'],
        isLockedTime: true,
      },
      {
        title: 'Despliegue escalonado a producción y telemetría en vivo',
        description: 'Ejecución del pipeline y observación de tasas de error y latencia.',
        category: 'deep_work',
        priority: 'p1',
        durationMinutes: 75,
        energyLevel: 'high',
        reminderMinutesBefore: 10,
        tags: ['Despliegue', 'Producción'],
        isLockedTime: false,
      },
      {
        title: 'Informe de estado final y comunicación a partes interesadas',
        description: 'Notificar confirmación de release y actualización de documentación.',
        category: 'admin',
        priority: 'p2',
        durationMinutes: 30,
        energyLevel: 'low',
        reminderMinutesBefore: 5,
        tags: ['Comunicación'],
        isLockedTime: false,
      },
    ],
  },
  {
    id: 'tpl-study-session',
    name: 'Sesión de Aprendizaje & Investigación',
    description: 'Bloque estructurado de adquisición de habilidades con práctica deliberada.',
    tagline: 'Lectura técnica + Práctica de código + Notas',
    isCustom: false,
    tasks: [
      {
        title: 'Lectura técnica profunda de documentación / papers',
        description: 'Estudio de conceptos clave y principios de arquitectura sin distracciones.',
        category: 'learning',
        priority: 'p2',
        durationMinutes: 45,
        energyLevel: 'high',
        reminderMinutesBefore: 5,
        tags: ['Estudio', 'Teoría'],
        isLockedTime: false,
      },
      {
        title: 'Práctica deliberada / Prototipado en código',
        description: 'Implementar un prototipo de prueba aplicando lo estudiado.',
        category: 'learning',
        priority: 'p1',
        durationMinutes: 60,
        energyLevel: 'high',
        reminderMinutesBefore: 10,
        tags: ['Práctica', 'Laboratorio'],
        isLockedTime: false,
      },
      {
        title: 'Síntesis en notas atómicas y resumen conceptual',
        description: 'Consolidar notas permanentes en Obsidian o Notion para consulta futura.',
        category: 'learning',
        priority: 'p3',
        durationMinutes: 25,
        energyLevel: 'medium',
        reminderMinutesBefore: 0,
        tags: ['Notas'],
        isLockedTime: false,
      },
    ],
  },
];
