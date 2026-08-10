import React, { createContext, useContext, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { audio } from '../utils/audio';

export interface Medication {
  id: string;
  name: string;
  time: string; // HH:mm
  recurrence: 'DAILY' | 'WEEKLY' | 'NONE'; // Usually daily for meds
  alarmEnabled: boolean;
  notes?: string;
  createdAt: string;
}

interface MedicationContextType {
  medications: Medication[];
  addMedication: (name: string, time: string, alarmEnabled?: boolean, notes?: string) => Promise<string>;
  updateMedication: (id: string, updates: Partial<Omit<Medication, 'id' | 'createdAt'>>) => Promise<void>;
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
    if (!med.alarmEnabled || !Capacitor.isNativePlatform()) return;
    try {
      const [hour, minute] = med.time.split(':').map(Number);
      await LocalNotifications.schedule({
        notifications: [
          {
            title: 'Hora do Medicamento',
            body: `Está na hora de tomar: ${med.name}`,
            id: parseInt(med.id.replace(/\D/g, '').substring(0, 8)) || Math.floor(Math.random() * 100000),
            schedule: {
              on: { hour, minute },
              allowWhileIdle: true,
            },
            sound: 'chime.wav',
            smallIcon: 'ic_stat_med', // if available
          }
        ]
      });
    } catch (e) {
      console.error('Failed to schedule medication alarm', e);
    }
  };

  const cancelMedicationAlarm = async (id: string) => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const notificationId = parseInt(id.replace(/\D/g, '').substring(0, 8));
      if (!isNaN(notificationId)) {
        await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
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
      await cancelMedicationAlarm(id);
      const updatedMed = { ...med, ...updates };
      if (updatedMed.alarmEnabled) {
        await scheduleMedicationAlarm(updatedMed);
      }
    }
  };

  const deleteMedication = async (id: string) => {
    setMedications(prev => prev.filter(m => m.id !== id));
    await cancelMedicationAlarm(id);
  };

  return (
    <MedicationContext.Provider value={{ medications, addMedication, updateMedication, deleteMedication }}>
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
