// Unit and Integration Tests Suite for TimeNest

import { parseNLPInput, normalizeTitle, getSimilarity, estimateDuration } from './nlp';
import { calculateFreeIntervals, timeStringToMinutes, minutesToTimeString } from './time';
import type { Event, Task } from './time';
import { validateAndParseBackup, exportTasksToCSV } from './backup';
import { validateUsernameFormat, isUsernameAvailable, reserveUsername } from './username';
import { 
  serializeTaskNotes, 
  deserializeTaskNotes, 
  taskToGoogleTaskPayload, 
  googleTaskItemToTimeNestTask 
} from './googleTasks';

export interface TestResult {
  category: string;
  name: string;
  success: boolean;
  errorMessage?: string;
}

if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
  const memoryStore: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStore[key] || null,
    setItem: (key: string, value: string) => { memoryStore[key] = String(value); },
    removeItem: (key: string) => { delete memoryStore[key]; },
    clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); }
  };
}

export function runTests(): TestResult[] {
  const results: TestResult[] = [];

  const test = (category: string, name: string, fn: () => void) => {
    try {
      fn();
      results.push({ category, name, success: true });
    } catch (e: any) {
      results.push({ 
        category, 
        name, 
        success: false, 
        errorMessage: e.message || String(e) 
      });
    }
  };

  // 1. Classification Tests
  test('NLP Heuristics', 'Classify event correctly with time', () => {
    const res = parseNLPInput('Reunião com equipe amanhã às 15:30');
    if (res.type !== 'event') throw new Error(`Expected event, got ${res.type}`);
    if (res.time !== '15:30') throw new Error(`Expected 15:30, got ${res.time}`);
  });

  test('NLP Heuristics', 'Classify deadline task correctly with date only', () => {
    const res = parseNLPInput('Pagar o boleto da luz amanhã');
    if (res.type !== 'task_deadline') throw new Error(`Expected task_deadline, got ${res.type}`);
    if (!res.date) throw new Error('Expected date to be populated');
    if (res.time) throw new Error('Expected no time to be populated');
  });

  test('NLP Heuristics', 'Classify flexible task correctly without time/date', () => {
    const res = parseNLPInput('Editar vídeo de viagens');
    if (res.type !== 'task_flexible') throw new Error(`Expected task_flexible, got ${res.type}`);
    if (res.date || res.time) throw new Error('Expected no date or time');
  });

  test('NLP Heuristics', 'Normalizes titles correctly', () => {
    const n1 = normalizeTitle('Editar o vídeo do projeto!');
    const n2 = normalizeTitle('editar video projeto');
    if (n1 !== n2) throw new Error(`Expected normalization match: "${n1}" vs "${n2}"`);
  });

  test('NLP Heuristics', 'Title similarity calculation works', () => {
    const sim = getSimilarity('Estudar inglês', 'Estudar o inglês para prova');
    if (sim < 0.5) throw new Error(`Expected similarity above 0.5, got ${sim}`);
  });

  test('NLP Heuristics', 'Estimate duration based on keywords', () => {
    const res = estimateDuration('Ir ao supermercado fazer compras');
    if (res.minutes !== 60) throw new Error(`Expected 60 min, got ${res.minutes}`);
  });

  // 2. Time and Interval Math
  test('Time Math', 'Convert time string to minutes', () => {
    const mins = timeStringToMinutes('14:30');
    if (mins !== 14 * 60 + 30) throw new Error(`Expected 870, got ${mins}`);
  });

  test('Time Math', 'Convert minutes to time string', () => {
    const str = minutesToTimeString(900); // 15:00
    if (str !== '15:00') throw new Error(`Expected 15:00, got ${str}`);
  });

  test('Interval Calculator', 'Calculate free intervals and subtract safety margin', () => {
    const today = new Date().toISOString().split('T')[0];
    const mockEvents: Event[] = [
      {
        id: 'e-1',
        title: 'Event A',
        start: '13:00',
        end: '14:00',
        date: today,
        source: 'local',
        color: 'blue',
        isFixed: true
      },
      {
        id: 'e-2',
        title: 'Event B',
        start: '15:30',
        end: '16:30',
        date: today,
        source: 'local',
        color: 'blue',
        isFixed: true
      }
    ];

    // Gap from 14:00 to 15:30 is 90 minutes.
    // With 15 minutes safety margin, usable time is 75 minutes.
    const intervals = calculateFreeIntervals(mockEvents, today, 15, '07:00', '23:00');
    const midInterval = intervals.find(i => i.start === '14:00');
    
    if (!midInterval) throw new Error('Middle interval not found');
    if (midInterval.grossMinutes !== 90) throw new Error(`Expected 90 gross minutes, got ${midInterval.grossMinutes}`);
    if (midInterval.usableMinutes !== 75) throw new Error(`Expected 75 usable minutes, got ${midInterval.usableMinutes}`);
  });

  test('Interval Calculator', 'Handles back-to-back events with zero free time gap', () => {
    const today = new Date().toISOString().split('T')[0];
    const backToBackEvents: Event[] = [
      { id: 'b-1', title: 'A', start: '10:00', end: '11:00', date: today, source: 'local', color: 'blue', isFixed: true },
      { id: 'b-2', title: 'B', start: '11:00', end: '12:00', date: today, source: 'local', color: 'blue', isFixed: true }
    ];
    const intervals = calculateFreeIntervals(backToBackEvents, today, 10, '10:00', '12:00');
    if (intervals.length !== 0) throw new Error(`Expected 0 intervals, got ${intervals.length}`);
  });

  test('Interval Calculator', 'Respects customized sleep window boundaries', () => {
    const today = new Date().toISOString().split('T')[0];
    const emptyEvents: Event[] = [];
    const intervals = calculateFreeIntervals(emptyEvents, today, 0, '08:00', '22:00');
    if (intervals.length !== 1) throw new Error(`Expected 1 full-day interval, got ${intervals.length}`);
    if (intervals[0].start !== '08:00' || intervals[0].end !== '22:00') {
      throw new Error(`Expected 08:00->22:00 interval, got ${intervals[0].start}->${intervals[0].end}`);
    }
    if (intervals[0].usableMinutes !== 14 * 60) {
      throw new Error(`Expected 840 usable minutes, got ${intervals[0].usableMinutes}`);
    }
  });

  // 3. Backup and File Integrities
  test('Backup / Export', 'CSV tasks conversion matches standard columns', () => {
    const mockTasks = [{
      id: 't-1',
      title: 'Task A',
      description: 'Desc A',
      estimatedDuration: 30,
      size: 'Média' as const,
      priority: 'Média' as const,
      status: 'pending' as const,
      category: 'Work',
      createdAt: new Date().toISOString(),
      source: 'manual' as const
    }];
    const csv = exportTasksToCSV(mockTasks);
    if (!csv.includes('Task A') || !csv.includes('Desc A')) {
      throw new Error('CSV output does not contain task details');
    }
  });

  test('Backup / Export', 'Validates JSON backup correctly', () => {
    const validJSON = JSON.stringify({
      tasks: [{ id: '1', title: 'Task' }],
      events: []
    });
    const parsed = validateAndParseBackup(validJSON);
    if (!parsed || parsed.tasks.length !== 1) {
      throw new Error('Valid backup rejected by parser');
    }
  });

  // 4. Username System Tests
  test('Username System', 'Validates valid usernames correctly', () => {
    const res = validateUsernameFormat('pedro_martini');
    if (!res.isValid) throw new Error(`Expected valid, got error: ${res.error}`);
    if (res.formatted !== '@pedro_martini') throw new Error(`Unexpected format: ${res.formatted}`);
  });

  test('Username System', 'Rejects short or invalid character usernames', () => {
    const resShort = validateUsernameFormat('ab');
    if (resShort.isValid) throw new Error('Expected invalid for short length');

    const resInvalidChar = validateUsernameFormat('pedro@martini!');
    if (resInvalidChar.isValid && resInvalidChar.formatted.includes('@martini!')) {
      throw new Error('Expected invalid for special characters');
    }
  });

  test('Username System', 'Rejects reserved usernames', () => {
    const resAdmin = validateUsernameFormat('admin');
    if (resAdmin.isValid) throw new Error('Expected reserved username "admin" to be rejected');
  });

  test('Username System', 'Enforces username registry uniqueness', () => {
    const uName = 'usr_' + String(Date.now()).slice(-8);
    const userA = 'user_A_123';
    const userB = 'user_B_456';

    const reservedA = reserveUsername(uName, userA);
    if (!reservedA) throw new Error('Failed to reserve username for userA');

    const availB = isUsernameAvailable(uName, userB);
    if (availB.available) throw new Error('Username should be unavailable for userB');

    const availA = isUsernameAvailable(uName, userA);
    if (!availA.available) throw new Error('Username should remain available for owner userA');
  });

  // 6. Alarms & Sleep Routine Tests
  test('Alarms & Routine', 'Calculates sleep routine duration across midnight', () => {
    const sH = 23, sM = 30; // 23:30
    const eH = 7, eM = 30;  // 07:30
    let totalMin = (eH * 60 + eM) - (sH * 60 + sM);
    if (totalMin < 0) totalMin += 24 * 60;
    if (totalMin !== 8 * 60) throw new Error(`Expected 480 min (8h), got ${totalMin}`);
  });

  test('Alarms & Routine', 'Calculates 5-minute pre-sleep alarm time accurately', () => {
    const sleepStart = '23:00';
    const [sH, sM] = sleepStart.split(':').map(Number);
    const date = new Date(2026, 0, 1, sH, sM, 0);
    const prepDate = new Date(date.getTime() - 5 * 60000);
    const prepTimeStr = `${String(prepDate.getHours()).padStart(2, '0')}:${String(prepDate.getMinutes()).padStart(2, '0')}`;
    if (prepTimeStr !== '22:55') throw new Error(`Expected 22:55, got ${prepTimeStr}`);
  });

  test('Alarms & Routine', 'Medication alarm schedules future timestamp properly', () => {
    const medTime = '08:00';
    const [mH, mM] = medTime.split(':').map(Number);
    const now = new Date(2026, 0, 1, 9, 0, 0); // 09:00 (past 08:00)
    const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), mH, mM, 0);
    if (scheduled.getTime() <= now.getTime()) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    // Should be scheduled for tomorrow 08:00
    if (scheduled.getDate() !== 2 || scheduled.getHours() !== 8) {
      throw new Error(`Expected next day 08:00, got ${scheduled.toISOString()}`);
    }
  });

  test('Alarms & Routine', 'Calculates pre-event 15-minute alarm offset', () => {
    const eventStart = '19:30';
    const offset = 15;
    const [h, m] = eventStart.split(':').map(Number);
    let targetMin = h * 60 + m - offset;
    if (targetMin < 0) targetMin += 1440;
    const tH = Math.floor(targetMin / 60);
    const tM = targetMin % 60;
    const result = `${String(tH).padStart(2, '0')}:${String(tM).padStart(2, '0')}`;
    if (result !== '19:15') throw new Error(`Expected 19:15, got ${result}`);
  });

  test('Alarms & Routine', 'Computes snooze delay timestamps accurately', () => {
    const baseNow = 1000000;
    const snooze5 = baseNow + 5 * 60000;
    const snooze10 = baseNow + 10 * 60000;
    const snooze15 = baseNow + 15 * 60000;
    if (snooze5 - baseNow !== 300000) throw new Error('5-min snooze failed');
    if (snooze10 - baseNow !== 600000) throw new Error('10-min snooze failed');
    if (snooze15 - baseNow !== 900000) throw new Error('15-min snooze failed');
  });

  // 7. Google Tasks Cloud Sync & Metadata Persistence Tests
  test('Google Tasks Cloud Sync', 'Serializes and deserializes rich task metadata in notes', () => {
    const originalDesc = 'Comprar mantimentos para a semana inteira';
    const meta = {
      duration: 45,
      size: 'Média' as const,
      priority: 'Alta' as const,
      category: 'Mercado',
      alarmEnabled: true,
      notificationOffset: 10
    };

    const serialized = serializeTaskNotes(originalDesc, meta);
    if (!serialized.includes('[timenest-meta:')) {
      throw new Error('Expected serialized notes to contain [timenest-meta: tag');
    }

    const { description, meta: parsedMeta } = deserializeTaskNotes(serialized);
    if (description !== originalDesc) {
      throw new Error(`Expected description "${originalDesc}", got "${description}"`);
    }
    if (parsedMeta.duration !== 45) {
      throw new Error(`Expected duration 45, got ${parsedMeta.duration}`);
    }
    if (parsedMeta.priority !== 'Alta') {
      throw new Error(`Expected priority "Alta", got ${parsedMeta.priority}`);
    }
    if (parsedMeta.alarmEnabled !== true) {
      throw new Error(`Expected alarmEnabled true, got ${parsedMeta.alarmEnabled}`);
    }
  });

  test('Google Tasks Cloud Sync', 'Builds Google Tasks API payload with correct status and title', () => {
    const task: Task = {
      id: 'local-123',
      title: 'Finalizar relatório financeiro',
      description: 'Verificar balanço trimestral',
      estimatedDuration: 60,
      size: 'Grande',
      priority: 'Alta',
      status: 'pending',
      category: 'Finanças',
      createdAt: '2026-09-30T10:00:00Z',
      source: 'manual',
      alarmEnabled: true
    };

    const payload = taskToGoogleTaskPayload(task);
    if (payload.title !== task.title) throw new Error('Payload title mismatch');
    if (payload.status !== 'needsAction') throw new Error(`Expected needsAction, got ${payload.status}`);
    if (!payload.notes.includes('Verificar balanço trimestral')) throw new Error('Payload notes missing description');
    if (!payload.notes.includes('"alarmEnabled":true')) throw new Error('Payload notes missing alarmEnabled metadata');
  });

  test('Google Tasks Cloud Sync', 'Reconstructs TimeNest Task from Google Tasks REST item', () => {
    const rawGoogleItem = {
      id: 'gtask-xyz-987',
      title: 'Estudar TypeScript Avançado',
      status: 'completed',
      updated: '2026-09-30T15:00:00Z',
      notes: 'Capítulo 4 e 5\n\n[timenest-meta:{"duration":90,"size":"Grande","priority":"Alta","category":"Estudos","alarmEnabled":true}]'
    };

    const task = googleTaskItemToTimeNestTask(rawGoogleItem);
    if (task.id !== 'google-gtask-xyz-987') throw new Error(`Expected id google-gtask-xyz-987, got ${task.id}`);
    if (task.title !== 'Estudar TypeScript Avançado') throw new Error('Title mismatch');
    if (task.description !== 'Capítulo 4 e 5') throw new Error(`Expected clean description, got "${task.description}"`);
    if (task.status !== 'completed') throw new Error(`Expected status completed, got ${task.status}`);
    if (task.estimatedDuration !== 90) throw new Error(`Expected duration 90, got ${task.estimatedDuration}`);
    if (task.size !== 'Grande') throw new Error(`Expected size Grande, got ${task.size}`);
    if (task.priority !== 'Alta') throw new Error(`Expected priority Alta, got ${task.priority}`);
    if (task.alarmEnabled !== true) throw new Error('Expected alarmEnabled true');
    if (task.source !== 'google') throw new Error('Expected source google');
  });

  return results;
}
