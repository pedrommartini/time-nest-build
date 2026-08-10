// Focus, Timer, and Ambient Audio Integration Context for TimeNest

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Task } from '../utils/time';
import { timeStringToMinutes, minutesToTimeString } from '../utils/time';
import { audio } from '../utils/audio';
import { useTasks } from './TasksContext';
import { useCalendar } from './CalendarContext';

interface FocusStats {
  focusMinutesToday: number;
  completedCycles: number;
  bestStreak: number;
}

interface FocusContextType {
  activeTask: Task | null;
  activeEventId: string | null;
  isActive: boolean;
  isPaused: boolean;
  focusType: 'pomodoro' | 'flow' | 'custom';
  setFocusType: (type: 'pomodoro' | 'flow' | 'custom') => void;
  timeRemaining: number;
  totalDuration: number;
  ambientSound: 'none' | 'rain' | 'waves' | 'cafe' | 'forest';
  setAmbientSound: (sound: 'none' | 'rain' | 'waves' | 'cafe' | 'forest') => void;
  ambientVolume: number;
  setAmbientVolume: (vol: number) => void;
  stats: FocusStats;
  startTimer: (task: Task | null, durationMinutes: number) => { success: boolean; error?: string };
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: (completed?: boolean) => void;
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { updateTaskStatus, updateTaskDuration } = useTasks();
  const { events, addEvent, deleteEvent, updateEventTimes } = useCalendar();
  
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [focusType, setFocusType] = useState<'pomodoro' | 'flow' | 'custom'>('pomodoro');
  
  const [notification, setNotification] = useState<string | null>(null);
  
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  
  const [ambientSound, setAmbientSound] = useState<'none' | 'rain' | 'waves' | 'cafe' | 'forest'>('none');
  const [ambientVolume, setAmbientVolume] = useState(0.5);
  
  const [stats, setStats] = useState<FocusStats>({
    focusMinutesToday: 120, // Mock for demo
    completedCycles: 3,
    bestStreak: 4 // Mock for demo
  });
  
  const timerRef = useRef<number | null>(null);
  const initialStartTimeRef = useRef<number>(0);
  const endTimeRef = useRef<number>(0);
  const pausedTimeRemainingRef = useRef<number>(0);

