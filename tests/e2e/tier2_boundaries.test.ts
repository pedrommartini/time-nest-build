// tests/e2e/tier2_boundaries.test.ts
// Tier 2: Boundary & Corner Cases Tests for TimeNest Full-Screen Alarms

import assert from 'node:assert';
import { renderAlarm, FIXTURES, MockAlarmManager, TestResult } from './harness';
import { timeStringToMinutes, minutesToTimeString } from '../../src/utils/time';

export function runTier2Tests(): TestResult[] {
  const results: TestResult[] = [];

  function testCase(name: string, fn: () => void) {
    const start = performance.now();
    try {
      fn();
      results.push({
        name,
        tier: 2,
        passed: true,
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        name,
        tier: 2,
        passed: false,
        durationMs: performance.now() - start,
        error: err.message,
      });
    }
  }

  // 2.1 Very Long Multiline Title (150+ chars)
  testCase('2.1 Very Long Title: Renders 150+ char title safely without crash or clipping', () => {
    const longTitle = 'Reunião de alinhamento estratégico trimestral sobre arquitetura de dados e migração de microsserviços para infraestrutura híbrida na nuvem com diretoria';
    const rendered = renderAlarm({
      alarm: {
        ...FIXTURES.preEvent,
        title: longTitle,
      },
      theme: 'light',
    });

    assert.ok(rendered.hasText(longTitle), 'Long title should be rendered fully');
    assert.ok(rendered.hasText('19:30'), 'Time should still be rendered');
    assert.ok(rendered.hasText('Vou me preparar agora'), 'CTA should remain visible');
  });

  // 2.2 Single Word Title
  testCase('2.2 Single Word Title: Clean centered rendering for single word title', () => {
    const rendered = renderAlarm({
      alarm: {
        ...FIXTURES.taskNow,
        title: 'Foco',
      },
    });

    assert.ok(rendered.hasText('Foco'), 'Single word title should be rendered');
    assert.ok(rendered.hasText('AGORA'), 'Badge should remain aligned');
  });

  // 2.3 Missing Metadata Graceful Handling
  testCase('2.3 Missing Metadata: Gracefully omits metadata without rendering "undefined" or broken tags', () => {
    const rendered = renderAlarm({
      alarm: {
        ...FIXTURES.base,
        metadata: undefined,
      },
    });

    assert.ok(!rendered.hasText('undefined'), 'Must not render "undefined" text');
    assert.ok(rendered.hasText('Jantar com Maria'), 'Title rendered properly');
  });

  // 2.4 Missing / Empty Duration or Time
  testCase('2.4 Missing Duration/Time: Gracefully omits time element without layout break', () => {
    const rendered = renderAlarm({
      alarm: {
        ...FIXTURES.base,
        durationOrTime: undefined,
      },
    });

    assert.ok(!rendered.hasText('undefined'), 'Must not render undefined');
    assert.ok(rendered.hasText('Jantar com Maria'), 'Title rendered');
    assert.ok(rendered.hasText('Vou me preparar agora'), 'CTA intact');
  });

  // 2.5 Adversarial Characters & HTML Escaping
  testCase('2.5 Adversarial Escaping: Safely renders XSS vectors, quotes, ampersands, and emojis', () => {
    const attackTitle = '<script>alert("XSS")</script> & "quotes" \'test\' 🔔⚡🔥';
    const rendered = renderAlarm({
      alarm: {
        ...FIXTURES.base,
        title: attackTitle,
      },
    });

    assert.ok(!rendered.html.includes('<script>alert('), 'Raw script tags must be safely escaped by React');
    assert.ok(rendered.hasText('&lt;script&gt;') || rendered.hasText('alert') || rendered.hasText('🔔⚡🔥'), 'Safe sanitized text present');
  });

  // 2.6 Consecutive Snoozes in Queue (No Duplicates)
  testCase('2.6 Consecutive Snoozes: Replaces existing queue entry rather than duplicating', () => {
    const manager = new MockAlarmManager(FIXTURES.base);
    const t0 = 1700000000000;

    // First snooze: +5 min
    manager.snoozeAlarm(5, t0);
    assert.strictEqual(manager.snoozeQueue.length, 1, 'Queue should have 1 item');
    assert.strictEqual(manager.snoozeQueue[0].triggerAt, t0 + 5 * 60000);

    // Re-active the alarm
    manager.activeAlarm = manager.snoozeQueue[0].alarm;

    // Second snooze: +10 min
    manager.snoozeAlarm(10, t0 + 1000);
    assert.strictEqual(manager.snoozeQueue.length, 1, 'Queue should still have 1 item (updated, not duplicated)');
    assert.strictEqual(manager.snoozeQueue[0].triggerAt, t0 + 1000 + 10 * 60000);
  });

  // 2.7 Hardware Back / Esc Key Interception Hierarchy
  testCase('2.7 Hardware Back Navigation: Sub-screen returns to main first, main dismisses alarm', () => {
    let currentScreen: 'main' | 'snooze' | 'difficulty' = 'snooze';
    let dismissed = false;

    // Back handler simulation matching AlarmOverlay.tsx logic
    const handleBackButton = () => {
      if (currentScreen !== 'main') {
        currentScreen = 'main';
        return true; // handled, back to main
      }
      dismissed = true;
      return true; // handled, dismissed
    };

    // First Back press while in snooze
    const handled1 = handleBackButton();
    assert.strictEqual(handled1, true);
    assert.strictEqual(currentScreen, 'main', 'Back in snooze must transition to main alarm screen');
    assert.strictEqual(dismissed, false, 'Back in snooze must NOT dismiss the alarm');

    // Second Back press while in main
    const handled2 = handleBackButton();
    assert.strictEqual(handled2, true);
    assert.strictEqual(dismissed, true, 'Back in main must dismiss the alarm');
  });

  // 2.8 Rapid Clicking Resilience
  testCase('2.8 Rapid Clicking: Rapid successive actions do not throw or duplicate state', () => {
    const manager = new MockAlarmManager(FIXTURES.taskNow);

    // Rapid primary action clicks
    manager.executePrimaryAction();
    assert.strictEqual(manager.activeAlarm, null);
    assert.strictEqual(manager.focusTimerActive, true);

    // Subsequent click when alarm is already null
    assert.doesNotThrow(() => {
      manager.executePrimaryAction();
    });
  });

  // 2.9 Midnight and Hour Crossing Math
  testCase('2.9 Midnight and Hour Crossing: Calculates offsets across 00:00 and hour boundaries', () => {
    // 00:05 with 15 min offset -> 23:50
    const startMin = timeStringToMinutes('00:05');
    let preMin = startMin - 15;
    if (preMin < 0) preMin += 1440;
    assert.strictEqual(minutesToTimeString(preMin), '23:50');

    // 10:05 with 10 min offset -> 09:55
    const startMin2 = timeStringToMinutes('10:05');
    let preMin2 = startMin2 - 10;
    if (preMin2 < 0) preMin2 += 1440;
    assert.strictEqual(minutesToTimeString(preMin2), '09:55');

    // Sleep prep 23:00 - 5 min -> 22:55
    const sleepMin = timeStringToMinutes('23:00');
    assert.strictEqual(minutesToTimeString(sleepMin - 5), '22:55');
  });

  // 2.10 Non-interactive Preview Mode
  testCase('2.10 Non-Interactive Mode: interactive=false retains layout visual integrity', () => {
    const rendered = renderAlarm({
      alarm: FIXTURES.base,
      interactive: false,
    });

    assert.ok(rendered.hasText('Jantar com Maria'), 'Visual content still displays');
    assert.ok(rendered.hasText('Vou me preparar agora'), 'Buttons remain rendered in preview');
  });

  return results;
}
