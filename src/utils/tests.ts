// Unit and Integration Tests Suite for TimeNest

import { parseNLPInput, normalizeTitle, getSimilarity, estimateDuration } from './nlp';
import { calculateFreeIntervals, timeStringToMinutes, minutesToTimeString } from './time';
import type { Event } from './time';
import { validateAndParseBackup, exportTasksToCSV } from './backup';
import { validateUsernameFormat, isUsernameAvailable, reserveUsername } from './username';

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

  return results;
}
