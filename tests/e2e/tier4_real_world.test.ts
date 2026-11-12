// tests/e2e/tier4_real_world.test.ts
// Tier 4: Real-World Scenarios Tests for TimeNest Full-Screen Alarms

import assert from 'node:assert';
import { renderAlarm, FIXTURES, MockAlarmManager, TestResult } from './harness';

export function runTier4Tests(): TestResult[] {
  const results: TestResult[] = [];

  function testCase(name: string, fn: () => void) {
    const start = performance.now();
    try {
      fn();
      results.push({
        name,
        tier: 4,
        passed: true,
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        name,
        tier: 4,
        passed: false,
        durationMs: performance.now() - start,
        error: err.message,
      });
    }
  }

  // 4.1 Morning Wakeup Journey
  testCase('4.1 Real-World Journey: Morning Wakeup -> Snooze 5m -> Re-wake -> Timeline View', () => {
    const wakeAlarm = { ...FIXTURES.wake };
    const manager = new MockAlarmManager(wakeAlarm);
    const wakeTime = 1700000000000;

    // Step 1: Verify wake alarm presentation
    const render1 = renderAlarm({ alarm: wakeAlarm });
    assert.ok(render1.hasText('Hora de Acordar'));
    assert.ok(render1.hasText('Acordei! Iniciar dia'));
    assert.ok(render1.hasText('+5 min') || render1.hasText('Soneca'));

    // Step 2: Groggy user hits snooze 5 min
    manager.snoozeAlarm(5, wakeTime);
    assert.strictEqual(manager.activeAlarm, null, 'Wake alarm dismissed to queue');
    assert.strictEqual(manager.snoozeQueue.length, 1);
    assert.strictEqual(manager.snoozeQueue[0].triggerAt, wakeTime + 5 * 60000);

    // Step 3: 5 minutes pass, alarm re-triggers
    const reFired = manager.tickQueue(wakeTime + 5 * 60000);
    assert.ok(reFired !== null);
    assert.strictEqual(manager.activeAlarm?.id, wakeAlarm.id);

    // Step 4: User is awake, clicks "Acordei! Iniciar dia"
    manager.executePrimaryAction();
    assert.strictEqual(manager.activeAlarm, null);
    assert.strictEqual(manager.celebrationPlayed, true, 'Celebration sound played');
    assert.strictEqual(manager.activeTab, 'timeline', 'Switches to timeline for daily routine');
  });

  // 4.2 Urgent Doctor Appointment Journey
  testCase('4.2 Real-World Journey: Urgent Doctor Appointment -> Pre-event -> Critical Departure', () => {
    // Step 1: 15 minutes before (14:15), Pre-event alert
    const preAlert = { ...FIXTURES.preEvent, title: 'Consulta médica', durationOrTime: '14:30' };
    const manager = new MockAlarmManager(preAlert);

    const renderPre = renderAlarm({ alarm: preAlert });
    assert.ok(renderPre.hasText('EM 15 MIN'));
    assert.ok(renderPre.hasText('Vou me preparar agora'));

    // User confirms preparation
    manager.executePrimaryAction();
    assert.strictEqual(manager.activeAlarm, null);

    // Step 2: At 14:30, critical alarm triggers with urgent styling
    const critAlert = { ...FIXTURES.critical, title: 'Consulta médica', durationOrTime: '14:30' };
    manager.activeAlarm = critAlert;

    const renderCrit = renderAlarm({ alarm: critAlert });
    assert.ok(renderCrit.hasText('URGENTE'));
    assert.ok(renderCrit.hasText('Estou saindo agora'));
    assert.ok(renderCrit.matchesRegex(/rose|red|orange/i), 'Fiery urgent styling');

    // User departs: clicks "Estou saindo agora"
    manager.executePrimaryAction();
    assert.strictEqual(manager.activeAlarm, null);
    assert.strictEqual(manager.audioStopped, true);
    assert.strictEqual(manager.wakeLockReleased, true);
  });

  // 4.3 ADHD Executive Dysfunction & Micro-Step Focus Journey
  testCase('4.3 Real-World Journey: ADHD Paralysis -> "Não consigo começar" -> 5-min Micro-Step', () => {
    const taskAlarm = { ...FIXTURES.taskNow, title: 'Relatório Trimestral', durationOrTime: '50 min' };
    const manager = new MockAlarmManager(taskAlarm);

    // Step 1: Task alarm displays with AGORA
    const renderMain = renderAlarm({ alarm: taskAlarm });
    assert.ok(renderMain.hasText('AGORA'));
    assert.ok(renderMain.hasText('Não consigo começar'));

    // Step 2: User opens ADHD difficulty support screen
    const renderDiff = renderAlarm({ alarm: taskAlarm, screen: 'difficulty' });
    assert.ok(renderDiff.hasText('O que está dificultando?'));
    assert.ok(renderDiff.hasText('Não sei por onde começar'));

    // Step 3: User chooses "Não sei por onde começar"
    manager.handleDifficulty('no-start');

    // Step 4: App converts task into non-threatening 5-min micro-step in Focus mode
    assert.strictEqual(manager.activeAlarm, null, 'Alarm closes');
    assert.strictEqual(manager.focusTimerActive, true, 'Focus timer begins');
    assert.strictEqual(manager.focusTimerDuration, 5, 'Exact 5-minute threshold reduction');
    assert.strictEqual(manager.activeTab, 'focus', 'User placed in calm focus view');
  });

  // 4.4 Bedtime Routine Transition Journey
  testCase('4.4 Real-World Journey: Bedtime Routine 5m Warning -> Preparation -> Clean Mode', () => {
    const sleepAlarm = { ...FIXTURES.sleep, badge: 'EM 5 MIN', title: 'Preparação para dormir' };
    const manager = new MockAlarmManager(sleepAlarm);

    const renderSleep = renderAlarm({ alarm: sleepAlarm });
    assert.ok(renderSleep.hasText('Preparação para dormir'));
    assert.ok(renderSleep.hasText('Vou me preparar agora'));

    manager.executePrimaryAction();
    assert.strictEqual(manager.activeAlarm, null);
    assert.strictEqual(manager.isCleanMode, true, 'Clean Mode activated to reduce evening stimulation');
  });

  // 4.5 Chronic Medication Delay and Adherence Journey
  testCase('4.5 Real-World Journey: Chronic Medication -> Snooze +15m -> Re-alert -> Adherence', () => {
    const medAlarm = { ...FIXTURES.medication };
    const manager = new MockAlarmManager(medAlarm);
    const medTime = 1700000000000;

    // User is in a meeting, snoozes +15m
    manager.snoozeAlarm(15, medTime);
    assert.strictEqual(manager.snoozeQueue.length, 1);
    assert.strictEqual(manager.snoozeQueue[0].triggerAt, medTime + 15 * 60000);

    // 15m later alarm re-triggers
    const reAlert = manager.tickQueue(medTime + 15 * 60000);
    assert.ok(reAlert !== null);
    assert.strictEqual(reAlert?.title, 'Venvanse 50mg');

    // User takes medication
    manager.executePrimaryAction();
    assert.strictEqual(manager.activeAlarm, null);
    assert.strictEqual(manager.celebrationPlayed, true);
  });

  return results;
}
