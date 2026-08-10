import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePreferences } from './PreferencesContext';
import { useMedication } from './MedicationContext';

export interface ActiveAlarm {
  id: string;
  type: 'sleep' | 'medication';
  title: string;
  sound: 'chime' | 'rain' | 'forest' | 'waves';
  visual: 'minimal' | 'gamified';
}

interface AlarmManagerContextType {
  activeAlarm: ActiveAlarm | null;
  dismissAlarm: () => void;
}

const AlarmManagerContext = createContext<AlarmManagerContextType | undefined>(undefined);

export const AlarmManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sleepStart, sleepAlarmEnabled, alarmSound, alarmVisual } = usePreferences();
  const { medications } = useMedication();
  
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(null);
  const [lastTriggeredMinute, setLastTriggeredMinute] = useState<string>('');

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
            title: 'Prepare-se para dormir em 5 minutos',
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
            title: `Hora do medicamento: ${med.name}`,
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
    <AlarmManagerContext.Provider value={{ activeAlarm, dismissAlarm }}>
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
