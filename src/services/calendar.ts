import { Task } from '../types';

/**
 * Calendar integration service:
 * - Google Calendar one-click direct sync URL
 * - Standard RFC 5545 iCalendar (.ics) generation & import
 * - Third-party webhook & Notion markdown exporters
 */

export class CalendarService {
  /**
   * Generates a direct Google Calendar web intent URL for a task
   */
  public static generateGoogleCalendarUrl(task: Task): string {
    const dateClean = task.date.replace(/-/g, '');
    const [startH, startM] = task.startTime.split(':');
    const startIso = `${dateClean}T${startH}${startM}00`;

    const totalMinutes = parseInt(startH, 10) * 60 + parseInt(startM, 10) + task.durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    const endIso = `${dateClean}T${endH.toString().padStart(2, '0')}${endM.toString().padStart(2, '0')}00`;

    const title = encodeURIComponent(`[Khoros] ${task.title}`);
    const details = encodeURIComponent(
      `${task.description || ''}\n\nPrioridad: ${task.priority.toUpperCase()}\nCategoría: ${task.category}\nCifrado E2EE: ${task.isEncrypted ? 'Sí' : 'No'}`
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&sf=true&output=xml`;
  }

  /**
   * Generates standard .ics content for an array of tasks
   */
  public static exportToIcs(tasks: Task[], calendarName: string = 'Khoros Planner'): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Khoros Productivity//ES',
      `X-WR-CALNAME:${calendarName}`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    const pad = (n: number) => n.toString().padStart(2, '0');

    tasks.forEach((task) => {
      const dateParts = task.date.split('-');
      const [sh, sm] = task.startTime.split(':').map(Number);
      const totalMinutes = sh * 60 + sm + task.durationMinutes;
      const eh = Math.floor(totalMinutes / 60) % 24;
      const em = totalMinutes % 60;

      const dtStart = `${dateParts[0]}${dateParts[1]}${dateParts[2]}T${pad(sh)}${pad(sm)}00`;
      const dtEnd = `${dateParts[0]}${dateParts[1]}${dateParts[2]}T${pad(eh)}${pad(em)}00`;
      const uid = `khoros-${task.id}@planner.local`;
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${task.title.replace(/,/g, '\\,')}`,
        `DESCRIPTION:${(task.description || '').replace(/\n/g, '\\n')}`,
        `CATEGORIES:${task.category.toUpperCase()}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Initiates browser download of .ics file
   */
  public static downloadIcs(tasks: Task[], filename: string = 'khoros_agenda.ics'): void {
    const icsContent = this.exportToIcs(tasks);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Parses basic .ics file text and returns detected tasks
   */
  public static parseIcs(icsText: string, targetDate: string): Partial<Task>[] {
    const results: Partial<Task>[] = [];
    const eventBlocks = icsText.split('BEGIN:VEVENT');

    for (let i = 1; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      const summaryMatch = block.match(/SUMMARY:(.*?)(?:\r?\n)/);
      const dtStartMatch = block.match(/DTSTART(?:;.*?)?:(\d{8}T\d{4}\d{2})/);
      const dtEndMatch = block.match(/DTEND(?:;.*?)?:(\d{8}T\d{4}\d{2})/);
      const descMatch = block.match(/DESCRIPTION:(.*?)(?:\r?\n)/);

      if (summaryMatch) {
        const title = summaryMatch[1].replace(/\\,/g, ',').trim();
        let startTime = '09:00';
        let durationMinutes = 60;

        if (dtStartMatch && dtEndMatch) {
          const sHour = dtStartMatch[1].substring(9, 11);
          const sMin = dtStartMatch[1].substring(11, 13);
          startTime = `${sHour}:${sMin}`;

          const eHour = dtEndMatch[1].substring(9, 11);
          const eMin = dtEndMatch[1].substring(11, 13);
          const sTotal = parseInt(sHour, 10) * 60 + parseInt(sMin, 10);
          const eTotal = parseInt(eHour, 10) * 60 + parseInt(eMin, 10);
          durationMinutes = Math.max(15, eTotal - sTotal);
        }

        results.push({
          title,
          description: descMatch ? descMatch[1].replace(/\\n/g, '\n').trim() : 'Importado desde calendario personal',
          startTime,
          durationMinutes,
          category: 'meetings',
          priority: 'p2',
          status: 'pending',
          date: targetDate,
          energyLevel: 'medium',
          reminderMinutesBefore: 15,
          tags: ['Calendario Personal'],
          isLockedTime: true,
        });
      }
    }

    return results;
  }

  /**
   * Generates clean Notion database markdown format
   */
  public static generateNotionMarkdown(tasks: Task[]): string {
    let md = '| Tarea | Hora | Duración | Prioridad | Categoría | Estado |\n';
    md += '|---|---|---|---|---|---|\n';
    tasks.forEach((t) => {
      md += `| ${t.title} | ${t.startTime} | ${t.durationMinutes} min | ${t.priority.toUpperCase()} | ${t.category} | ${t.status} |\n`;
    });
    return md;
  }
}
