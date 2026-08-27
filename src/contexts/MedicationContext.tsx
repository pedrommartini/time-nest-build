import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { audio } from '../utils/audio';
import { scheduleEventAlarm, cancelEventAlarm } from '../utils/alarms';

export interface Medication {
  id: string;
  name: string;
  time: string; // HH:mm
  recurrence: 'DAILY' | 'WEEKLY' | 'NONE';
  alarmEnabled: boolean;
  notes?: string;
  createdAt: string;
}

interface MedicationContextType {
  medications: Medication[];
  addMedication: (name: string, time: string, alarmEnabled?: boolean, notes?: string) => Promise<string>;
  updateMedication: (id: string, updates: Partial<Omit<Medication, 'id' | 'createdAt'>>) => Promise<void>;
  toggleMedicationAlarm: (id: string) => Promise<void>;
  deleteMedication: (id: string) => Promise<void>;
}

const MedicationContext = createContext<MedicationContextType | undefined>(undefined);

export const MedicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [medications, setMedications] = useState<Medication[]>(() => {
    try {
      const saved = localStorage.getItem('timenest_medications');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('timenest_medications', JSON.stringify(medications));
  }, [medications]);

  const scheduleMedicationAlarm = async (med: Medication) => {
    if (!med.alarmEnabled) return;
    try {
      const [hour, minute] = med.time.split(':').map(Number);
      const now = new Date();
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
      
      // If time today has already passed, schedule for tomorrow
      if (targetDate.getTime() <= Date.now()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      // 1. Schedule Native Fullscreen / Wakelock Alarm
      await scheduleEventAlarm(
        med.id,
        med.name,
        targetDate,
        `Hora do medicamento: ${med.name}`,
        'medication',
        med.time,
        'MEDICAMENTO'
      );

      // 2. Schedule Local Banner Notification as companion
      if (Capacitor.isNativePlatform()) {
        const notifId = Math.abs(hashCode(med.id));
        await LocalNotifications.schedule({
          notifications: [
            {
              title: 'Hora do Medicamento',
              body: `Está na hora de tomar: ${med.name}`,
              id: notifId,
              schedule: { at: targetDate },
              sound: 'chime.wav',
              smallIcon: 'ic_stat_med',
            }
          ]
        });
      }
    } catch (e) {
      console.error('Failed to schedule medication alarm', e);
    }
  };

  const cancelMedicationAlarmHandler = async (id: string) => {
    try {
      // 1. Cancel Native Alarm
      await cancelEventAlarm(id);

      // 2. Cancel Local Notification
      if (Capacitor.isNativePlatform()) {
        const notifId = Math.abs(hashCode(id));
        await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
      }
    } catch (e) {
      console.error('Failed to cancel medication alarm', e);
    }
  };

  const addMedication = async (name: string, time: string, alarmEnabled = true, notes = '') => {
    const id = 'med_' + Date.now();
    const newMed: Medication = {
      id,
      name,
      time,
      recurrence: 'DAILY',
      alarmEnabled,
      notes,
      createdAt: new Date().toISOString()
    };
    
    setMedications(prev => [...prev, newMed]);
    if (alarmEnabled) await scheduleMedicationAlarm(newMed);
    audio.playChimeDone();
    return id;
  };

  const updateMedication = async (id: string, updates: Partial<Omit<Medication, 'id' | 'createdAt'>>) => {
    setMedications(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    
    const med = medications.find(m => m.id === id);
    if (med) {
      await cancelMedicationAlarmHandler(id);
      const updatedMed = { ...med, ...updates };
      if (updatedMed.alarmEnabled) {
        await scheduleMedicationAlarm(updatedMed);
      }
    }
  };

  const toggleMedicationAlarm = async (id: string) => {
    const med = medications.find(m => m.id === id);
    if (!med) return;
    const nextState = !med.alarmEnabled;
    await updateMedication(id, { alarmEnabled: nextState });
    audio.playClick();
  };

  const deleteMedication = async (id: string) => {
    setMedications(prev => prev.filter(m => m.id !== id));
    await cancelMedicationAlarmHandler(id);
    audio.playClick();
  };

  return (
    <MedicationContext.Provider value={{ medications, addMedication, updateMedication, toggleMedicationAlarm, deleteMedication }}>
      {children}
    </MedicationContext.Provider>
  );
};

export const useMedication = () => {
  const context = useContext(MedicationContext);
  if (context === undefined) {
    throw new Error('useMedication must be used within a MedicationProvider');
  }
  return context;
};

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
  }
  return hash;
}