  // Load stats and settings
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem('timenest_focus_stats');
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        if (parsed.date === new Date().toISOString().split('T')[0]) {
          setStats(prev => ({ ...prev, focusMinutesToday: parsed.focusMinutesToday, completedCycles: parsed.completedCycles }));
        }
      }
      
      const savedAmbient = localStorage.getItem('timenest_ambient');
      if (savedAmbient) {
        const parsed = JSON.parse(savedAmbient);
        setAmbientSound(parsed.sound || 'none');
        setAmbientVolume(parsed.volume !== undefined ? parsed.volume : 0.5);
      }

      const savedState = localStorage.getItem('timenest_focus_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (parsed.isActive) {
          setActiveTask(parsed.activeTask);
          setActiveEventId(parsed.activeEventId);
          setIsActive(parsed.isActive);
          setIsPaused(parsed.isPaused);
          setFocusType(parsed.focusType);
          setTotalDuration(parsed.totalDuration);
          if (parsed.isPaused) {
            pausedTimeRemainingRef.current = parsed.pausedTimeRemaining;
            setTimeRemaining(parsed.pausedTimeRemaining);
          } else {
            endTimeRef.current = parsed.endTime;
            const remaining = Math.max(0, Math.ceil((parsed.endTime - Date.now()) / 1000));
            setTimeRemaining(remaining);
          }
        }
      }
    } catch(e) {}
  }, []);

  // Save stats and settings
  useEffect(() => {
    localStorage.setItem('timenest_focus_stats', JSON.stringify({
      ...stats,
      date: new Date().toISOString().split('T')[0]
    }));
    
    localStorage.setItem('timenest_ambient', JSON.stringify({
      sound: ambientSound,
      volume: ambientVolume
    }));
  }, [stats, ambientSound, ambientVolume]);

  // Save focus state
  useEffect(() => {
    if (isActive !== undefined) {
      localStorage.setItem('timenest_focus_state', JSON.stringify({
        activeTask,
        activeEventId,
        isActive,
        isPaused,
        focusType,
        timeRemaining,
        totalDuration,
        endTime: endTimeRef.current,
        pausedTimeRemaining: pausedTimeRemainingRef.current
      }));
    }
  }, [activeTask, activeEventId, isActive, isPaused, focusType, timeRemaining, totalDuration]);

  // Handle ambient sound playback
  useEffect(() => {
    if (ambientSound !== 'none') {
      audio.playAmbient(ambientSound, ambientVolume);
    } else {
      audio.stopAmbient();
    }
    return () => {
      audio.stopAmbient();
    };
  }, [ambientSound, ambientVolume]);
  
  const lastAutoEventRef = useRef<string | null>(null);

  // Auto-track current active event
  useEffect(() => {
    const interval = setInterval(() => {
      if (isActive) return;
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentMins = now.getHours() * 60 + now.getMinutes();

      const activeEvent = events.find(event => {
        if (event.date !== today) return false;
        const startMins = timeStringToMinutes(event.start);
        const endMins = timeStringToMinutes(event.end);
        return currentMins >= startMins && currentMins < endMins;
      });

      if (activeEvent && activeEvent.id !== lastAutoEventRef.current) {
        // Start tracking this event
        const startMins = timeStringToMinutes(activeEvent.start);
        const endMins = timeStringToMinutes(activeEvent.end);
        const totalSecs = (endMins - startMins) * 60;
        
        // Calculate remaining seconds
        const endDate = new Date();
        endDate.setHours(Math.floor(endMins / 60), endMins % 60, 0, 0);
        const remainingSecs = Math.max(0, Math.floor((endDate.getTime() - Date.now()) / 1000));
        
        if (remainingSecs > 0) {
          lastAutoEventRef.current = activeEvent.id;
          setActiveEventId(activeEvent.id);
          setActiveTask(null);
          setTotalDuration(totalSecs);
          setTimeRemaining(remainingSecs);
          setIsActive(true);
          setIsPaused(false);
          endTimeRef.current = endDate.getTime();
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [events, isActive]);

  // Main Timer Loop (Background-Aware using absolute date comparison)
  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = window.setInterval(() => {
        const now = Date.now();
        const targetEnd = endTimeRef.current;
        const remaining = Math.max(0, Math.ceil((targetEnd - now) / 1000));
        
        setTimeRemaining(prev => {
          const elapsed = totalDuration - remaining;
          const prevElapsed = totalDuration - prev;
          
          // Every minute passed, update stats
          if (Math.floor(elapsed / 60) > Math.floor(prevElapsed / 60)) {
            setStats(s => ({ ...s, focusMinutesToday: s.focusMinutesToday + 1 }));
          }
          
          if (remaining === 0) {
            handleTimerComplete();
            return 0;
          }
          
          return remaining;
        });
      }, 200); // Poll every 200ms
    }
    
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [isActive, isPaused, totalDuration]);

  const handleTimerComplete = () => {
    audio.playChimeDone();
    
    if (timerRef.current !== null) clearInterval(timerRef.current);
    
    setIsActive(false);
    setIsPaused(false);
    
    setStats(s => ({ ...s, completedCycles: s.completedCycles + 1 }));
    
    if (activeEventId) {
      setActiveEventId(null);
    }
    
    if (activeTask) {
      // Calculate actual time spent
      const actualMinutes = Math.round((totalDuration - 0) / 60); // It reached 0
      updateTaskDuration(activeTask.id, actualMinutes);
      updateTaskStatus(activeTask.id, 'completed');
    }
    
    setActiveTask(null);
  };

  const startTimer = (task: Task | null, durationMinutes: number): { success: boolean; error?: string } => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const startMins = now.getHours() * 60 + now.getMinutes();
    const endMins = startMins + durationMinutes;

    // Check for conflicts with existing events on the current date
    const conflict = events.find(event => {
      if (event.date !== today) return false;
      const eventStart = timeStringToMinutes(event.start);
      const eventEnd = timeStringToMinutes(event.end);
      return startMins < eventEnd && endMins > eventStart;
    });

    if (conflict) {
      return {
        success: false,
        error: `O compromisso "${conflict.title}" das ${conflict.start} às ${conflict.end} conflita com esta sessão.`
      };
    }

    // Allocate immediately on timeline
    const startTimeStr = minutesToTimeString(startMins);
    const endTimeStr = minutesToTimeString(endMins);
    const eventId = addEvent({
      title: task ? task.title : 'Foco Livre',
      start: startTimeStr,
      end: endTimeStr,
      date: today,
      color: 'brand',
      isFixed: true
    });

    setActiveEventId(eventId);
    setActiveTask(task);
    const secs = durationMinutes * 60;
    setTotalDuration(secs);
    setTimeRemaining(secs);
    setIsActive(true);
    setIsPaused(false);
    initialStartTimeRef.current = Date.now();
    endTimeRef.current = Date.now() + secs * 1000;
    audio.playClick();
    return { success: true };
  };

  const pauseTimer = () => {
    setIsPaused(true);
    pausedTimeRemainingRef.current = timeRemaining;
    audio.playClick();
  };

  const resumeTimer = () => {
    setIsPaused(false);
    endTimeRef.current = Date.now() + pausedTimeRemainingRef.current * 1000;
    audio.playClick();
  };

  const stopTimer = (completed: boolean = false) => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    
    setIsActive(false);
    setIsPaused(false);
    audio.playClick();
    
    const timeSpentSecs = totalDuration - timeRemaining;
    const timeSpentMins = Math.round(timeSpentSecs / 60);

    if (activeEventId) {
      if (completed) {
        // Event matches total duration, stays as is
        setActiveEventId(null);
      } else if (timeSpentMins > 0) {
        // Adjust end time to actual end time
        const now = new Date();
        const stopMins = now.getHours() * 60 + now.getMinutes();
        updateEventTimes(activeEventId, minutesToTimeString(stopMins - timeSpentMins), minutesToTimeString(stopMins));
        setActiveEventId(null);
      } else {
        // Remove event if cancelled immediately (under a minute)
        deleteEvent(activeEventId);
        setActiveEventId(null);
      }
    }
    
    if (activeTask) {
      if (completed) {
        updateTaskStatus(activeTask.id, 'completed');
        audio.playChimeDone();
        
        const estimatedMins = Math.round(totalDuration / 60);
        if (timeSpentMins < estimatedMins && timeSpentMins > 0) {
          const diff = estimatedMins - timeSpentMins;
          setNotification(`🎉 Parabéns! Você terminou a tarefa "${activeTask.title}" em ${diff} minutos a menos! (Aprendemos com isso)`);
          setTimeout(() => setNotification(null), 5000);
        } else if (timeSpentMins > 0) {
          setNotification(`🎉 Parabéns! Tarefa "${activeTask.title}" concluída!`);
          setTimeout(() => setNotification(null), 4000);
        }
      }
      
      if (timeSpentMins > 0) {
        updateTaskDuration(activeTask.id, timeSpentMins);
      }
    } else if (activeEventId && completed) {
      setNotification(`🎉 Evento concluído com sucesso!`);
      setTimeout(() => setNotification(null), 4000);
    }
    
    setActiveTask(null);
  };

  return (
    <FocusContext.Provider value={{
      activeTask,
      activeEventId,
      isActive, isPaused, focusType, setFocusType,
      timeRemaining, totalDuration,
      ambientSound, setAmbientSound, ambientVolume, setAmbientVolume,
      stats, startTimer, pauseTimer, resumeTimer, stopTimer
    }}>
      {children}
      
      {/* Global Notification Toast */}
      {notification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] bg-brand-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up max-w-[90vw] text-center border-2 border-brand-400">
          <span className="font-bold text-sm">{notification}</span>
        </div>
      )}
    </FocusContext.Provider>
  );
};

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocus must be used within a FocusProvider');
  }
  return context;
};
