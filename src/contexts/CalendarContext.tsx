// Calendar and Event Context for TimeNest

import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateFreeIntervals, getLocalDateString } from '../utils/time';
import type { Event, FreeInterval } from '../utils/time';
import { audio } from '../utils/audio';
import { usePreferences } from './PreferencesContext';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

import { Capacitor } from '@capacitor/core';
import { scheduleEventAlarm } from '../utils/alarms';
import { scheduleTaskNotification } from '../utils/notifications';
import { useGoogleLogin } from '@react-oauth/google';

interface GoogleSyncSettings {
  isConnected: boolean;
  lastSync: string | null;
  autoSync: boolean;
  accessToken?: string | null;
  email?: string | null;
}

interface CalendarContextType {
  events: Event[];
  freeIntervals: FreeInterval[];
  addEvent: (event: Omit<Event, 'id' | 'source'> & { source?: 'local' | 'google' }) => string;
  updateEventTimes: (id: string, start: string, end: string) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  safetyMargin: number;
  setSafetyMargin: (minutes: number) => void;
  googleSync: GoogleSyncSettings;
  connectGoogle: () => Promise<any>;
  disconnectGoogle: () => void;
  syncGoogleNow: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isTestEnvironment, sleepStart, sleepEnd, globalAlarmsEnabled } = usePreferences();
  const [events, setEvents] = useState<Event[]>(() => {
    try {
      // NOTE: isTestEnvironment is not available in lazy init of useState if it comes from hook after,
      // but wait, isTestEnvironment is from usePreferences() which is already called above!
      const key = isTestEnvironment ? 'timenest_events_test' : 'timenest_events';
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Wipe out any old all-day google events (like birthdays) from localStorage state
        return parsed.filter((e: any) => !(e.source === 'google' && e.start === '00:00' && e.end === '23:59'));
      } else if (isTestEnvironment) {
        const today = getLocalDateString();
        const mockTestEvents: Event[] = [
          {
            id: 'test-e1',
            title: 'Reunião de Alinhamento',
            start: '09:00',
            end: '10:00',
            date: today,
            source: 'local',
            color: 'blue',
            isFixed: true
          },
          {
            id: 'test-e2',
            title: 'Almoço com Cliente',
            start: '12:00',
            end: '13:00',
            date: today,
            source: 'local',
            color: 'gray',
            isFixed: true
          },
          {
            id: 'test-e3',
            title: 'Sessão de Mentoria',
            start: '15:00',
            end: '15:45',
            date: today,
            source: 'local',
            color: 'green',
            isFixed: true
          },
          {
            id: 'test-e4',
            title: 'Revisão de Código',
            start: '17:30',
            end: '18:30',
            date: today,
            source: 'local',
            color: 'purple',
            isFixed: true
          }
        ];
        return mockTestEvents;
      }
    } catch(e) {}
    return [];
  });
  const [safetyMargin, setSafetyMargin] = useState<number>(10);
  const [googleSync, setGoogleSync] = useState<GoogleSyncSettings>(() => {
    try {
      const savedSync = localStorage.getItem('timenest_gsync');
      if (savedSync) return JSON.parse(savedSync);
    } catch(e) {}
    return {
      isConnected: false,
      lastSync: null,
      autoSync: false,
      accessToken: null,
      email: null
    };
  });
  
  const webLoginPromise = React.useRef<{resolve: (val: any) => void, reject: (err: any) => void} | null>(null);

  const webGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      audio.playChimeDone();
      setGoogleSync({
        isConnected: true,
        lastSync: new Date().toISOString(),
        autoSync: true,
        accessToken: tokenResponse.access_token
      });
      await syncGoogleNow(tokenResponse.access_token);
      
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        const userInfo = await res.json();
        setGoogleSync(prev => ({ ...prev, email: userInfo.email || null }));
        if (webLoginPromise.current) {
          webLoginPromise.current.resolve({
             displayName: userInfo.name || '',
             email: userInfo.email || '',
             imageUrl: userInfo.picture || ''
          });
          webLoginPromise.current = null;
        }
      } catch(e) {
        if (webLoginPromise.current) {
          webLoginPromise.current.resolve({ displayName: '', imageUrl: '' });
          webLoginPromise.current = null;
        }
      }
    },
    onError: (error) => {
      if (webLoginPromise.current) {
        webLoginPromise.current.reject(error);
        webLoginPromise.current = null;
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks'
  });
  
  // Events are loaded in useState now.

  // Load margin and sync settings
  useEffect(() => {
    const savedMargin = localStorage.getItem('timenest_margin');
    if (savedMargin) setSafetyMargin(Number(savedMargin));

    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize({
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '898129156349-qm7fannl6mbgfrhim2ujatddh6tb21sk.apps.googleusercontent.com',
        scopes: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/tasks'],
        grantOfflineAccess: true,
      });
    }
  }, []);

  // Save events to local storage
  useEffect(() => {
    const key = isTestEnvironment ? 'timenest_events_test' : 'timenest_events';
    if (events.length > 0 || localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(events));
    }
    
    // Schedule alarms and notifications
    events.forEach(event => {
      if (!event.date || !event.start || !event.end) return;
      const [sy, sm, sd] = event.date.split('-').map(Number);
      const [sh, smin] = event.start.split(':').map(Number);
      const [eh, emin] = event.end.split(':').map(Number);
      
      const startDate = new Date(sy, sm - 1, sd, sh, smin, 0);
      const endDate = new Date(sy, sm - 1, sd, eh, emin, 0);
      
      // 5 minutes before start
      const alarmDate = new Date(startDate.getTime() - 5 * 60000);
      // 5 minutes before end
      const notificationDate = new Date(endDate.getTime() - 5 * 60000);

      // Only schedule lock screen alarm if globally enabled OR explicitly enabled for this event
      const shouldAlarm = globalAlarmsEnabled || event.alarmEnabled;

      if (shouldAlarm && alarmDate.getTime() > Date.now()) {
        scheduleEventAlarm(event.id, event.title, alarmDate, `O evento começará em 5 minutos!`);
      } else if (!shouldAlarm && alarmDate.getTime() > Date.now()) {
        // Fallback to standard notification if alarm is not enabled
        scheduleTaskNotification(event.id + "_start", event.title, alarmDate, `O evento começará em 5 minutos!`);
      }
      
      if (notificationDate.getTime() > Date.now()) {
        scheduleTaskNotification(event.id + "_end", event.title, notificationDate, `O evento terminará em 5 minutos!`);
      }
    });

  }, [events, isTestEnvironment, globalAlarmsEnabled]);

  useEffect(() => {
    localStorage.setItem('timenest_margin', String(safetyMargin));
  }, [safetyMargin]);

  useEffect(() => {
    localStorage.setItem('timenest_gsync', JSON.stringify(googleSync));
  }, [googleSync]);

  // Polling and visibility sync
  useEffect(() => {
    if (!googleSync.isConnected || !googleSync.accessToken || googleSync.accessToken === 'demo_token') return;
    
    const interval = setInterval(() => {
       if (!document.hidden) {
          syncGoogleNow();
       }
    }, 30000); // 30 seconds polling
    
    const handleVisibilityChange = () => {
       if (!document.hidden) {
          syncGoogleNow();
       }
    };

    const handleFocus = () => {
       syncGoogleNow();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
       clearInterval(interval);
       document.removeEventListener('visibilitychange', handleVisibilityChange);
       window.removeEventListener('focus', handleFocus);
    };
  }, [googleSync.isConnected, googleSync.accessToken]);

  const pushEventToGoogle = async (event: Event, isUpdate = false) => {
    if (!googleSync.accessToken || googleSync.accessToken === 'demo_token') return;
    try {
      const [sy, sm, sd] = event.date.split('-');
      const [sh, smin] = event.start.split(':');
      const [eh, emin] = event.end.split(':');
      const startDate = new Date(Number(sy), Number(sm) - 1, Number(sd), Number(sh), Number(smin), 0);
      const endDate = new Date(Number(sy), Number(sm) - 1, Number(sd), Number(eh), Number(emin), 0);

      const body: any = {
        summary: event.title,
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() }
      };

      if (event.description) {
        body.description = event.description;
      }

      if (event.recurrenceRule && event.recurrenceRule !== 'NONE') {
        body.recurrence = [`RRULE:FREQ=${event.recurrenceRule}`];
      }

      let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
      let method = 'POST';

      if (isUpdate && event.id.startsWith('google-')) {
        const googleId = event.id.replace('google-', '');
        url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleId}`;
        method = 'PATCH';
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${googleSync.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        if (!isUpdate) {
           setEvents(prev => prev.map(e => e.id === event.id ? { ...e, id: `google-${data.id}`, source: 'google' } : e));
        }
      }
    } catch (e) {
      console.error('Error pushing to Google Calendar:', e);
    }
  };

  const deleteEventFromGoogle = async (eventId: string) => {
    if (!googleSync.accessToken || googleSync.accessToken === 'demo_token' || !eventId.startsWith('google-')) return;
    try {
      const googleId = eventId.replace('google-', '');
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${googleSync.accessToken}` }
      });
    } catch (e) {
      console.error('Error deleting from Google Calendar:', e);
    }
  };

  const addEvent = (event: Omit<Event, 'id' | 'source'> & { source?: 'local' | 'google' }): string => {
    const id = Math.random().toString(36).substr(2, 9);
    const newEvent: Event = {
      source: 'local',
      ...event,
      id
    };
    setEvents(prev => [...prev, newEvent]);
    audio.playClick();
    
    if (googleSync.isConnected) {
       pushEventToGoogle(newEvent, false);
    }
    
    return id;
  };

  const updateEventTimes = (id: string, start: string, end: string) => {
    setEvents(prev => {
      const newEvents = prev.map(e => e.id === id ? { ...e, start, end } : e);
      const updatedEvent = newEvents.find(e => e.id === id);
      if (updatedEvent && googleSync.isConnected) {
         if (id.startsWith('google-')) {
           pushEventToGoogle(updatedEvent, true);
         } else {
           // Se for um evento local mas o google está conectado, deveríamos criar lá também?
           // No contexto dessa função (normalmente resize timeline), melhor atualizar.
         }
      }
      return newEvents;
    });
  };

  const updateEvent = (id: string, updates: Partial<Event>) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEvent = (id: string) => {
    if (id.startsWith('google-')) {
      deleteEventFromGoogle(id);
    }
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const connectGoogle = async () => {
    audio.playClick();
    try {
      if (Capacitor.isNativePlatform()) {
        const user = await GoogleAuth.signIn();
        if (user && user.authentication && user.authentication.accessToken) {
          audio.playChimeDone();
          setGoogleSync({
            isConnected: true,
            lastSync: new Date().toISOString(),
            autoSync: true,
            accessToken: user.authentication.accessToken,
            email: user.email || null
          });
          await syncGoogleNow(user.authentication.accessToken);
          return user;
        }
      } else {
        return new Promise((resolve, reject) => {
          webLoginPromise.current = { resolve, reject };
          webGoogleLogin();
        });
      }
      
      // Fallback para ambiente Web ou desenvolvimento
      const promptDemo = confirm(
        'A sincronização oficial do Google Agenda necessita do Client ID configurado no Google Cloud Console.\n\nDeseja ativar a Sincronização Demonstrativa com o Google Agenda para testes no aplicativo?'
      );

      if (promptDemo) {
        audio.playChimeDone();
        setGoogleSync({
          isConnected: true,
          lastSync: new Date().toISOString(),
          autoSync: true,
          accessToken: 'demo_token',
          email: 'demo@gmail.com'
        });
        
        const today = getLocalDateString();
        const demoGoogleEvents: Event[] = [
          {
            id: 'google-demo-1',
            title: '📅 Reunião de Equipe (GCal)',
            start: '10:30',
            end: '11:30',
            date: today,
            source: 'google',
            color: 'purple',
            isFixed: true
          },
          {
            id: 'google-demo-2',
            title: '📅 Alinhamento com Cliente (GCal)',
            start: '14:00',
            end: '15:00',
            date: today,
            source: 'google',
            color: 'purple',
            isFixed: true
          }
        ];

        setEvents(prev => {
          const locals = prev.filter(e => e.source !== 'google');
          return [...locals, ...demoGoogleEvents];
        });
        
        return { name: 'Usuário Demo', imageUrl: '' };
      }
    } catch (error: any) {
      console.error('Google Login Error:', error);
      
      const errorMessage = error?.message || error?.error || JSON.stringify(error) || 'Erro desconhecido';
      
      const useDemo = confirm(
        `A autenticação com o Google falhou.\n\nMotivo: ${errorMessage}\n\nDeseja ativar a Sincronização Demonstrativa do Google Agenda no TimeNest para testar o recurso?`
      );

      if (useDemo) {
        audio.playChimeDone();
        setGoogleSync({
          isConnected: true,
          lastSync: new Date().toISOString(),
          autoSync: true,
          accessToken: 'demo_token',
          email: 'demo@gmail.com'
        });
        
        const today = getLocalDateString();
        const demoGoogleEvents: Event[] = [
          {
            id: 'google-demo-1',
            title: '📅 Reunião de Equipe (GCal)',
            start: '10:30',
            end: '11:30',
            date: today,
            source: 'google',
            color: 'purple',
            isFixed: true
          },
          {
            id: 'google-demo-2',
            title: '📅 Alinhamento de Projeto (GCal)',
            start: '14:00',
            end: '15:00',
            date: today,
            source: 'google',
            color: 'purple',
            isFixed: true
          }
        ];

        setEvents(prev => {
          const locals = prev.filter(e => e.source !== 'google');
          return [...locals, ...demoGoogleEvents];
        });
        
        return { name: 'Usuário Demo', imageUrl: '' };
      }
    }
  };

  const disconnectGoogle = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await GoogleAuth.signOut();
      }
    } catch (e) { console.error(e); }

    setGoogleSync({
      isConnected: false,
      lastSync: null,
      autoSync: false,
      accessToken: null,
      email: null
    });
    setEvents(prev => prev.filter(e => e.source !== 'google'));
    audio.playClick();
  };

  const syncGoogleNow = async (tokenOverride?: string) => {
    const token = tokenOverride || googleSync.accessToken;
    if (!token) return;

    if (token === 'demo_token') {
      const today = getLocalDateString();
      const demoGoogleEvents: Event[] = [
        {
          id: 'google-demo-1',
          title: '📅 Reunião de Equipe (GCal)',
          start: '10:30',
          end: '11:30',
          date: today,
          source: 'google',
          color: 'purple',
          isFixed: true
        },
        {
          id: 'google-demo-2',
          title: '📅 Alinhamento de Projeto (GCal)',
          start: '14:00',
          end: '15:00',
          date: today,
          source: 'google',
          color: 'purple',
          isFixed: true
        }
      ];

      setEvents(prev => {
        const localEvents = prev.filter(e => e.source !== 'google');
        return [...localEvents, ...demoGoogleEvents];
      });

      setGoogleSync(prev => ({
        ...prev,
        lastSync: new Date().toISOString()
      }));
      audio.playChimeDone();
      return;
    }
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const timeMin = today.toISOString();
      
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&singleEvents=true&orderBy=startTime`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
           // Em vez de desconectar completamente e esquecer a sessão, avisamos e paramos de syncar até o F5 ou re-login.
           setGoogleSync(prev => ({ ...prev, accessToken: null }));
           console.warn('Sessão do Google expirou (401/403). Mantenha a configuração local.');
           return;
        }
        throw new Error('Falha ao buscar eventos do Google.');
      }

      const data = await response.json();
      
      const newGoogleEvents: Event[] = (data.items || [])
        .filter((item: any) => item.status !== 'cancelled' && item.start && item.start.dateTime)
        .map((item: any) => {
          const startDate = new Date(item.start.dateTime);
          const endDate = new Date(item.end.dateTime);
          
          const startStr = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;
          const endStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
          const eventDate = getLocalDateString(startDate);

          return {
            id: `google-${item.id}`,
            title: item.summary || 'Evento Sem Título',
            start: startStr,
            end: endStr,
            date: eventDate,
            source: 'google',
            color: 'purple',
            isFixed: true
          } as Event;
        });

      setEvents(prev => {
        const localEvents = prev.filter(e => e.source !== 'google');
        return [...localEvents, ...newGoogleEvents];
      });

      setGoogleSync(prev => ({
        ...prev,
        lastSync: new Date().toISOString(),
        accessToken: token
      }));
      audio.playChimeDone();

    } catch (err) {
      console.error(err);
      alert('Erro ao sincronizar com o Google Agenda.');
    }
  };

  const today = getLocalDateString();
  const freeIntervals = calculateFreeIntervals(events, today, safetyMargin, sleepEnd, sleepStart);

  return (
    <CalendarContext.Provider value={{
      events, freeIntervals, 
      addEvent, updateEventTimes, updateEvent, deleteEvent, 
      safetyMargin, setSafetyMargin,
      googleSync, connectGoogle, disconnectGoogle, syncGoogleNow
    }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
