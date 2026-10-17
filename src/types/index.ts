export type TaskPriority = 'p1' | 'p2' | 'p3';
export type TaskCategory = 'deep_work' | 'meetings' | 'admin' | 'learning' | 'health';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deferred';
export type EnergyLevel = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number;
  completedAt?: string;
  energyLevel: EnergyLevel;
  reminderMinutesBefore: number;
  isEncrypted?: boolean;
  tags: string[];
  isLockedTime?: boolean; // Cannot be auto-moved (e.g. client meeting)
}

export interface TemplateTaskItem {
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  durationMinutes: number;
  energyLevel: EnergyLevel;
  reminderMinutesBefore: number;
  tags: string[];
  isLockedTime?: boolean;
  relativeOffsetMinutes?: number; // Minutes from template start time (e.g. 0, 90, 150)
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  tagline?: string;
  tasks: TemplateTaskItem[];
  isCustom?: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  category: TaskCategory;
  targetDate: string;
  progress: number; // 0-100
  milestones: Milestone[];
  notes?: string;
}

export interface Habit {
  id: string;
  title: string;
  category: TaskCategory;
  frequency: 'daily' | 'weekdays';
  streak: number;
  completedDates: string[]; // array of YYYY-MM-DD
}

export interface WidgetSetting {
  id: 'timeline' | 'quick_tasks' | 'goals' | 'pomodoro' | 'habits' | 'rescheduler' | 'metrics' | 'monthly_calendar';
  name: string;
  enabled: boolean;
  order: number;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  accentColor: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  e2eeEnabled: boolean;
  vaultUnlocked: boolean;
  dndActive: boolean;
  dndUntil?: string;
  cloudSyncEnabled: boolean;
  lastSyncTime: string;
  deviceId: string;
  workdayStart: string; // "08:30"
  workdayEnd: string; // "18:00"
  smartNotifications: boolean;
  audioChimesEnabled: boolean;
  categoryColors: Record<TaskCategory, string>;
  autoTagSuggestions?: boolean;
}

export interface TaskAdjustment {
  taskId: string;
  taskTitle: string;
  oldStartTime: string;
  newStartTime: string;
  action: 'shifted' | 'deferred_to_tomorrow' | 'compressed';
  reason: string;
}

export interface ScheduleReorganizationPlan {
  delayMinutes: number;
  inconvenienceReason: string;
  adjustments: TaskAdjustment[];
  impactSummary: string;
}

export interface ProductivitySuggestion {
  id: string;
  type: 'shift_slot' | 'break_down' | 'energy_alignment' | 'buffer_needed';
  taskRefId: string;
  title: string;
  explanation: string;
  proposedAction: string;
  oldValue?: string;
  newValue?: string;
  applied: boolean;
}

export interface DailyWorkloadItem {
  day: string;
  label: string;
  deepWork: number;
  meetings: number;
  admin: number;
  learning: number;
  health: number;
  totalHours: number;
  plannedHours: number;
  completedHours: number;
}

export interface WeeklyProductivityStats {
  weekLabel: string;
  totalPlannedHours: number;
  totalCompletedHours: number;
  completionRatePercent: number;
  deepWorkHours: number;
  tasksCompleted: number;
  tasksTotal: number;
  categoryHours: Record<TaskCategory, number>;
  dailyBreakdown: {
    day: string;
    completed: number;
    planned: number;
    focusMinutes: number;
  }[];
  dailyWorkload: DailyWorkloadItem[];
}
