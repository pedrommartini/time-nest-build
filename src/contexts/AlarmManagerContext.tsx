import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { usePreferences } from './PreferencesContext';
import type { AlarmSoundType, AlarmVisualType } from './PreferencesContext';
import { useMedication } from './MedicationContext';
import { useCalendar } from './CalendarContext';
import { useTasks } from './TasksContext';
import { useFocus } from './FocusContext';
import { useNavigation } from './NavigationContext';
import { scheduleEventAlarm, cancelEventAlarm } from '../utils/alarms';
import { 
  showWebNotification, 
  requestNotificationPermissions, 
  getNotificationPermissionStatus
} from '../utils/notifications';
import { audio } from '../utils/audio';
import { getLocalDateString, timeStringToMinutes, minutesToTimeString } from '../utils/time';
import { Capacitor } from '@capacitor/core';

export interface ActiveAlarm {
  id: string;
  type: 'sleep' | 'wake' | 'medication' | 'event' | 'task' | 'test';
  intent: 'pre-event' | 'task-now' | 'critical' | 'test';
  title: string;
  metadata?: string;
  durationOrTime?: string;
  sound: AlarmSoundType;
  visual: AlarmVisualType;
  badge?: string;
  ctaText?: string;
  targetId?: string;
}

interface SnoozeEntry {
  id: string;
  alarm: ActiveAlarm;
  triggerAt: number;
}

interface AlarmManagerContextType {
  activeAlarm: ActiveAlarm | null;
  dismissAlarm: () => void;
  snoozeAlarm: (minutes: number | 'task_end') => void;
  handleDifficulty: (reason: 'no-start' | 'finishing-other' | 'tired' | 'distracted') => void;
  executePrimaryAction: () => void;
  testAlarm: (type?: 'test' | 'event' | 'task' | 'sleep' | 'wake' | 'medication', delaySeconds?: number) => void;
  triggerAlarmImmediate: (alarm: Partial<ActiveAlarm>) => void;
  permissionStatus: 'granted' | 'denied' | 'default' | 'unsupported';
  requestNotificationPermission: () => Promise<boolean>;
  snoozedAlarmsCount: number;
}

const AlarmManagerContext = createContext<AlarmManagerContextType | undefined>(undefined);

