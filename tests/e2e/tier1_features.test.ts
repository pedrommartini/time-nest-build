// tests/e2e/tier1_features.test.ts
// Tier 1: Feature Coverage Tests for TimeNest Full-Screen Alarms

import assert from 'node:assert';
import { renderAlarm, FIXTURES, TestResult } from './harness';

export function runTier1Tests(): TestResult[] {
  const results: TestResult[] = [];

  function testCase(name: string, fn: () => void) {
    const start = performance.now();
    try {
      fn();
      results.push({
        name,
        tier: 1,
        passed: true,
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        name,
        tier: 1,
        passed: false,
        durationMs: performance.now() - start,
        error: err.message,
      });
    }
  }

  // 1.1 State 0: Reference Visual Base Layout
  testCase('1.1 State 0 (Base Reference): Renders centered layout, title, time, and metadata', () => {
    const rendered = renderAlarm({
      alarm: FIXTURES.base,
      theme: 'light',
    });

    assert.ok(rendered.hasText('Jantar com Maria'), 'Should contain title');
    assert.ok(rendered.hasText('19:30'), 'Should contain time');
    assert.ok(rendered.hasText('Evento · Google Agenda'), 'Should contain metadata');
    assert.ok(rendered.hasText('EM 15 MIN'), 'Should contain badge');
    assert.ok(rendered.hasText('Vou me preparar agora'), 'Should contain CTA');
    assert.ok(rendered.hasText('+5 min'), 'Should contain secondary action');
    assert.ok(rendered.hasText('Dispensar'), 'Should contain tertiary action');
  });

  // 1.2 State 1: Task Starts Now Layout
  testCase('1.2 State 1 (Task Starts Now): Renders AGORA badge, task duration, and ADHD difficulty link', () => {
    const rendered = renderAlarm({
      alarm: FIXTURES.taskNow,
      theme: 'light',
    });

    assert.ok(rendered.hasText('AGORA'), 'Should contain AGORA badge');
    assert.ok(rendered.hasText('Editar vídeo'), 'Should contain task title');
    assert.ok(rendered.hasText('45 min'), 'Should contain task duration');
    assert.ok(rendered.hasText('Começar foco agora'), 'Should contain task CTA');
    assert.ok(rendered.hasText('+5 min'), 'Should contain secondary snooze');
    assert.ok(rendered.hasText('Não consigo começar'), 'Should offer ADHD difficulty link');
  });

  // 1.3 State 2: Pre-Event 15m Layout
  testCase('1.3 State 2 (Pre-Event 15m): Renders EM 15 MIN badge, scheduled time, and prepare CTA', () => {
    const rendered = renderAlarm({
      alarm: FIXTURES.preEvent,
      theme: 'light',
    });

    assert.ok(rendered.hasText('EM 15 MIN'), 'Should have pre-event badge');
    assert.ok(rendered.hasText('19:30'), 'Should have scheduled time');
    assert.ok(rendered.hasText('Vou me preparar agora'), 'Should have prepare CTA');
    assert.ok(rendered.hasText('+5 min'), 'Should have +5 min snooze');
    assert.ok(rendered.hasText('Dispensar'), 'Should have dismiss button');
  });

  // 1.4 State 3: Critical Alarm Layout
  testCase('1.4 State 3 (Critical Urgent): Renders URGENTE badge, departure CTA, and urgent styling', () => {
    const rendered = renderAlarm({
      alarm: FIXTURES.critical,
      theme: 'light',
    });

    assert.ok(rendered.hasText('URGENTE'), 'Should contain URGENTE badge');
    assert.ok(rendered.hasText('Consulta médica'), 'Should contain event title');
    assert.ok(rendered.hasText('14:30'), 'Should contain appointment time');
    assert.ok(rendered.hasText('Estou saindo agora'), 'Should contain departure CTA');
    assert.ok(rendered.hasText('+5 min'), 'Should have +5 min option');
    assert.ok(rendered.hasText('Não posso ir'), 'Should have critical tertiary action');
    assert.ok(rendered.matchesRegex(/rose|red|orange/i), 'Should utilize warm/urgent color tokens');
  });

  // 1.5 State 4: Dedicated Snooze Screen Layout
  testCase('1.5 State 4 (Dedicated Snooze Screen): Renders 4-pill vertical stack and return link', () => {
    const rendered = renderAlarm({
      alarm: FIXTURES.base,
      screen: 'snooze',
    });

    assert.ok(rendered.hasText('Precisa de mais tempo?'), 'Should show snooze heading');
    assert.ok(rendered.hasText('ADIAR ALARME') || rendered.hasText('ADIAR'), 'Should show snooze badge');
    assert.ok(rendered.hasText('+ 5 minutos') || rendered.hasText('+5 min'), 'Option 1: +5 min');
    assert.ok(rendered.hasText('+ 10 minutos') || rendered.hasText('+10 min'), 'Option 2: +10 min');
    assert.ok(rendered.hasText('+ 15 minutos') || rendered.hasText('+15 min'), 'Option 3: +15 min');
    assert.ok(rendered.hasText('Quando terminar a tarefa atual'), 'Option 4: Contextual task end');
    assert.ok(rendered.hasText('Voltar ao alarme') || rendered.hasText('Voltar'), 'Should have return button');
  });

  // 1.6 State 5: Dedicated ADHD Support Screen Layout
  testCase('1.6 State 5 (Dedicated ADHD Support): Renders 4 empathetic options and return link', () => {
    const rendered = renderAlarm({
      alarm: FIXTURES.taskNow,
      screen: 'difficulty',
    });

    assert.ok(rendered.hasText('O que está dificultando?'), 'Should show difficulty question');
    assert.ok(rendered.hasText('APOIO TDAH') || rendered.hasText('BLOQUEIO'), 'Should show ADHD badge');
    assert.ok(rendered.hasText('Não sei por onde começar'), 'Option 1: Micro-step focus');
    assert.ok(rendered.hasText('Estou terminando outra coisa'), 'Option 2: Finishing other task');
    assert.ok(rendered.hasText('Estou cansado'), 'Option 3: Rest break');
    assert.ok(rendered.hasText('Me distraí'), 'Option 4: Calming restart');
    assert.ok(rendered.hasText('Voltar'), 'Should have return link');
  });

  // 1.7 Concentric Radial Halos & Low-Stimulation Suppression
  testCase('1.7 Concentric Radial Halos: Renders animated halos in standard mode, suppresses in low-stim', () => {
    const normalRender = renderAlarm({
      alarm: FIXTURES.base,
      isLowStimulation: false,
    });
    assert.ok(normalRender.matchesRegex(/pulse-slow|ping-slow|rounded-full.*bg-gradient/i), 'Normal mode should have halos');

    const lowStimRender = renderAlarm({
      alarm: FIXTURES.base,
      isLowStimulation: true,
    });
    assert.ok(!lowStimRender.hasText('animate-pulse-slow'), 'Low-stim mode must suppress pulsing halos');
  });

  // 1.8 Theme Parity (Light vs Dark)
  testCase('1.8 Theme Parity: Correct canvas backgrounds and contrast tokens for light and dark modes', () => {
    const lightRender = renderAlarm({
      alarm: FIXTURES.base,
      theme: 'light',
    });
    assert.ok(lightRender.matchesRegex(/bg-\[#FAF8F5\]|bg-\[#FAF9F6\]/i), 'Light mode off-white background');

    const darkRender = renderAlarm({
      alarm: FIXTURES.base,
      theme: 'dark',
    });
    assert.ok(darkRender.matchesRegex(/bg-\[#14121E\]|bg-\[#120E1F\]/i), 'Dark mode midnight background');
  });

  // 1.9 Container Modes (Fullscreen vs Embedded)
  testCase('1.9 Container Modes: Correct z-index and positioning for fullscreen vs embedded studio preview', () => {
    const fullscreenRender = renderAlarm({
      alarm: FIXTURES.base,
      containerMode: 'fullscreen',
    });
    assert.ok(fullscreenRender.hasTagWithClass('div', 'fixed') || fullscreenRender.hasClass('fixed'), 'Fullscreen should use fixed positioning');
    assert.ok(fullscreenRender.matchesRegex(/z-\[500\]|z-50/i), 'Fullscreen should have high z-index overlay');

    const embeddedRender = renderAlarm({
      alarm: FIXTURES.base,
      containerMode: 'embedded',
    });
    assert.ok(embeddedRender.hasTagWithClass('div', 'absolute') || embeddedRender.hasClass('absolute'), 'Embedded should use absolute positioning');
  });

  return results;
}
