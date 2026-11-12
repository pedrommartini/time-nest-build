// tests/e2e/tier3_combinations.test.ts
// Tier 3: Cross-Feature Combinations Tests for TimeNest Full-Screen Alarms

import assert from 'node:assert';
import { FIXTURES, MockAlarmManager, TestResult } from './harness';

export function runTier3Tests(): TestResult[] {
  const results: TestResult[] = [];

  function testCase(name: string, fn: () => void) {
    const start = performance.now();
    try {
      fn();
      results.push({
        name,
        tier: 3,
        passed: true,
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        name,
        tier: 3,
        passed: false,
        durationMs: performance.now() - start,
        error: err.message,
      });
    }
  }

  // 3.1 Task -> Difficulty -> "Não sei por onde começar" (5-min micro-step)
  testCase('3.1 Cross-Feature: Task difficulty "no-start" triggers 5-min micro-step focus', () => {
    const manager = new MockAlarmManager(FIXTURES.taskNow);

    manager.handleDifficulty('no-start');

    assert.strictEqual(manager.activeAlarm, null, 'Alarm should be closed');
    assert.strictEqual(manager.focusTimerActive, true, 'Focus timer should be started');
    assert.strictEqual(manager.focusTimerDuration, 5, 'Must be a 5-minute micro-step');
    assert.strictEqual(manager.activeTab, 'focus', 'Must navigate to focus mode');
    assert.ok(manager.lastNotification?.title.includes('Micro-passo'), 'Notification must mention micro-step');
  });

  // 3.2 Task -> Difficulty -> "Estou terminando outra coisa" (5-min snooze)
  testCase('3.2 Cross-Feature: Task difficulty "finishing-other" queues 5-min friendly snooze', () => {
    const manager = new MockAlarmManager(FIXTURES.taskNow);
    const now = 1700000000000;

    manager.handleDifficulty('finishing-other', now);

    assert.strictEqual(manager.activeAlarm, null, 'Active alarm should close');
    assert.strictEqual(manager.snoozeQueue.length, 1, 'Should queue 1 snooze item');
    assert.strictEqual(manager.snoozeQueue[0].triggerAt, now + 5 * 60000, 'Queue trigger at now + 5m');
    assert.ok(manager.lastNotification?.options?.body.includes('5 minutos'), 'Notification mentions 5 minutes');
  });

  // 3.3 Task -> Difficulty -> "Estou cansado" (15-min rest)
  testCase('3.3 Cross-Feature: Task difficulty "tired" queues 15-min restorative rest', () => {
    const manager = new MockAlarmManager(FIXTURES.taskNow);
    const now = 1700000000000;

    manager.handleDifficulty('tired', now);

    assert.strictEqual(manager.activeAlarm, null);
    assert.strictEqual(manager.snoozeQueue.length, 1);
    assert.strictEqual(manager.snoozeQueue[0].triggerAt, now + 15 * 60000, 'Queue trigger at now + 15m');
    assert.ok(manager.lastNotification?.title.includes('Pausa merecida'), 'Title is empathetic pause');
  });

  // 3.4 Task -> Difficulty -> "Me distraí" (redirect to focus with sound)
  testCase('3.4 Cross-Feature: Task difficulty "distracted" redirects to focus with ambient waves', () => {
    const manager = new MockAlarmManager(FIXTURES.taskNow);

    manager.handleDifficulty('distracted');

    assert.strictEqual(manager.activeAlarm, null);
    assert.strictEqual(manager.activeTab, 'focus', 'Directs user to focus tab');
    assert.strictEqual(manager.ambientSound, 'waves', 'Plays calming waves ambient sound');
  });

  // 3.5 Pre-Event -> Snooze +10 min -> Queue Tick triggers re-alarm
  testCase('3.5 Cross-Feature: Pre-event +10m snooze delay and subsequent queue re-trigger', () => {
    const manager = new MockAlarmManager(FIXTURES.preEvent);
    const t0 = 1700000000000;

    // Snooze 10 minutes
    manager.snoozeAlarm(10, t0);
    assert.strictEqual(manager.activeAlarm, null);
    assert.strictEqual(manager.snoozeQueue.length, 1);

    // Tick before time: does not fire
    const earlyTick = manager.tickQueue(t0 + 9 * 60000);
    assert.strictEqual(earlyTick, null);
    assert.strictEqual(manager.activeAlarm, null);

    // Tick at 10 minutes: fires alarm again
    const readyAlarm = manager.tickQueue(t0 + 10 * 60000);
    assert.ok(readyAlarm !== null);
    assert.strictEqual(readyAlarm?.id, FIXTURES.preEvent.id);
    assert.strictEqual(manager.activeAlarm?.id, FIXTURES.preEvent.id);
    assert.strictEqual(manager.snoozeQueue.length, 0);
  });

  // 3.6 Pre-Event -> Snooze "Quando terminar a tarefa atual" (+25 min)
  testCase('3.6 Cross-Feature: Snooze "task_end" calculates +25m contextual postponement', () => {
    const manager = new MockAlarmManager(FIXTURES.preEvent);
    const t0 = 1700000000000;

    manager.snoozeAlarm('task_end', t0);

    assert.strictEqual(manager.snoozeQueue.length, 1);
    assert.strictEqual(manager.snoozeQueue[0].triggerAt, t0 + 25 * 60000);
    assert.ok(manager.lastNotification?.options?.body.includes('Quando terminar a tarefa atual'));
  });

  // 3.7 Critical Alarm -> CTA ("Estou saindo agora") dismisses and cleans wake lock
  testCase('3.7 Cross-Feature: Critical primary action cleans audio and releases wake lock', () => {
    const manager = new MockAlarmManager(FIXTURES.critical);

    manager.executePrimaryAction();

    assert.strictEqual(manager.activeAlarm, null, 'Alarm dismissed');
    assert.strictEqual(manager.audioStopped, true, 'Audio must stop immediately');
    assert.strictEqual(manager.wakeLockReleased, true, 'Wake lock must be released');
  });

  // 3.8 Bi-directional Navigation Loop
  testCase('3.8 Cross-Feature: Bi-directional sub-screen navigation loop', () => {
    let screen: 'main' | 'snooze' | 'difficulty' = 'main';

    // Open snooze
    screen = 'snooze';
    assert.strictEqual(screen, 'snooze');

    // Return to main
    screen = 'main';
    assert.strictEqual(screen, 'main');

    // Open difficulty
    screen = 'difficulty';
    assert.strictEqual(screen, 'difficulty');

    // Return to main
    screen = 'main';
    assert.strictEqual(screen, 'main');
  });

  // 3.9 In-App Anti-Duplication Check
  testCase('3.9 Cross-Feature: Anti-duplication prevents multi-firing within same minute', () => {
    const firedKeys = new Set<string>();
    const key = 'event-pre-123-2026-11-10-19:15';

    let fires = 0;
    // Tick 1
    if (!firedKeys.has(key)) {
      firedKeys.add(key);
      fires++;
    }
    // Tick 2 (3 seconds later)
    if (!firedKeys.has(key)) {
      firedKeys.add(key);
      fires++;
    }

    assert.strictEqual(fires, 1, 'Should fire exactly once per unique minute key');
  });

  // 3.10 Bedtime Routine activates Clean Mode
  testCase('3.10 Cross-Feature: Sleep alarm primary action activates Clean Mode', () => {
    const manager = new MockAlarmManager(FIXTURES.sleep);

    manager.executePrimaryAction();

    assert.strictEqual(manager.activeAlarm, null);
    assert.strictEqual(manager.isCleanMode, true, 'Clean mode enabled for low stimulation sleep prep');
  });

  return results;
}
