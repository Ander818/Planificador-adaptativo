import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Clock, 
  Lock, 
  Sparkles, 
  ExternalLink, 
  Layers, 
  Check, 
  Plus, 
  Trash2, 
  ArrowRight,
  Flame,
  BookmarkPlus,
  Zap,
  Mic,
  MicOff,
  Volume2,
  Tag,
  Wand2,
  Bell
} from 'lucide-react';
import { EnergyLevel, Task, TaskCategory, TaskPriority, TaskTemplate, TemplateTaskItem } from '../types';
import { CalendarService } from '../services/calendar';
import { StorageService } from '../services/storage';
import { minutesToTime, timeToMinutes } from '../services/rescheduler';
import { AdvisorService } from '../services/advisor';
import { SpeechService } from '../services/speech';
import { TagSuggesterService } from '../services/tagSuggester';
import { NotificationService } from '../services/notifications';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id'>, existingId?: string) => void;
  onSaveMultiple?: (tasksData: Omit<Task, 'id'>[]) => void;
  editingTask?: Task | null;
  selectedDate: string;
  categoryColors?: Record<TaskCategory, string>;
  existingTasks?: Task[];
  autoTagEnabled?: boolean;
}

const QUICK_PRESETS: { label: string; data: Partial<Task> }[] = [
  {
    label: 'Deep Work 90m',
    data: {
      title: 'Bloque de Enfoque Profundo (Deep Work)',
      category: 'deep_work',
      priority: 'p1',
      durationMinutes: 90,
      energyLevel: 'high',
      reminderMinutesBefore: 10,
      tags: ['Foco', 'Estratégico'],
    },
  },
  {
    label: 'Reunión Sync 30m',
    data: {
      title: 'Sincronización y alineación de equipo',
      category: 'meetings',
      priority: 'p2',
      durationMinutes: 30,
      energyLevel: 'medium',
      reminderMinutesBefore: 10,
      tags: ['Reunión'],
    },
  },
  {
    label: 'Revisión Inbox 25m',
    data: {
      title: 'Triage de bandeja de entrada y respuestas clave',
      category: 'admin',
      priority: 'p3',
      durationMinutes: 25,
      energyLevel: 'low',
      reminderMinutesBefore: 5,
      tags: ['Admin', 'Inbox'],
    },
  },
  {
    label: 'Pausa Activa 15m',
    data: {
      title: 'Caminata de desconexión y recarga cognitiva',
      category: 'health',
      priority: 'p3',
      durationMinutes: 15,
      energyLevel: 'low',
      reminderMinutesBefore: 0,
      tags: ['Salud', 'Recarga'],
    },
  },
  {
    label: 'Lectura Técnica 45m',
    data: {
      title: 'Estudio de documentación técnica y toma de notas',
      category: 'learning',
      priority: 'p2',
      durationMinutes: 45,
      energyLevel: 'high',
      reminderMinutesBefore: 10,
      tags: ['Aprendizaje'],
    },
  },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onSaveMultiple,
  editingTask,
  selectedDate,
  categoryColors,
  existingTasks,
  autoTagEnabled = true,
}) => {
  // Modal mode: single task or template sets
  const [modalMode, setModalMode] = useState<'single' | 'templates'>('single');

  // Single task fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('deep_work');
  const [priority, setPriority] = useState<TaskPriority>('p1');
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('high');
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(15);
  const [isLockedTime, setIsLockedTime] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  // Background Tag Suggestion State
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [tagConfidence, setTagConfidence] = useState<Record<string, number>>({});
  const [sourceKeywords, setSourceKeywords] = useState<Record<string, string[]>>({});
  const [isAnalyzingTags, setIsAnalyzingTags] = useState<boolean>(false);
  const [autoAssignSuggestedTags, setAutoAssignSuggestedTags] = useState<boolean>(true);

  // Voice dictation state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [listeningTarget, setListeningTarget] = useState<'none' | 'smart_task' | 'title' | 'description'>('none');
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Templates state
  const [templates, setTemplates] = useState<TaskTemplate[]>(() => StorageService.getTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-morning-routine');
  const [templateStartTime, setTemplateStartTime] = useState<string>('09:00');
  const [templateDate, setTemplateDate] = useState<string>(selectedDate);
  const [isCreatingCustomTemplate, setIsCreatingCustomTemplate] = useState<boolean>(false);
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [customTemplateDesc, setCustomTemplateDesc] = useState('');
  const [customTemplateTasks, setCustomTemplateTasks] = useState<TemplateTaskItem[]>([
    {
      title: 'Primera tarea de la rutina',
      category: 'deep_work',
      priority: 'p1',
      durationMinutes: 60,
      energyLevel: 'high',
      reminderMinutesBefore: 10,
      tags: ['Rutina'],
      isLockedTime: false,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      setTemplates(StorageService.getTemplates());
      setVoiceError(null);
      setVoiceTranscript('');
    } else {
      stopVoiceRecognition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingTask) {
      setModalMode('single');
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setCategory(editingTask.category);
      setPriority(editingTask.priority);
      setDate(editingTask.date);
      setStartTime(editingTask.startTime);
      setDurationMinutes(editingTask.durationMinutes);
      setEnergyLevel(editingTask.energyLevel);
      setReminderMinutesBefore(editingTask.reminderMinutesBefore);
      setIsLockedTime(!!editingTask.isLockedTime);
      setTagsInput(editingTask.tags.join(', '));
    } else {
      setTitle('');
      setDescription('');
      setCategory('deep_work');
      setPriority('p1');
      setDate(selectedDate || new Date().toISOString().split('T')[0]);
      setStartTime('10:00');
      setDurationMinutes(60);
      setEnergyLevel('high');
      setReminderMinutesBefore(15);
      setIsLockedTime(false);
      setTagsInput('');
      setTemplateDate(selectedDate || new Date().toISOString().split('T')[0]);
      setSuggestedTags([]);
      setIsAnalyzingTags(false);
    }
  }, [editingTask, selectedDate, isOpen]);

  // Background tag processing effect via Web Worker / Service
  useEffect(() => {
    if (!isOpen || modalMode !== 'single' || autoTagEnabled === false) {
      setSuggestedTags([]);
      setIsAnalyzingTags(false);
      return;
    }

    const userTaxonomy = existingTasks ? TagSuggesterService.getAllUserTags(existingTasks) : [];

    const cancel = TagSuggesterService.requestSuggestionsDebounced(
      title,
      description,
      category,
      userTaxonomy,
      (result) => {
        setSuggestedTags(result.suggestedTags);
        setTagConfidence(result.confidence);
        setSourceKeywords(result.sourceKeywords);
        setIsAnalyzingTags(false);
      },
      () => {
        setIsAnalyzingTags(true);
      },
      250
    );

    return () => {
      cancel();
    };
  }, [title, description, category, isOpen, modalMode, existingTasks, autoTagEnabled]);

  const handleAddTag = (tagToAdd: string) => {
    const currentTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (!currentTags.some((t) => t.toLowerCase() === tagToAdd.toLowerCase())) {
      const nextTags = [...currentTags, tagToAdd];
      setTagsInput(nextTags.join(', '));
      AdvisorService.playChime('notification');
    }
  };

  const handleAddAllSuggestedTags = () => {
    const currentTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const merged = [...currentTags];
    for (const st of suggestedTags) {
      if (!merged.some((m) => m.toLowerCase() === st.toLowerCase())) {
        merged.push(st);
      }
    }
    setTagsInput(merged.join(', '));
    AdvisorService.playChime('notification');
  };

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Voice recognition controls
  const startVoiceRecognition = async (target: 'smart_task' | 'title' | 'description') => {
    if (isListening) {
      stopVoiceRecognition();
      return;
    }

    setVoiceError(null);
    setVoiceTranscript('');

    if (!SpeechService.isSupported()) {
      setVoiceError('El reconocimiento de voz no está soportado en este navegador. Puedes escribir manualmente.');
      return;
    }

    try {
      // Prompt user or test audio permission
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop media stream tracks right away since SpeechRecognition manages audio input
          stream.getTracks().forEach((track) => track.stop());
        } catch (err: any) {
          console.warn('Microphone permission status:', err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setVoiceError('Permiso de micrófono denegado. Permite el acceso al micrófono en la barra de direcciones de tu navegador.');
            return;
          }
        }
      }

      const rec = SpeechService.createRecognition('es-ES');
      if (!rec) {
        setVoiceError('No se pudo inicializar el servicio de reconocimiento de voz.');
        return;
      }

      recognitionRef.current = rec;
      setListeningTarget(target);
      setIsListening(true);
      AdvisorService.playChime('focus_start');

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += trans;
          } else {
            interimText += trans;
          }
        }

        const currentText = (finalText || interimText).trim();
        setVoiceTranscript(currentText);

        if (target === 'title') {
          setTitle(currentText);
        } else if (target === 'description') {
          setDescription(currentText);
        } else if (target === 'smart_task') {
          // Live parse speech into fields
          const parsed = SpeechService.parseDictatedTask(currentText);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.startTime) setStartTime(parsed.startTime);
          if (parsed.durationMinutes) setDurationMinutes(parsed.durationMinutes);
          if (parsed.priority) setPriority(parsed.priority);
          if (parsed.category) setCategory(parsed.category);
          if (parsed.energyLevel) setEnergyLevel(parsed.energyLevel);
        }
      };

      rec.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setVoiceError('Permiso de micrófono bloqueado. Por favor habilítalo en la configuración de permisos.');
        } else if (event.error !== 'no-speech') {
          setVoiceError(`Error de reconocimiento de voz: ${event.error}`);
        }
        stopVoiceRecognition();
      };

      rec.onend = () => {
        setIsListening(false);
        setListeningTarget('none');
        AdvisorService.playChime('notification');
      };

      rec.start();
    } catch (e: any) {
      console.error('Error starting speech recognition:', e);
      setVoiceError('Error al iniciar el micrófono.');
      setIsListening(false);
      setListeningTarget('none');
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setListeningTarget('none');
  };

  if (!isOpen) return null;

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const manualTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    // If manual tags are empty and auto-assign is enabled, apply background suggestions
    let finalTags = manualTags;
    if (finalTags.length === 0 && autoAssignSuggestedTags && suggestedTags.length > 0) {
      finalTags = suggestedTags;
    }

    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: editingTask ? editingTask.status : 'pending',
        date,
        startTime,
        durationMinutes: Number(durationMinutes),
        energyLevel,
        reminderMinutesBefore: Number(reminderMinutesBefore),
        tags: finalTags,
        isLockedTime,
        isEncrypted: true,
      },
      editingTask?.id
    );
    onClose();
  };

  const handleApplyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    if (preset.data.title) setTitle(preset.data.title);
    if (preset.data.category) setCategory(preset.data.category);
    if (preset.data.priority) setPriority(preset.data.priority);
    if (preset.data.durationMinutes) setDurationMinutes(preset.data.durationMinutes);
    if (preset.data.energyLevel) setEnergyLevel(preset.data.energyLevel);
    if (preset.data.reminderMinutesBefore !== undefined) setReminderMinutesBefore(preset.data.reminderMinutesBefore);
    if (preset.data.tags) setTagsInput(preset.data.tags.join(', '));
    AdvisorService.playChime('notification');
  };

  const handleSaveCurrentAsTemplate = () => {
    if (!title.trim()) return;
    const newTpl: TaskTemplate = {
      id: `tpl-custom-${Date.now()}`,
      name: `Conjunto: ${title.trim()}`,
      description: description.trim() || 'Plantilla creada a partir de una tarea recurrente.',
      tagline: `${durationMinutes} min · ${category}`,
      isCustom: true,
      tasks: [
        {
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          durationMinutes,
          energyLevel,
          reminderMinutesBefore,
          tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
          isLockedTime,
        },
      ],
    };

    StorageService.addTemplate(newTpl);
    setTemplates(StorageService.getTemplates());
    AdvisorService.playChime('focus_complete');
    alert('¡Plantilla guardada con éxito en tu biblioteca de conjuntos frecuentes!');
  };

  // Insert entire template set with calculated sequential start times
  const handleApplyTemplateSet = () => {
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
    if (!selectedTemplate || selectedTemplate.tasks.length === 0) return;

    let cursorMinutes = timeToMinutes(templateStartTime);
    const tasksToInsert: Omit<Task, 'id'>[] = [];

    selectedTemplate.tasks.forEach((item) => {
      const taskStartStr = minutesToTime(cursorMinutes);

      tasksToInsert.push({
        title: item.title,
        description: item.description || '',
        category: item.category,
        priority: item.priority,
        status: 'pending',
        date: templateDate,
        startTime: taskStartStr,
        durationMinutes: item.durationMinutes,
        energyLevel: item.energyLevel,
        reminderMinutesBefore: item.reminderMinutesBefore,
        tags: [...item.tags, selectedTemplate.name],
        isLockedTime: !!item.isLockedTime,
        isEncrypted: true,
      });

      // advance cursor + 5 min transition buffer
      cursorMinutes += item.durationMinutes + 5;
    });

    if (onSaveMultiple) {
      onSaveMultiple(tasksToInsert);
    } else {
      tasksToInsert.forEach((t) => onSave(t));
    }

    AdvisorService.playChime('focus_complete');
    onClose();
  };

  // Handle adding a subtask to the custom template builder
  const handleAddCustomTaskRow = () => {
    setCustomTemplateTasks([
      ...customTemplateTasks,
      {
        title: '',
        category: 'deep_work',
        priority: 'p2',
        durationMinutes: 45,
        energyLevel: 'medium',
        reminderMinutesBefore: 10,
        tags: [],
        isLockedTime: false,
      },
    ]);
  };

  const handleSaveCustomTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTemplateName.trim()) return;

    const validTasks = customTemplateTasks.filter((t) => t.title.trim().length > 0);
    if (validTasks.length === 0) {
      alert('Añade al menos una tarea con título para tu plantilla.');
      return;
    }

    const newTemplate: TaskTemplate = {
      id: `tpl-user-${Date.now()}`,
      name: customTemplateName.trim(),
      description: customTemplateDesc.trim() || 'Conjunto personalizado de tareas recurrentes.',
      tagline: `${validTasks.length} tareas · Personalizado`,
      isCustom: true,
      tasks: validTasks,
    };

    StorageService.addTemplate(newTemplate);
    const updatedList = StorageService.getTemplates();
    setTemplates(updatedList);
    setSelectedTemplateId(newTemplate.id);
    setIsCreatingCustomTemplate(false);
    setCustomTemplateName('');
    setCustomTemplateDesc('');
    AdvisorService.playChime('focus_complete');
  };

  const handleDeleteTemplate = (tplId: string) => {
    if (confirm('¿Eliminar esta plantilla personalizada?')) {
      StorageService.deleteTemplate(tplId);
      const updated = StorageService.getTemplates();
      setTemplates(updated);
      if (selectedTemplateId === tplId) {
        setSelectedTemplateId(updated[0]?.id || '');
      }
    }
  };

  const handleOpenGoogleCalendar = () => {
    if (!title.trim()) return;
    const dummyTask: Task = {
      id: editingTask?.id || 'new',
      title,
      description,
      category,
      priority,
      status: 'pending',
      date,
      startTime,
      durationMinutes,
      energyLevel,
      reminderMinutesBefore,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    };
    const url = CalendarService.generateGoogleCalendarUrl(dummyTask);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);

  const currentTagsList = tagsInput
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const unselectedSuggestions: string[] = suggestedTags.filter(
    (st) => !currentTagsList.includes(st.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header with Segmented Mode Switcher */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              {editingTask ? 'Editar Tarea' : 'Planificador de Tareas & Conjuntos'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!editingTask && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setModalMode('single')}
                className={`flex-1 py-1.5 rounded-md transition-colors text-center cursor-pointer ${
                  modalMode === 'single'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tarea Individual
              </button>
              <button
                type="button"
                onClick={() => setModalMode('templates')}
                className={`flex-1 py-1.5 rounded-md transition-colors text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalMode === 'templates'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Plantillas de Tareas Frecuentes ({templates.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* MODE 1: SINGLE TASK FORM */}
        {modalMode === 'single' ? (
          <form onSubmit={handleSubmitSingle} className="p-6 space-y-4 overflow-y-auto flex-1">
            
            {/* Smart Full-Task Voice Dictation Banner */}
            {!editingTask && (
              <div
                className={`p-3 rounded-lg border transition-all ${
                  isListening && listeningTarget === 'smart_task'
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-2 rounded-lg flex items-center justify-center transition-colors ${
                        isListening && listeningTarget === 'smart_task'
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <span>Dictar Tarea Completa con Reconocimiento de Voz</span>
                        {isListening && listeningTarget === 'smart_task' && (
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-mono font-medium animate-pulse">
                            ● Escuchando...
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {isListening && listeningTarget === 'smart_task'
                          ? voiceTranscript || 'Habla ahora... Di el título, hora, duración y prioridad'
                          : 'Ej: "Revisar arquitectura técnica a las diez durante una hora prioridad alta"'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => startVoiceRecognition('smart_task')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      isListening && listeningTarget === 'smart_task'
                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200'
                    }`}
                  >
                    {isListening && listeningTarget === 'smart_task' ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Detener</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5" />
                        <span>Activar Micrófono</span>
                      </>
                    )}
                  </button>
                </div>

                {voiceError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
                    {voiceError}
                  </p>
                )}
              </div>
            )}

            {/* Quick Presets Bar */}
            {!editingTask && (
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" />
                  Relleno rápido con tarea frecuente:
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {QUICK_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title with Microphone Dictation Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Título de la tarea
                </label>
                <button
                  type="button"
                  onClick={() => startVoiceRecognition('title')}
                  className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    isListening && listeningTarget === 'title'
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 font-semibold animate-pulse'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Dictar título por voz"
                >
                  {isListening && listeningTarget === 'title' ? (
                    <>
                      <MicOff className="w-3 h-3" />
                      <span>Detener micrófono</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3" />
                      <span>Dictar título</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Análisis de métricas o redacción de especificación técnica..."
                  className={`w-full pl-3.5 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300 ${
                    isListening && listeningTarget === 'title'
                      ? 'border-rose-400 ring-2 ring-rose-300 dark:ring-rose-800'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => startVoiceRecognition('title')}
                  className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors cursor-pointer ${
                    isListening && listeningTarget === 'title'
                      ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Dictar solo el título"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description with Microphone Dictation Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Detalles / Objetivos de ejecución
                </label>
                <button
                  type="button"
                  onClick={() => startVoiceRecognition('description')}
                  className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    isListening && listeningTarget === 'description'
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 font-semibold animate-pulse'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title="Dictar notas o descripción por voz"
                >
                  {isListening && listeningTarget === 'description' ? (
                    <>
                      <MicOff className="w-3 h-3" />
                      <span>Detener micrófono</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3" />
                      <span>Dictar detalles</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Anotaciones, criterios de éxito o enlaces relevantes (puedes dictar con el micrófono)..."
                  className={`w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300 resize-none ${
                    isListening && listeningTarget === 'description'
                      ? 'border-rose-400 ring-2 ring-rose-300 dark:ring-rose-800'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                />
              </div>

              {/* Background Tag Analysis Status */}
              {autoTagEnabled !== false && (
                <div className="mt-1 flex items-center justify-between text-[11px] px-0.5">
                  {isAnalyzingTags ? (
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 font-medium animate-pulse">
                      <Sparkles className="w-3 h-3 animate-spin text-indigo-500" />
                      Analizando descripción en segundo plano para sugerir etiquetas...
                    </span>
                  ) : suggestedTags.length > 0 ? (
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-indigo-500" />
                      <span>
                        <strong className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {suggestedTags.length} etiqueta(s)
                        </strong>{' '}
                        detectada(s) automáticamente
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                      Tip: Describe la tarea para que el motor en segundo plano extraiga etiquetas inteligentes.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Categoría
                  </label>
                  {categoryColors?.[category] && (
                    <span 
                      className="flex items-center gap-1.5 text-[11px] font-medium"
                      style={{ color: categoryColors[category] }}
                    >
                      <span 
                        className="w-2 h-2 rounded-full inline-block border border-black/10 dark:border-white/20"
                        style={{ backgroundColor: categoryColors[category] }}
                      />
                      Color activo
                    </span>
                  )}
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategory)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="deep_work">Enfoque Profundo (Deep Work)</option>
                  <option value="meetings">Reunión / Coordinación</option>
                  <option value="admin">Administrativo / Trámites</option>
                  <option value="learning">Aprendizaje & Lectura</option>
                  <option value="health">Salud & Bienestar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Prioridad
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="p1">P1 - Crítica / Innegociable</option>
                  <option value="p2">P2 - Importante</option>
                  <option value="p3">P3 - Flexible / Secundaria</option>
                </select>
              </div>
            </div>

            {/* Date, Start Time & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Hora de Inicio
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Duración (min)
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums focus:outline-none"
                >
                  <option value={15}>15 min</option>
                  <option value={25}>25 min (Pomodoro)</option>
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min (1 h)</option>
                  <option value={90}>90 min (1.5 h)</option>
                  <option value={120}>120 min (2 h)</option>
                </select>
              </div>
            </div>

            {/* Energy Level & Reminders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Nivel de Energía Requerido
                </label>
                <select
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(e.target.value as EnergyLevel)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value="high">Alta Energía (Pico cognitivo)</option>
                  <option value="medium">Media (Ejecución estándar)</option>
                  <option value="low">Baja (Mecánica / Administrativa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Recordatorio Previo
                </label>
                <select
                  value={reminderMinutesBefore}
                  onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                >
                  <option value={0}>Al comenzar</option>
                  <option value={5}>5 minutos antes</option>
                  <option value={10}>10 minutos antes</option>
                  <option value={15}>15 minutos antes</option>
                  <option value={30}>30 minutos antes</option>
                  <option value={60}>1 hora antes</option>
                </select>
                {/* Proactive browser notification indicator */}
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  {NotificationService.getPermission() === 'granted' ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Bell className="w-3 h-3" />
                      Aviso proactivo activo (Service Worker)
                    </span>
                  ) : (
                    <div className="flex items-center justify-between w-full text-amber-600 dark:text-amber-400">
                      <span>Notificaciones desactivadas</span>
                      <button
                        type="button"
                        onClick={async () => {
                          await NotificationService.requestPermission();
                        }}
                        className="underline hover:text-amber-700 font-medium cursor-pointer"
                      >
                        Habilitar aviso
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inviolable time toggle */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
              <input
                type="checkbox"
                id="lockTime"
                checked={isLockedTime}
                onChange={(e) => setIsLockedTime(e.target.checked)}
                className="rounded text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="lockTime" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <span className="font-semibold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Horario fijo inamovible
                </span>
                <span className="block text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  El Reorganizador Automático de Agenda no desplazará esta tarea en caso de retrasos imprevistos.
                </span>
              </label>
            </div>

            {/* Tags & Background Auto-Suggestions */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Etiquetas (separadas por comas)
                </label>
                {unselectedSuggestions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddAllSuggestedTags}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>Añadir todas ({unselectedSuggestions.length})</span>
                  </button>
                )}
              </div>

              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Q4, Clientes, Arquitectura..."
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-300"
              />

              {/* Suggested Tags Panel Generated by Background Process */}
              {autoTagEnabled !== false && (
                <div className="mt-2.5 p-3 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Sugerencias automáticas según tu descripción:
                    </span>
                    {isAnalyzingTags && (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 animate-pulse font-mono">
                        Analizando en 2º plano...
                      </span>
                    )}
                  </div>

                  {unselectedSuggestions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {unselectedSuggestions.map((tag) => {
                        const conf = tagConfidence[tag] ? Math.round(tagConfidence[tag] * 100) : null;
                        const keywords = sourceKeywords[tag]?.join(', ');
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAddTag(tag)}
                            className="group flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded-md transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
                            title={keywords ? `Detectado por: "${keywords}" (${conf ? `${conf}% confianza` : ''})` : `Añadir etiqueta #${tag}`}
                          >
                            <Plus className="w-3 h-3 text-indigo-500 group-hover:scale-125 transition-transform" />
                            <span>#{tag}</span>
                            {conf && (
                              <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-mono">
                                {conf}%
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      {title.trim() || description.trim()
                        ? 'Todas las etiquetas detectadas por la descripción ya han sido agregadas.'
                        : 'Escribe en el título o detalles de la tarea para recibir sugerencias automáticas de etiquetas.'}
                    </p>
                  )}

                  {/* Auto-assign toggle when empty */}
                  <div className="flex items-center gap-2 pt-1.5 border-t border-indigo-100/60 dark:border-indigo-900/30">
                    <input
                      type="checkbox"
                      id="autoAssignTags"
                      checked={autoAssignSuggestedTags}
                      onChange={(e) => setAutoAssignSuggestedTags(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <label htmlFor="autoAssignTags" className="text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                      Auto-asignar estas sugerencias al guardar si dejas el campo de etiquetas vacío
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleOpenGoogleCalendar}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Calendar</span>
                </button>

                {!editingTask && title.trim() && (
                  <button
                    type="button"
                    onClick={handleSaveCurrentAsTemplate}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-2 px-3 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
                    title="Guardar los datos de esta tarea como plantilla frecuente para reutilizar con un clic"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Guardar como plantilla</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  {editingTask ? 'Guardar Cambios' : 'Programar Tarea'}
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* MODE 2: PREDEFINED TASK SETS / TEMPLATES */
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            
            {/* Top Toolbar: Selection & Date/Time Anchor */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Insertar Conjunto de Tareas Predefinidas
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Programa una rutina completa en bloques secuenciales con un solo clic
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCreatingCustomTemplate(!isCreatingCustomTemplate)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isCreatingCustomTemplate ? 'Cerrar Creador' : 'Crear Mi Propia Plantilla'}</span>
                </button>
              </div>

              {/* Date and Start Time for the entire set */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Fecha de inserción
                  </label>
                  <input
                    type="date"
                    value={templateDate}
                    onChange={(e) => setTemplateDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Hora de inicio del bloque inicial
                  </label>
                  <input
                    type="time"
                    value={templateStartTime}
                    onChange={(e) => setTemplateStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* Custom Template Creator Form (collapsible) */}
            {isCreatingCustomTemplate && (
              <form onSubmit={handleSaveCustomTemplate} className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-200 dark:border-indigo-900/50 space-y-3">
                <h4 className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
                  Diseñar Nueva Plantilla Personalizada
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nombre del conjunto (ej: Rutina de Contenido)
                    </label>
                    <input
                      type="text"
                      required
                      value={customTemplateName}
                      onChange={(e) => setCustomTemplateName(e.target.value)}
                      placeholder="Nombre de la plantilla..."
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Breve descripción
                    </label>
                    <input
                      type="text"
                      value={customTemplateDesc}
                      onChange={(e) => setCustomTemplateDesc(e.target.value)}
                      placeholder="Para días de grabación y edición..."
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Tareas que componen esta plantilla:
                  </label>
                  {customTemplateTasks.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
                      <span className="font-mono text-slate-400 text-[11px]">{idx + 1}.</span>
                      <input
                        type="text"
                        required
                        value={t.title}
                        onChange={(e) => {
                          const copy = [...customTemplateTasks];
                          copy[idx].title = e.target.value;
                          setCustomTemplateTasks(copy);
                        }}
                        placeholder="Título de la tarea..."
                        className="flex-1 px-2 py-1 bg-transparent border-b border-slate-200 dark:border-slate-700 text-xs focus:outline-none"
                      />
                      <select
                        value={t.durationMinutes}
                        onChange={(e) => {
                          const copy = [...customTemplateTasks];
                          copy[idx].durationMinutes = Number(e.target.value);
                          setCustomTemplateTasks(copy);
                        }}
                        className="px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono"
                      >
                        <option value={15}>15m</option>
                        <option value={30}>30m</option>
                        <option value={45}>45m</option>
                        <option value={60}>60m</option>
                        <option value={90}>90m</option>
                      </select>
                      <select
                        value={t.category}
                        onChange={(e) => {
                          const copy = [...customTemplateTasks];
                          copy[idx].category = e.target.value as TaskCategory;
                          setCustomTemplateTasks(copy);
                        }}
                        className="px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                      >
                        <option value="deep_work">Deep Work</option>
                        <option value="meetings">Reunión</option>
                        <option value="admin">Admin</option>
                        <option value="learning">Aprendizaje</option>
                        <option value="health">Salud</option>
                      </select>
                      {customTemplateTasks.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomTemplateTasks(customTemplateTasks.filter((_, i) => i !== idx));
                          }}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddCustomTaskRow}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Añadir otra tarea a la secuencia</span>
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                    >
                      Guardar Plantilla
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Template Selector Cards */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                Selecciona una plantilla de tareas
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {templates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  const totalMin = tpl.tasks.reduce((acc, curr) => acc + curr.durationMinutes, 0);

                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all relative ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold truncate pr-4">{tpl.name}</p>
                        {tpl.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(tpl.id);
                            }}
                            className={`p-0.5 rounded transition-colors ${
                              isSelected ? 'text-white/60 hover:text-white' : 'text-slate-400 hover:text-rose-500'
                            }`}
                            title="Eliminar plantilla personalizada"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <p
                        className={`text-[11px] mt-0.5 line-clamp-1 ${
                          isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {tpl.description}
                      </p>

                      <div
                        className={`flex items-center gap-2 text-[10px] font-mono tabular-nums mt-2 ${
                          isSelected ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        <span>{tpl.tasks.length} tareas</span>
                        <span aria-hidden="true">·</span>
                        <span>{Math.round(totalMin / 60 * 10) / 10}h total</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Template Sequence Preview */}
            {activeTemplate && (
              <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-800/20 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    Vista previa de la secuencia calculada ({activeTemplate.tasks.length} tareas)
                  </p>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Inicio programado: {templateStartTime}
                  </span>
                </div>

                <div className="space-y-2">
                  {(() => {
                    let cursor = timeToMinutes(templateStartTime);
                    return activeTemplate.tasks.map((taskItem, idx) => {
                      const startStr = minutesToTime(cursor);
                      const endStr = minutesToTime(cursor + taskItem.durationMinutes);
                      cursor += taskItem.durationMinutes + 5; // increment with 5m buffer

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-slate-500 dark:text-slate-400 font-semibold text-[11px] tabular-nums shrink-0">
                              {startStr} - {endStr}
                            </span>
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {taskItem.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono tabular-nums shrink-0">
                            <span>{taskItem.durationMinutes}m</span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize">{taskItem.category.replace('_', ' ')}</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Primary 1-Click Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplyTemplateSet}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Insertar {activeTemplate.tasks.length} Tareas en mi Agenda ({templateDate})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