export const AlarmManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    sleepStart, sleepEnd, sleepAlarmEnabled, sleep5MinAlarmEnabled, wakeAlarmEnabled, 
    alarmSound, alarmVisual, globalAlarmsEnabled 
  } = usePreferences();
  const { medications } = useMedication();
  const { events } = useCalendar();
  const { tasks } = useTasks();
  const { startTimer } = useFocus();
  const { setActiveTab, setIsCleanMode } = useNavigation();
  
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [snoozeQueue, setSnoozeQueue] = useState<SnoozeEntry[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>(getNotificationPermissionStatus());
  
  // Track fired alarms per minute to prevent duplicate firing in the same minute
  const triggeredKeysRef = useRef<Set<string>>(new Set());
  const wakeLockRef = useRef<any>(null);

  // Keep permission status updated
  useEffect(() => {
    setPermissionStatus(getNotificationPermissionStatus());
  }, []);

  const requestNotificationPermission = async (): Promise<boolean> => {
    const granted = await requestNotificationPermissions();
    setPermissionStatus(getNotificationPermissionStatus());
    return granted;
  };

  // Sound & Wake Lock management on activeAlarm change
  useEffect(() => {
    if (activeAlarm) {
      // 1. Play audio
      audio.playAlarm(activeAlarm.sound, activeAlarm.intent === 'critical');
      audio.vibrate(activeAlarm.intent === 'critical' ? 'critical' : (activeAlarm.intent === 'task-now' ? 'task' : 'normal'));

      // 2. Request Web WakeLock so screen doesn't turn off
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        (navigator as any).wakeLock.request('screen')
          .then((lock: any) => {
            wakeLockRef.current = lock;
          })
          .catch(() => {});
      }

      // 3. Web Notification if document is backgrounded
      if (typeof document !== 'undefined' && document.hidden) {
        showWebNotification(activeAlarm.title, {
          body: `${activeAlarm.metadata || ''} ${activeAlarm.durationOrTime ? '• ' + activeAlarm.durationOrTime : ''}`,
          tag: activeAlarm.id,
          requireInteraction: true
        });
      }
    } else {
      audio.stopAlarm();
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch (e) {}
        wakeLockRef.current = null;
      }
    }

    return () => {
      audio.stopAlarm();
    };
  }, [activeAlarm]);

  // Synchronize Native Alarms for Sleep and Medications on Android Capacitor
  useEffect(() => {
    const syncNativeAlarms = async () => {
      // Bedtime Alarm
      if (sleepAlarmEnabled && sleepStart) {
        const [sH, sM] = sleepStart.split(':').map(Number);
        const now = new Date();
        const sleepDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sH, sM, 0);
        
        const targetDate = sleep5MinAlarmEnabled 
          ? new Date(sleepDate.getTime() - 5 * 60000)
          : sleepDate;

        if (targetDate.getTime() <= Date.now()) {
          targetDate.setDate(targetDate.getDate() + 1);
        }

        await scheduleEventAlarm(
          'sleep_bedtime_alarm',
          'Hora de Dormir',
          targetDate,
          sleep5MinAlarmEnabled ? `Preparação para dormir (${sleepStart})` : `Hora de dormir (${sleepStart})`,
          'sleep',
          sleepStart,
          'HORA DE DORMIR'
        );
      } else {
        await cancelEventAlarm('sleep_bedtime_alarm');
        await cancelEventAlarm('sleep_routine_alarm');
      }

      // Wake-up Alarm (Despertador)
      if (wakeAlarmEnabled && sleepEnd) {
        const [wH, wM] = sleepEnd.split(':').map(Number);
        const now = new Date();
        const wakeDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), wH, wM, 0);
        
        if (wakeDate.getTime() <= Date.now()) {
          wakeDate.setDate(wakeDate.getDate() + 1);
        }

        await scheduleEventAlarm(
          'sleep_wakeup_alarm',
          'Hora de Acordar',
          wakeDate,
          `Bom dia! Hora de despertar (${sleepEnd})`,
          'wake',
          sleepEnd,
          'DESPERTADOR'
        );
      } else {
        await cancelEventAlarm('sleep_wakeup_alarm');
      }

      // Medications Alarms
      for (const med of medications) {
        if (med.alarmEnabled !== false && med.time) {
          const [mH, mM] = med.time.split(':').map(Number);
          const now = new Date();
          const medDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), mH, mM, 0);
          if (medDate.getTime() <= Date.now()) {
            medDate.setDate(medDate.getDate() + 1);
          }

          await scheduleEventAlarm(
            med.id,
            med.name,
            medDate,
            `Hora do medicamento: ${med.name}`,
            'medication',
            med.time,
            'MEDICAMENTO'
          );
        }
      }
    };

    syncNativeAlarms();
  }, [sleepStart, sleepEnd, sleepAlarmEnabled, sleep5MinAlarmEnabled, wakeAlarmEnabled, medications]);

  // Snooze Queue Monitor (runs every 1s)
  useEffect(() => {
    const snoozeInterval = setInterval(() => {
      if (snoozeQueue.length === 0 || activeAlarm) return;
      const now = Date.now();
      const readyItem = snoozeQueue.find(item => item.triggerAt <= now);
      if (readyItem) {
        setSnoozeQueue(prev => prev.filter(item => item.id !== readyItem.id));
        setActiveAlarm(readyItem.alarm);
      }
    }, 1000);

    return () => clearInterval(snoozeInterval);
  }, [snoozeQueue, activeAlarm]);

  // Web & In-App Alarm Evaluation Loop (runs every 3s)
  useEffect(() => {
    const checkScheduledAlarms = () => {
      if (activeAlarm) return;

      const now = new Date();
      const today = getLocalDateString(now);
      const currentH = String(now.getHours()).padStart(2, '0');
      const currentM = String(now.getMinutes()).padStart(2, '0');
      const currentHm = `${currentH}:${currentM}`;

      // Helper to avoid duplicate fires in the same minute
      const hasFired = (key: string) => triggeredKeysRef.current.has(key);
      const markFired = (key: string) => {
        triggeredKeysRef.current.add(key);
        // Clear old keys periodically
        if (triggeredKeysRef.current.size > 200) {
          triggeredKeysRef.current.clear();
          triggeredKeysRef.current.add(key);
        }
      };

      // 1. Check Bedtime Routine
      if (sleepAlarmEnabled && sleepStart) {
        const sleepMin = timeStringToMinutes(sleepStart);
        const targetMin = sleep5MinAlarmEnabled ? sleepMin - 5 : sleepMin;
        const targetHm = minutesToTimeString(targetMin < 0 ? targetMin + 1440 : targetMin);

        if (currentHm === targetHm) {
          const key = `sleep-${today}-${currentHm}`;
          if (!hasFired(key)) {
            markFired(key);
            setActiveAlarm({
              id: 'sleep-' + Date.now(),
              type: 'sleep',
              intent: 'pre-event',
              badge: sleep5MinAlarmEnabled ? 'EM 5 MIN' : 'HORA DE DORMIR',
              title: sleep5MinAlarmEnabled ? 'Preparação para dormir' : 'Hora de dormir',
              durationOrTime: sleepStart,
              metadata: 'Rotina de Sono',
              ctaText: 'Vou me preparar agora',
              sound: alarmSound,
              visual: alarmVisual
            });
            return;
          }
        }
      }

      // 2. Check Wake-up Despertador
      if (wakeAlarmEnabled && sleepEnd) {
        if (currentHm === sleepEnd) {
          const key = `wake-${today}-${currentHm}`;
          if (!hasFired(key)) {
            markFired(key);
            setActiveAlarm({
              id: 'wake-' + Date.now(),
              type: 'wake',
              intent: 'critical',
              badge: '☀️ DESPERTADOR',
              title: 'Hora de Acordar',
              durationOrTime: sleepEnd,
              metadata: 'Despertador Matinal',
              ctaText: 'Acordei! Iniciar dia',
              sound: alarmSound,
              visual: alarmVisual
            });
            return;
          }
        }
      }

      // 3. Check Medications
      for (const med of medications) {
        if (med.alarmEnabled !== false && med.time === currentHm) {
          const key = `med-${med.id}-${today}-${currentHm}`;
          if (!hasFired(key)) {
            markFired(key);
            setActiveAlarm({
              id: 'med-' + med.id + '-' + Date.now(),
              type: 'medication',
              intent: 'critical',
              badge: '💊 MEDICAMENTO',
              title: med.name,
              durationOrTime: med.time,
              metadata: 'Lembrete de Medicamento',
              ctaText: 'Tomar agora',
              targetId: med.id,
              sound: alarmSound,
              visual: alarmVisual
            });
            return;
          }
        }
      }

      // 4. Check Calendar Events (Timeline)
      for (const event of events) {
        if (event.date === today && !event.completed) {
          const shouldAlarm = globalAlarmsEnabled || event.alarmEnabled;
          if (!shouldAlarm) continue;

          const startMin = timeStringToMinutes(event.start);
          const offset = event.notificationOffset || 5;
          const preEventMin = startMin - offset;
          const preEventHm = minutesToTimeString(preEventMin < 0 ? preEventMin + 1440 : preEventMin);

          // A: 5-min/15-min Pre-Event Alarm
          if (currentHm === preEventHm && offset > 0) {
            const key = `event-pre-${event.id}-${today}-${currentHm}`;
            if (!hasFired(key)) {
              markFired(key);
              setActiveAlarm({
                id: 'event-pre-' + event.id + '-' + Date.now(),
                type: 'event',
                intent: 'pre-event',
                badge: `EM ${offset} MIN`,
                title: event.title,
                durationOrTime: event.start,
                metadata: `Evento · ${event.source === 'google' ? 'Google Agenda' : 'TimeNest'}`,
                ctaText: 'Vou me preparar agora',
                targetId: event.id,
                sound: alarmSound,
                visual: alarmVisual
              });
              return;
            }
          }

          // B: Event Starts Now Alarm
          if (currentHm === event.start) {
            const key = `event-now-${event.id}-${today}-${currentHm}`;
            if (!hasFired(key)) {
              markFired(key);
              setActiveAlarm({
                id: 'event-now-' + event.id + '-' + Date.now(),
                type: 'event',
                intent: 'pre-event',
                badge: 'AGORA',
                title: event.title,
                durationOrTime: event.start,
                metadata: `Evento · Começa agora`,
                ctaText: 'Vou me preparar agora',
                targetId: event.id,
                sound: alarmSound,
                visual: alarmVisual
              });
              return;
            }
          }
        }
      }

      // 5. Check Tasks
      for (const task of tasks) {
        if (task.status !== 'completed') {
          const shouldAlarm = globalAlarmsEnabled || task.alarmEnabled;
          if (!shouldAlarm) continue;

          // If task has notificationOffset or scheduled time
          if (task.notificationOffset) {
            // Task alarm check
          }
        }
      }
    };

    const intervalId = setInterval(checkScheduledAlarms, 3000);
    checkScheduledAlarms();

    return () => clearInterval(intervalId);
  }, [
    activeAlarm, sleepStart, sleepEnd, sleepAlarmEnabled, sleep5MinAlarmEnabled, 
    wakeAlarmEnabled, medications, events, tasks, globalAlarmsEnabled, alarmSound, alarmVisual
  ]);

  const dismissAlarm = useCallback(() => {
    audio.playClick();
    audio.stopAlarm();
    setActiveAlarm(null);
  }, []);

  const snoozeAlarm = useCallback((minutes: number | 'task_end') => {
    if (!activeAlarm) return;
    audio.playClick();
    audio.stopAlarm();

    let delayMs = 5 * 60000;
    let label = '+5 min';

    if (minutes === 'task_end') {
      delayMs = 25 * 60000;
      label = 'Quando terminar a tarefa atual';
    } else {
      delayMs = minutes * 60000;
      label = `+${minutes} min`;
    }

    const triggerAt = Date.now() + delayMs;
    const snoozedAlarm = { ...activeAlarm };

    setSnoozeQueue(prev => [
      ...prev.filter(item => item.alarm.id !== snoozedAlarm.id),
      {
        id: 'snooze-' + Date.now(),
        alarm: snoozedAlarm,
        triggerAt
      }
    ]);

    setActiveAlarm(null);
    showWebNotification('Alarme Adiado', {
      body: `"${snoozedAlarm.title}" foi adiado (${label}).`,
      tag: 'snooze-notice'
    });
  }, [activeAlarm]);

  const handleDifficulty = useCallback((reason: 'no-start' | 'finishing-other' | 'tired' | 'distracted') => {
    if (!activeAlarm) return;
    audio.playClick();
    audio.stopAlarm();

    const curr = { ...activeAlarm };
    setActiveAlarm(null);

    switch (reason) {
      case 'finishing-other':
        // Friendly 5-min snooze
        setSnoozeQueue(prev => [
          ...prev,
          {
            id: 'snooze-' + Date.now(),
            alarm: curr,
            triggerAt: Date.now() + 5 * 60000
          }
        ]);
        showWebNotification('Foco mantido', {
          body: `Tudo bem! Te lembrarei de "${curr.title}" em 5 minutos para terminar o que está fazendo.`,
          tag: 'adhd-support'
        });
        break;

      case 'tired':
        // 15-min rest
        setSnoozeQueue(prev => [
          ...prev,
          {
            id: 'snooze-' + Date.now(),
            alarm: curr,
            triggerAt: Date.now() + 15 * 60000
          }
        ]);
        showWebNotification('Pausa merecida', {
          body: 'Descanse um pouco e beba uma água. Retomamos em 15 minutos!',
          tag: 'adhd-support'
        });
        break;

      case 'distracted':
        // Immediate low-friction redirect to focus
        setActiveTab('focus');
        audio.playAmbient('waves', 0.4);
        showWebNotification('Retomando o foco', {
          body: 'Sem culpa! Entrando no modo foco com som suave.',
          tag: 'adhd-support'
        });
        break;

      case 'no-start':
        // Micro-step in focus mode
        const targetTask = tasks.find(t => t.id === curr.targetId) || null;
        startTimer(targetTask, 5); // 5-minute micro-start rule!
        setActiveTab('focus');
        showWebNotification('Micro-passo de 5 min', {
          body: 'Regra dos 5 minutos: faça apenas o primeiro passo sem pressão!',
          tag: 'adhd-support'
        });
        break;
    }
  }, [activeAlarm, tasks, startTimer, setActiveTab]);

  const executePrimaryAction = useCallback(() => {
    if (!activeAlarm) return;
    audio.playClick();
    audio.stopAlarm();
    const current = { ...activeAlarm };
    setActiveAlarm(null);

    if (current.type === 'task') {
      const task = tasks.find(t => t.id === current.targetId) || null;
      startTimer(task, task?.estimatedDuration || 25);
      setActiveTab('focus');
      audio.playChimeDone();
    } else if (current.type === 'wake') {
      audio.playCelebration();
      setActiveTab('timeline');
    } else if (current.type === 'sleep') {
      audio.playChimeDone();
      setIsCleanMode(true);
    } else if (current.type === 'medication') {
      audio.playCelebration();
    } else {
      audio.playChimeDone();
    }
  }, [activeAlarm, tasks, startTimer, setActiveTab, setIsCleanMode]);

  const triggerAlarmImmediate = useCallback((alarm: Partial<ActiveAlarm>) => {
    setActiveAlarm({
      id: 'imm-' + Date.now(),
      type: alarm.type || 'test',
      intent: alarm.intent || 'test',
      title: alarm.title || 'Alarme TimeNest',
      metadata: alarm.metadata || 'Disparo imediato',
      durationOrTime: alarm.durationOrTime || 'Agora',
      badge: alarm.badge,
      ctaText: alarm.ctaText,
      targetId: alarm.targetId,
      sound: alarmSound,
      visual: alarmVisual
    });
  }, [alarmSound, alarmVisual]);

  const testAlarm = useCallback(async (
    type: 'test' | 'event' | 'task' | 'sleep' | 'wake' | 'medication' = 'test', 
    delaySeconds: number = 0
  ) => {
    const scheduledTime = new Date(Date.now() + (delaySeconds > 0 ? delaySeconds * 1000 : 0));
    const testTimeStr = `${String(scheduledTime.getHours()).padStart(2, '0')}:${String(scheduledTime.getMinutes()).padStart(2, '0')}`;

    let title = 'Teste de Alarme';
    let message = 'Este é um teste do sistema de alarmes TimeNest';
    let intentType: 'test' | 'critical' | 'pre-event' | 'task-now' = 'test';
    let badge = 'TESTE';
    let ctaText = 'Ok, entendi';
    let durationOrTime = testTimeStr;

    if (type === 'task') {
      title = 'Editar vídeo do canal';
      durationOrTime = '45 min';
      message = 'Tarefa · Projeto Trabalho';
      intentType = 'task-now';
      badge = 'HORA DO FOCO';
      ctaText = 'Começar foco agora';
    } else if (type === 'event') {
      title = 'Jantar com Maria';
      durationOrTime = '19:30';
      message = 'Evento · Google Agenda';
      intentType = 'pre-event';
      badge = 'EM 15 MIN';
      ctaText = 'Vou me preparar agora';
    } else if (type === 'medication') {
      title = 'Vitamina D 2000UI';
      durationOrTime = '08:00';
      message = 'Lembrete de Medicamento';
      intentType = 'critical';
      badge = '💊 MEDICAMENTO';
      ctaText = 'Tomar agora';
    } else if (type === 'sleep') {
      title = 'Hora de Dormir';
      durationOrTime = sleepStart || '23:00';
      message = 'Rotina Noturna de Sono';
      intentType = 'pre-event';
      badge = '🌙 HORA DE DORMIR';
      ctaText = 'Vou me preparar agora';
    } else if (type === 'wake') {
      title = 'Hora de Acordar';
      durationOrTime = sleepEnd || '07:00';
      message = 'Bom dia! Hora de despertar';
      intentType = 'critical';
      badge = '☀️ DESPERTADOR';
      ctaText = 'Acordei! Iniciar dia';
    }

    // Schedule native alarm if on Android
    if (delaySeconds > 0) {
      try {
        await scheduleEventAlarm(
          'test_alarm_' + Date.now(),
          title,
          scheduledTime,
          message,
          type,
          durationOrTime,
          badge
        );
      } catch (e) {}

      setTimeout(() => {
        try {
          if (Capacitor.isNativePlatform()) return;
        } catch (e) {}

        setActiveAlarm({
          id: 'test-' + Date.now(),
          type,
          intent: intentType,
          title,
          metadata: message,
          durationOrTime,
          badge,
          ctaText,
          sound: alarmSound,
          visual: alarmVisual
        });
      }, delaySeconds * 1000);
    } else {
      // Fire immediately
      setActiveAlarm({
        id: 'test-imm-' + Date.now(),
        type,
        intent: intentType,
        title,
        metadata: message,
        durationOrTime,
        badge,
        ctaText,
        sound: alarmSound,
        visual: alarmVisual
      });
    }
  }, [sleepStart, sleepEnd, alarmSound, alarmVisual]);

  return (
    <AlarmManagerContext.Provider value={{ 
      activeAlarm, 
      dismissAlarm, 
      snoozeAlarm, 
      handleDifficulty, 
      executePrimaryAction, 
      testAlarm, 
      triggerAlarmImmediate,
      permissionStatus,
      requestNotificationPermission,
      snoozedAlarmsCount: snoozeQueue.length
    }}>
      {children}
    </AlarmManagerContext.Provider>
  );
};

export const useAlarmManager = () => {
  const context = useContext(AlarmManagerContext);
  if (!context) {
    throw new Error('useAlarmManager must be used within an AlarmManagerProvider');
  }
  return context;
};
