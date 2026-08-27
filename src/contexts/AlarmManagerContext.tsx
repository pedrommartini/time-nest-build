import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePreferences } from './PreferencesContext';
import { useMedication } from './MedicationContext';
import { scheduleEventAlarm, cancelEventAlarm } from '../utils/alarms';

export interface ActiveAlarm {
  id: string;
  type: 'sleep' | 'medication' | 'event' | 'task' | 'test';
  intent: 'pre-event' | 'task-now' | 'critical' | 'test';
  title: string;
  metadata?: string;
  durationOrTime?: string;
  sound: 'chime' | 'rain' | 'forest' | 'waves';
  visual: 'minimal' | 'gamified';
}

interface AlarmManagerContextType {
  activeAlarm: ActiveAlarm | null;
  dismissAlarm: () => void;
  testAlarm: () => void;
}

const AlarmManagerContext = createContext<AlarmManagerContextType | undefined>(undefined);

export const AlarmManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sleepStart, sleepAlarmEnabled, alarmSound, alarmVisual } = usePreferences();
  const { medications } = useMedication();
  
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [lastTriggeredMinute, setLastTriggeredMinute] = useState<string>('');

  // Schedule native sleep alarm when sleep settings change
  useEffect(() => {
    const syncNativeSleepAlarm = async () => {
      if (sleepAlarmEnabled && sleepStart) {
        const [sH, sM] = sleepStart.split(':').map(Number);
        const now = new Date();
        const sleepDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sH, sM, 0);
        
        // 5 minutes before sleep
        const prepDate = new Date(sleepDate.getTime() - 5 * 60000);
        if (prepDate.getTime() <= Date.now()) {
          prepDate.setDate(prepDate.getDate() + 1);
        }

        await scheduleEventAlarm(
          'sleep_routine_alarm',
          'Hora de Dormir',
          prepDate,
          `Preparação para dormir (${sleepStart})`,
          'sleep',
          sleepStart,
          'HORA DE DORMIR'
        );
      } else {
        await cancelEventAlarm('sleep_routine_alarm');
      }
    };

    syncNativeSleepAlarm();
  }, [sleepStart, sleepAlarmEnabled]);

  const testAlarm = async () => {
    // Fire native test alarm in 10 seconds so the screen wakes up
    const scheduledTime = new Date(Date.now() + 10000);
    const testTimeStr = `${String(scheduledTime.getHours()).padStart(2, '0')}:${String(scheduledTime.getMinutes()).padStart(2, '0')}`;
    
    try {
      await scheduleEventAlarm(
        'test_task_alarm', 
        'Teste de Alarme', 
        scheduledTime, 
        'Este é um teste de 10s do Time Nest', 
        'test',
        testTimeStr,
        'TESTE'
      );
    } catch (e) {
      console.error('Failed to schedule native test alarm', e);
    }

    // Still fire the web overlay in 10 seconds if app is open on WEB
    setTimeout(async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) return; // Native alarm takes over
      } catch (e) {
        console.error(e);
      }

      setActiveAlarm({
        id: 'test-' + Date.now(),
        type: 'test',
        intent: 'test',
        title: 'Teste de Alarme',
        metadata: 'Este é um teste de 10s do Time Nest',
        durationOrTime: testTimeStr,
        sound: alarmSound,
        visual: alarmVisual
      });
    }, 10000);
  };

  useEffect(() => {
    const checkAlarms = () => {
      if (activeAlarm) return;

      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const currentHm = `${h}:${m}`;
      
      if (lastTriggeredMinute === currentHm) return;

      let triggered = false;

      // 1. Check Sleep Alarm (5 mins before sleepStart)
      if (sleepAlarmEnabled && sleepStart) {
        const [sH, sM] = sleepStart.split(':').map(Number);
        const sleepDate = new Date();
        sleepDate.setHours(sH, sM, 0, 0);
        
        const prepDate = new Date(sleepDate.getTime() - 5 * 60000);
        const prepHm = `${String(prepDate.getHours()).padStart(2, '0')}:${String(prepDate.getMinutes()).padStart(2, '0')}`;
        
        if (currentHm === prepHm) {
          setActiveAlarm({
            id: 'sleep-' + Date.now(),
            type: 'sleep',
            intent: 'pre-event',
            title: 'Preparação para dormir',
            durationOrTime: sleepStart,
            metadata: 'Rotina de Sono',
            sound: alarmSound,
            visual: alarmVisual
          });
          setLastTriggeredMinute(currentHm);
          triggered = true;
        }
      }

      // 2. Check Medications
      if (!triggered) {
        const med = medications.find(m => m.time === currentHm && m.alarmEnabled !== false);
        if (med) {
          setActiveAlarm({
            id: 'med-' + med.id + '-' + Date.now(),
            type: 'medication',
            intent: 'critical',
            title: med.name,
            durationOrTime: med.time,
            metadata: 'Lembrete de Medicamento',
            sound: alarmSound,
            visual: alarmVisual
          });
          setLastTriggeredMinute(currentHm);
        }
      }
    };

    const intervalId = setInterval(checkAlarms, 10000);
    checkAlarms();

    return () => clearInterval(intervalId);
  }, [sleepStart, sleepAlarmEnabled, medications, alarmSound, alarmVisual, lastTriggeredMinute, activeAlarm]);

  const dismissAlarm = () => {
    setActiveAlarm(null);
  };

  return (
    <AlarmManagerContext.Provider value={{ activeAlarm, dismissAlarm, testAlarm }}>
      {children}
    </AlarmManagerContext.Provider>
  );
};

export const useAlarmManager = () => {
  const context = useContext(AlarmManagerContext);
  if (context === undefined) {
    throw new Error('useAlarmManager must be used within a AlarmManagerProvider');
  }
  return context;
};
