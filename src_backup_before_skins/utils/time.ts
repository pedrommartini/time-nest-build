// Time and interval calculations for TimeNest

export interface Task {
  id: string;
  title: string;
  description?: string;
  estimatedDuration: number;
  size: 'Pequena' | 'Média' | 'Grande';
  priority: 'Baixa' | 'Média' | 'Alta';
  status: 'pending' | 'completed';
  category: string;
  createdAt: string;
  source: 'manual' | 'nlp' | 'repetition' | 'google';
  recurrenceRule?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  notificationOffset?: number; // minutes before
  alarmEnabled?: boolean;
}

export interface Event {
  id: string;
  title: string;
  start: string; // HH:mm
  end: string; // HH:mm
  date: string; // YYYY-MM-DD
  source: 'local' | 'google';
  color: string;
  isFixed: boolean;
  description?: string;
  recurrenceRule?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  notificationOffset?: number; // minutes before
  alarmEnabled?: boolean;
}

export interface FreeInterval {
  start: string; // HH:mm
  end: string; // HH:mm
  grossMinutes: number;
  usableMinutes: number; // subtracting safety margin
}

export function timeStringToMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDurationFriendly(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function calculateFreeIntervals(
  events: Event[], 
  targetDate: string, 
  safetyMarginMinutes: number = 0,
  dayStart: string = '00:00',
  dayEnd: string = '24:00'
): FreeInterval[] {
  const dayEvents = events
    .filter(e => e.date === targetDate)
    .sort((a, b) => timeStringToMinutes(a.start) - timeStringToMinutes(b.start));

  const intervals: FreeInterval[] = [];
  
  let currentStart = timeStringToMinutes(dayStart);
  const endOfDay = timeStringToMinutes(dayEnd);

  for (const event of dayEvents) {
    const eventStart = timeStringToMinutes(event.start);
    const eventEnd = Math.max(eventStart + 15, timeStringToMinutes(event.end)); // Min 15 mins
    
    if (eventStart > currentStart) {
      const gross = eventStart - currentStart;
      const usable = Math.max(0, gross - safetyMarginMinutes);
      
      intervals.push({
        start: minutesToTimeString(currentStart),
        end: event.start,
        grossMinutes: gross,
        usableMinutes: usable
      });
    }
    
    if (eventEnd > currentStart) {
      currentStart = eventEnd;
    }
  }

  if (currentStart < endOfDay) {
    const gross = endOfDay - currentStart;
    const usable = Math.max(0, gross - safetyMarginMinutes);
    intervals.push({
      start: minutesToTimeString(currentStart),
      end: dayEnd,
      grossMinutes: gross,
      usableMinutes: usable
    });
  }

  return intervals.filter(i => i.grossMinutes >= 15);
}
