import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePreferences } from './PreferencesContext';
import { useMedication } from './MedicationContext';

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

  const testAlarm = async () => {
    // Fire native test alarm in 10 seconds so the screen wakes up
    const scheduledTime = new Date(Date.now() + 10000);
    
    // We import scheduleEventAlarm locally to avoid circular dependencies if any
    try {
      const { scheduleEventAlarm } = await import('../utils/alarms');
      await scheduleEventAlarm('test-task', 'Teste de Alarme', scheduledTime, 'Este é apenas um teste de 10s', 'test');
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
        metadata: 'Este é apenas um teste de 10s',
        durationOrTime: 'Agora',
        sound: alarmSound,
        visual: alarmVisual
      });
    }, 10000);
  };

  useEffect(() => {
    const checkAlarms = () => {
      // Don't check if an alarm is already active
      if (activeAlarm) return;

      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const currentHm = `${h}:${m}`;
      
      // Prevent triggering the same alarm multiple times in the same minute
      if (lastTriggeredMinute === currentHm) return;

      let triggered = false;

      // 1. Check Sleep Alarm (5 mins before sleepStart)
      if (sleepAlarmEnabled && sleepStart) {
        const [sH, sM] = sleepStart.split(':').map(Number);
        const sleepDate = new Date();
        sleepDate.setHours(sH, sM, 0, 0);
        
        // Subtract 5 mins
        const prepDate = new Date(sleepDate.getTime() - 5 * 60000);
        const prepHm = `${String(prepDate.getHours()).padStart(2, '0')}:${String(prepDate.getMinutes()).padStart(2, '0')}`;
        
        if (currentHm === prepHm) {
          setActiveAlarm({
            id: 'sleep-' + Date.now(),
            type: 'sleep',
            intent: 'pre-event',
            title: 'Preparação para dormir',
            durationOrTime: `Em 5 min (${sleepStart})`,
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
        const med = medications.find(m => m.time === currentHm);
        if (med) {
          setActiveAlarm({
            id: 'med-' + med.id + '-' + Date.now(),
            type: 'medication',
            intent: 'critical', // medications are usually important
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
