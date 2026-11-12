// tests/e2e/harness.ts
// E2E Test Harness & Utilities for TimeNest Alarms

import React from 'react';
import { renderToString } from 'react-dom/server';
import type { ActiveAlarm } from '../../src/contexts/AlarmManagerContext';
import { AlarmVisualDisplay, AlarmVisualDisplayProps } from '../../src/components/AlarmVisualDisplay';

export interface TestResult {
  name: string;
  tier: 1 | 2 | 3 | 4;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: string;
}

export interface HtmlQueryWrapper {
  html: string;
  hasText: (text: string) => boolean;
  hasTagWithClass: (tag: string, className: string) => boolean;
  hasClass: (className: string) => boolean;
  matchesRegex: (pattern: RegExp) => boolean;
  extractText: () => string;
}

/**
 * Renders an AlarmVisualDisplay to HTML string and provides query helpers
 */
export function renderAlarm(props: AlarmVisualDisplayProps): HtmlQueryWrapper {
  const html = renderToString(React.createElement(AlarmVisualDisplay, props));

  return {
    html,
    hasText: (text: string) => html.includes(text),
    hasTagWithClass: (tag: string, className: string) => {
      const regex = new RegExp(`<${tag}[^>]*class="[^"]*\\b${className}\\b[^"]*"`, 'i');
      return regex.test(html);
    },
    hasClass: (className: string) => {
      const regex = new RegExp(`class="[^"]*\\b${className}\\b[^"]*"`, 'i');
      return regex.test(html);
    },
    matchesRegex: (pattern: RegExp) => pattern.test(html),
    extractText: () => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
}

/**
 * Standard test fixtures based on concept arts
 */
export const FIXTURES = {
  // 00 Base reference
  base: {
    id: 'fixture-00-base',
    type: 'event' as const,
    intent: 'pre-event' as const,
    title: 'Jantar com Maria',
    durationOrTime: '19:30',
    metadata: 'Evento · Google Agenda',
    badge: 'EM 15 MIN',
    ctaText: 'Vou me preparar agora',
    sound: 'gentle' as const,
    visual: 'minimal' as const,
  },
  // 01 Task starts now
  taskNow: {
    id: 'fixture-01-task',
    type: 'task' as const,
    intent: 'task-now' as const,
    title: 'Editar vídeo',
    durationOrTime: '45 min',
    metadata: 'Tarefa · Projeto Trabalho',
    badge: 'AGORA',
    ctaText: 'Começar foco agora',
    sound: 'chime' as const,
    visual: 'minimal' as const,
  },
  // 02 Pre-event 15 min
  preEvent: {
    id: 'fixture-02-pre-event',
    type: 'event' as const,
    intent: 'pre-event' as const,
    title: 'Jantar com Maria',
    durationOrTime: '19:30',
    metadata: 'Evento · Google Agenda',
    badge: 'EM 15 MIN',
    ctaText: 'Vou me preparar agora',
    sound: 'gentle' as const,
    visual: 'minimal' as const,
  },
  // 03 Critical urgent alarm
  critical: {
    id: 'fixture-03-critical',
    type: 'event' as const,
    intent: 'critical' as const,
    title: 'Consulta médica',
    durationOrTime: '14:30',
    metadata: 'Hospital Sírio-Libanês',
    badge: 'URGENTE',
    ctaText: 'Estou saindo agora',
    sound: 'radar' as const,
    visual: 'minimal' as const,
  },
  // Medication alarm
  medication: {
    id: 'fixture-medication',
    type: 'medication' as const,
    intent: 'critical' as const,
    title: 'Venvanse 50mg',
    durationOrTime: '08:00',
    metadata: 'Tomar com água após o café da manhã',
    badge: '💊 MEDICAMENTO',
    ctaText: 'Tomar agora',
    sound: 'chime' as const,
    visual: 'minimal' as const,
  },
  // Wake-up morning alarm
  wake: {
    id: 'fixture-wake',
    type: 'wake' as const,
    intent: 'critical' as const,
    title: 'Hora de Acordar',
    durationOrTime: '07:00',
    metadata: 'Despertador Matinal',
    badge: '☀️ HORA DE ACORDAR',
    ctaText: 'Acordei! Iniciar dia',
    sound: 'chime' as const,
    visual: 'minimal' as const,
  },
  // Bedtime routine alarm
  sleep: {
    id: 'fixture-sleep',
    type: 'sleep' as const,
    intent: 'pre-event' as const,
    title: 'Hora de Dormir',
    durationOrTime: '23:00',
    metadata: 'Rotina de Sono',
    badge: '🌙 HORA DE DORMIR',
    ctaText: 'Vou me preparar agora',
    sound: 'gentle' as const,
    visual: 'minimal' as const,
  },
  // Gamified 2-tap alarm
  gamified: {
    id: 'fixture-gamified',
    type: 'wake' as const,
    intent: 'task-now' as const,
    title: 'Despertar com Foco',
    durationOrTime: '06:30',
    metadata: 'Desafio Anti-Procrastinação',
    badge: 'DESAFIO',
    ctaText: 'Toque 2x para Despertar',
    sound: 'radar' as const,
    visual: 'gamified' as const,
  }
};

/**
 * Mock implementation of AlarmManager state machine for E2E testing
 */
export class MockAlarmManager {
  public activeAlarm: ActiveAlarm | null = null;
  public snoozeQueue: Array<{ id: string; alarm: ActiveAlarm; triggerAt: number }> = [];
  public focusTimerActive: boolean = false;
  public focusTimerDuration: number = 0;
  public activeTab: string = 'timeline';
  public ambientSound: string | null = null;
  public audioStopped: boolean = false;
  public wakeLockReleased: boolean = false;
  public isCleanMode: boolean = false;
  public lastNotification: { title: string; options?: any } | null = null;
  public celebrationPlayed: boolean = false;

  constructor(initialAlarm: ActiveAlarm | null = null) {
    this.activeAlarm = initialAlarm;
  }

  public dismissAlarm() {
    this.audioStopped = true;
    this.activeAlarm = null;
  }

  public snoozeAlarm(minutes: number | 'task_end', currentTime = Date.now()) {
    if (!this.activeAlarm) return;
    this.audioStopped = true;

    let delayMs = 5 * 60000;
    let label = '+5 min';

    if (minutes === 'task_end') {
      delayMs = 25 * 60000;
      label = 'Quando terminar a tarefa atual';
    } else {
      delayMs = minutes * 60000;
      label = `+${minutes} min`;
    }

    const triggerAt = currentTime + delayMs;
    const snoozedAlarm = { ...this.activeAlarm };

    // Anti-duplication in snooze queue: replace old entry if existing
    this.snoozeQueue = [
      ...this.snoozeQueue.filter(item => item.alarm.id !== snoozedAlarm.id),
      {
        id: 'snooze-' + currentTime,
        alarm: snoozedAlarm,
        triggerAt,
      }
    ];

    this.lastNotification = {
      title: 'Alarme Adiado',
      options: { body: `"${snoozedAlarm.title}" foi adiado (${label}).` }
    };

    this.activeAlarm = null;
  }

  public handleDifficulty(reason: 'no-start' | 'finishing-other' | 'tired' | 'distracted', currentTime = Date.now()) {
    if (!this.activeAlarm) return;
    this.audioStopped = true;
    const curr = { ...this.activeAlarm };
    this.activeAlarm = null;

    switch (reason) {
      case 'finishing-other':
        this.snoozeQueue.push({
          id: 'snooze-' + currentTime,
          alarm: curr,
          triggerAt: currentTime + 5 * 60000,
        });
        this.lastNotification = {
          title: 'Foco mantido',
          options: { body: `Tudo bem! Te lembrarei de "${curr.title}" em 5 minutos para terminar o que está fazendo.` }
        };
        break;

      case 'tired':
        this.snoozeQueue.push({
          id: 'snooze-' + currentTime,
          alarm: curr,
          triggerAt: currentTime + 15 * 60000,
        });
        this.lastNotification = {
          title: 'Pausa merecida',
          options: { body: 'Descanse um pouco e beba uma água. Retomamos em 15 minutos!' }
        };
        break;

      case 'distracted':
        this.activeTab = 'focus';
        this.ambientSound = 'waves';
        this.lastNotification = {
          title: 'Retomando o foco',
          options: { body: 'Sem culpa! Entrando no modo foco com som suave.' }
        };
        break;

      case 'no-start':
        this.focusTimerActive = true;
        this.focusTimerDuration = 5; // 5-minute micro-step rule
        this.activeTab = 'focus';
        this.lastNotification = {
          title: 'Micro-passo de 5 min',
          options: { body: 'Regra dos 5 minutos: faça apenas o primeiro passo sem pressão!' }
        };
        break;
    }
  }

  public executePrimaryAction() {
    if (!this.activeAlarm) return;
    this.audioStopped = true;
    this.wakeLockReleased = true;
    const current = { ...this.activeAlarm };
    this.activeAlarm = null;

    if (current.type === 'task') {
      this.focusTimerActive = true;
      this.focusTimerDuration = 25;
      this.activeTab = 'focus';
    } else if (current.type === 'wake') {
      this.celebrationPlayed = true;
      this.activeTab = 'timeline';
    } else if (current.type === 'sleep') {
      this.isCleanMode = true;
    } else if (current.type === 'medication') {
      this.celebrationPlayed = true;
    }
  }

  public tickQueue(currentTime: number) {
    if (this.activeAlarm) return null;
    const readyIdx = this.snoozeQueue.findIndex(item => item.triggerAt <= currentTime);
    if (readyIdx !== -1) {
      const readyItem = this.snoozeQueue[readyIdx];
      this.snoozeQueue.splice(readyIdx, 1);
      this.activeAlarm = readyItem.alarm;
      return readyItem.alarm;
    }
    return null;
  }
}
