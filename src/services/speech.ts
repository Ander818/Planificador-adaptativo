/**
 * Voice dictation and smart task recognition service.
 * Supports Web Speech API with fallback and intelligent NLP extraction for tasks in Spanish.
 */

export interface ParsedVoiceTask {
  title?: string;
  startTime?: string;
  durationMinutes?: number;
  priority?: 'p1' | 'p2' | 'p3';
  category?: 'deep_work' | 'meetings' | 'admin' | 'learning' | 'health';
  energyLevel?: 'high' | 'medium' | 'low';
}

export class SpeechService {
  public static isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  public static createRecognition(lang: string = 'es-ES'): any {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return null;
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = lang;
    return rec;
  }

  /**
   * Intelligently extracts task parameters from dictated Spanish speech.
   * Example: "Revisión con equipo de diseño a las diez de la mañana durante cuarenta y cinco minutos prioridad urgente"
   */
  public static parseDictatedTask(text: string): ParsedVoiceTask {
    const lower = text.toLowerCase().trim();
    const result: ParsedVoiceTask = {};

    // 1. Detect Priority
    if (lower.includes('urgente') || lower.includes('crítica') || lower.includes('alta prioridad') || lower.includes('p1')) {
      result.priority = 'p1';
      result.energyLevel = 'high';
    } else if (lower.includes('baja prioridad') || lower.includes('secundaria') || lower.includes('cuando pueda') || lower.includes('p3')) {
      result.priority = 'p3';
      result.energyLevel = 'low';
    } else if (lower.includes('importante') || lower.includes('p2')) {
      result.priority = 'p2';
      result.energyLevel = 'medium';
    }

    // 2. Detect Category
    if (lower.includes('reunión') || lower.includes('sincronización') || lower.includes('llamada') || lower.includes('call')) {
      result.category = 'meetings';
    } else if (lower.includes('estudio') || lower.includes('lectura') || lower.includes('aprender') || lower.includes('curso')) {
      result.category = 'learning';
    } else if (lower.includes('caminar') || lower.includes('gimnasio') || lower.includes('salud') || lower.includes('descanso') || lower.includes('pausa')) {
      result.category = 'health';
    } else if (lower.includes('correo') || lower.includes('factura') || lower.includes('admin') || lower.includes('inbox') || lower.includes('trámite')) {
      result.category = 'admin';
    } else if (lower.includes('código') || lower.includes('programar') || lower.includes('diseño') || lower.includes('estrategia') || lower.includes('deep work') || lower.includes('foco')) {
      result.category = 'deep_work';
    }

    // 3. Detect Duration
    const durationMatch = lower.match(/(\d+)\s*(minutos|min|horas|hora|h)/);
    if (durationMatch) {
      const num = parseInt(durationMatch[1], 10);
      if (durationMatch[2].startsWith('h')) {
        result.durationMinutes = num * 60;
      } else {
        result.durationMinutes = num;
      }
    } else if (lower.includes('media hora')) {
      result.durationMinutes = 30;
    } else if (lower.includes('una hora')) {
      result.durationMinutes = 60;
    } else if (lower.includes('hora y media')) {
      result.durationMinutes = 90;
    } else if (lower.includes('dos horas')) {
      result.durationMinutes = 120;
    } else if (lower.includes('quince minutos') || lower.includes('15 minutos')) {
      result.durationMinutes = 15;
    } else if (lower.includes('cuarenta y cinco minutos') || lower.includes('45 minutos')) {
      result.durationMinutes = 45;
    }

    // 4. Detect Start Time (e.g. "a las diez", "a las 10:30", "a las 15:00", "a las tres de la tarde")
    const timeNumMatch = lower.match(/a las\s*(\d{1,2})(?::(\d{2}))?/);
    if (timeNumMatch) {
      let h = parseInt(timeNumMatch[1], 10);
      const m = timeNumMatch[2] ? parseInt(timeNumMatch[2], 10) : 0;
      if (lower.includes('tarde') || lower.includes('noche')) {
        if (h < 12) h += 12;
      }
      result.startTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    } else if (lower.includes('a las nueve')) {
      result.startTime = '09:00';
    } else if (lower.includes('a las diez')) {
      result.startTime = '10:00';
    } else if (lower.includes('a las once')) {
      result.startTime = '11:00';
    } else if (lower.includes('a las doce')) {
      result.startTime = '12:00';
    } else if (lower.includes('a la una') || lower.includes('a las trece')) {
      result.startTime = '13:00';
    } else if (lower.includes('a las dos') || lower.includes('a las catorce')) {
      result.startTime = '14:00';
    } else if (lower.includes('a las tres') || lower.includes('a las quince')) {
      result.startTime = '15:00';
    } else if (lower.includes('a las cuatro') || lower.includes('a las dieciséis')) {
      result.startTime = '16:00';
    } else if (lower.includes('a las cinco') || lower.includes('a las diecisiete')) {
      result.startTime = '17:00';
    }

    // 5. Clean Title (remove voice metadata syntax if present)
    let cleanTitle = text
      .replace(/a las \d{1,2}(?::\d{2})?(?:\s*(?:de la tarde|de la mañana|de la noche))?/gi, '')
      .replace(/durante \d+\s*(?:minutos|min|horas|h)/gi, '')
      .replace(/durante (?:media hora|una hora|hora y media|dos horas|quince minutos|cuarenta y cinco minutos)/gi, '')
      .replace(/(?:con )?prioridad (?:urgente|crítica|alta|media|baja|secundaria|p1|p2|p3)/gi, '')
      .replace(/(?:categoría|categoria) (?:reunión|reunion|deep work|foco|estudio|salud|admin)/gi, '')
      .trim();

    // Capitalize first letter
    if (cleanTitle.length > 0) {
      cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
    }

    result.title = cleanTitle || text;
    return result;
  }
}
