// Tasks and Repetition/Suggestion Context for TimeNest
// Integrated with TimeNest Cloud Database for authenticated Google users

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Task } from '../utils/time';
import { parseNLPInput, normalizeTitle, getSimilarity } from '../utils/nlp';
import { audio } from '../utils/audio';
import confetti from 'canvas-confetti';
import { usePreferences } from './PreferencesContext';
import { useCalendar } from './CalendarContext';
import { useGamification } from './GamificationContext';
import { 
  loadUserTasksFromCloud, 
  saveUserTasksToCloud,
  normalizeUserEmail
} from '../utils/cloudDatabase';

interface RepetitionSuggestion {
  id: string;
  normalizedTitle: string;
  originalTitle: string;
  count: number;
}

interface DurationLearning {
  normalizedTitle: string;
  learnedDuration: number; // in minutes
}

interface TasksContextType {
  tasks: Task[];
  addTask: (input: string, overrideDuration?: number, options?: { description?: string; recurrenceRule?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'; notificationOffset?: number; alarmEnabled?: boolean; projectId?: string }) => string;
  updateTaskStatus: (id: string, status: 'pending' | 'completed') => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  updateTaskDuration: (id: string, actualDuration: number) => void; // for learning
  suggestions: RepetitionSuggestion[];
  acceptSuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  resetLearning: () => void;
  isGoogleTasksConnected: boolean;
  isSyncingTasks: boolean;
  lastTasksSync: string | null;
  syncGoogleTasksNow: () => Promise<void>;
  pushAllLocalTasksToGoogle: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export const TasksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isTestEnvironment } = usePreferences();
  const { googleSync } = useCalendar();
  const { addNests } = useGamification();

  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const key = isTestEnvironment ? 'timenest_tasks_test' : 'timenest_tasks';
      const savedTasks = localStorage.getItem(key);
      if (savedTasks) {
        let parsed = JSON.parse(savedTasks) as Task[];
        if (isTestEnvironment) {
          parsed = parsed.map(t => {
            if (t.id === 'test-t4' && t.status === 'completed') {
              return { ...t, status: 'pending' };
            }
            return t;
          });
        }
        return parsed;
      } else if (isTestEnvironment) {
        const mockTestTasks: Task[] = [
          {
            id: 'test-t1',
            title: 'Responder emails',
            estimatedDuration: 15,
            size: 'Pequena',
            priority: 'Alta',
            status: 'pending',
            category: 'Trabalho',
            createdAt: new Date().toISOString(),
            source: 'nlp'
          },
          {
            id: 'test-t2',
            title: 'Revisar documentação',
            estimatedDuration: 45,
            size: 'Média',
            priority: 'Média',
            status: 'pending',
            category: 'Trabalho',
            createdAt: new Date().toISOString(),
            source: 'nlp'
          },
          {
            id: 'test-t3',
            title: 'Estudar React',
            estimatedDuration: 90,
            size: 'Grande',
            priority: 'Média',
            status: 'pending',
            category: 'Estudo',
            createdAt: new Date().toISOString(),
            source: 'nlp'
          },
          {
            id: 'test-t4',
            title: 'Ligar para o suporte técnico',
            estimatedDuration: 15,
            size: 'Pequena',
            priority: 'Média',
            status: 'pending',
            category: 'Suporte',
            createdAt: new Date().toISOString(),
            source: 'nlp'
          },
          {
            id: 'test-t5',
            title: 'Organizar mesa de trabalho',
            estimatedDuration: 30,
            size: 'Média',
            priority: 'Baixa',
            status: 'pending',
            category: 'Casa',
            createdAt: new Date().toISOString(),
            source: 'nlp'
          }
        ];
        return mockTestTasks;
      }
    } catch(e) {}
    return [];
  });

  const [learningData, setLearningData] = useState<DurationLearning[]>([]);
  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [lastTasksSync, setLastTasksSync] = useState<string | null>(() => {
    return localStorage.getItem('timenest_last_cloud_sync') || null;
  });

  // Track the last loaded user email to avoid redundant full fetches
  const loadedEmailRef = useRef<string | null>(null);

  // Load learning data
  useEffect(() => {
    try {
      const key = isTestEnvironment ? 'timenest_learning_test' : 'timenest_learning';
      const savedLearning = localStorage.getItem(key);
      if (savedLearning) {
        setLearningData(JSON.parse(savedLearning));
      } else {
        setLearningData([]);
      }
    } catch(e) {}
  }, [isTestEnvironment]);

  // Save tasks to local storage
  useEffect(() => {
    const key = isTestEnvironment ? 'timenest_tasks_test' : 'timenest_tasks';
    if (tasks.length > 0 || localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(tasks));
    }
  }, [tasks, isTestEnvironment]);
  
  // Save learning data to local storage
  useEffect(() => {
    const key = isTestEnvironment ? 'timenest_learning_test' : 'timenest_learning';
    if (learningData.length > 0 || localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(learningData));
    }
  }, [learningData, isTestEnvironment]);

  /**
   * Automatic Cloud Sync Engine:
   * When user signs in with Google, pull their TimeNest tasks from the cloud database
   */
  useEffect(() => {
    if (!googleSync.isConnected || !googleSync.email) return;

    const userEmail = normalizeUserEmail(googleSync.email);
    if (loadedEmailRef.current === userEmail) return;

    let isCancelled = false;

    const syncWithCloud = async () => {
      setIsSyncingTasks(true);
      try {
        const { tasks: cloudTasks } = await loadUserTasksFromCloud(userEmail);
        if (isCancelled) return;

        if (cloudTasks && cloudTasks.length > 0) {
          // Cloud has tasks for this user: hydrate and merge
          setTasks(prev => {
            const cloudIds = new Set(cloudTasks.map(t => t.id));
            // Keep local tasks that might not have been pushed yet
            const unpushedLocal = prev.filter(t => !cloudIds.has(t.id));
            const merged = [...cloudTasks, ...unpushedLocal];

            // If there were unpushed local tasks, auto-save the merged set to cloud
            if (unpushedLocal.length > 0) {
              saveUserTasksToCloud(userEmail, merged);
            }
            return merged;
          });
        } else {
          // If cloud has no tasks for this user, but local state has tasks, save them to the cloud database
          setTasks(prev => {
            if (prev.length > 0) {
              saveUserTasksToCloud(userEmail, prev);
            }
            return prev;
          });
        }

        loadedEmailRef.current = userEmail;
        const nowIso = new Date().toISOString();
        setLastTasksSync(nowIso);
        localStorage.setItem('timenest_last_cloud_sync', nowIso);
      } catch (err) {
        console.error('Error auto-syncing tasks with TimeNest cloud database:', err);
      } finally {
        if (!isCancelled) setIsSyncingTasks(false);
      }
    };

    syncWithCloud();

    return () => {
      isCancelled = true;
    };
  }, [googleSync.isConnected, googleSync.email]);

  /**
   * Helper to silently trigger cloud save whenever tasks are modified
   */
  const autoSaveToCloud = (updatedTasks: Task[]) => {
    if (googleSync.email) {
      saveUserTasksToCloud(googleSync.email, updatedTasks);
      const nowIso = new Date().toISOString();
      setLastTasksSync(nowIso);
    }
  };

  const addTask = (input: string, overrideDuration?: number, options?: { description?: string; recurrenceRule?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'; notificationOffset?: number; alarmEnabled?: boolean; projectId?: string }) => {
    const parsed = parseNLPInput(input);
    const normalized = normalizeTitle(parsed.title);
    
    // Check if we have learned a duration for this task
    let duration = overrideDuration !== undefined ? overrideDuration : 30; // default
    let size: 'Pequena' | 'Média' | 'Grande' = 'Média';
    
    const learned = learningData.find(l => getSimilarity(l.normalizedTitle, normalized) > 0.8);
    if (learned && overrideDuration === undefined) {
      duration = learned.learnedDuration;
      if (duration <= 15) size = 'Pequena';
      else if (duration >= 60) size = 'Grande';
    } else if (overrideDuration === undefined) {
      if (parsed.title.toLowerCase().match(/(rápido|rapidinho|email|mensagem)/)) {
        duration = 15;
        size = 'Pequena';
      } else if (parsed.title.toLowerCase().match(/(projeto|estudar|faxina|relatório)/)) {
        duration = 60;
        size = 'Grande';
      }
    } else {
      if (duration <= 15) size = 'Pequena';
      else if (duration >= 60) size = 'Grande';
    }

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: parsed.title,
      description: options?.description,
      estimatedDuration: duration,
      size,
      priority: 'Média',
      status: 'pending',
      category: 'Geral',
      createdAt: new Date().toISOString(),
      source: 'timenest',
      recurrenceRule: options?.recurrenceRule,
      notificationOffset: options?.notificationOffset,
      alarmEnabled: options?.alarmEnabled,
      projectId: options?.projectId
    };
    
    const updated = [newTask, ...tasks];
    setTasks(updated);
    audio.playClick();
    autoSaveToCloud(updated);
    return newTask.id;
  };

  const updateTaskStatus = (id: string, status: 'pending' | 'completed') => {
    const updated = tasks.map(t => t.id === id ? { ...t, status } : t);
    setTasks(updated);
    autoSaveToCloud(updated);

    const task = tasks.find(t => t.id === id);
    if (task && status === 'completed') {
      audio.playChimeDone();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38BDF8', '#818CF8', '#A78BFA']
      });
      // Reward Nests based on task size
      const reward = task.size === 'Grande' ? 20 : task.size === 'Média' ? 10 : 5;
      addNests(reward, 'Tarefa concluída');
    }
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    const updated = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
    setTasks(updated);
    autoSaveToCloud(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    autoSaveToCloud(updated);
  };

  const updateTaskDuration = (id: string, actualDuration: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const normalized = normalizeTitle(task.title);
    
    setLearningData(prev => {
      const existing = prev.find(l => getSimilarity(l.normalizedTitle, normalized) > 0.8);
      
      if (existing) {
        // Formula: New Estimate = (Previous Estimate * 0.4) + (Recent Mean * 0.6)
        const newDuration = Math.round((existing.learnedDuration * 0.4) + (actualDuration * 0.6));
        return prev.map(l => l.normalizedTitle === existing.normalizedTitle ? { ...l, learnedDuration: newDuration } : l);
      } else {
        return [...prev, { normalizedTitle: normalized, learnedDuration: actualDuration }];
      }
    });
  };

  const resetLearning = () => {
    setLearningData([]);
  };

  // Compute suggestions for repetitive tasks (created >= 3 times in the last 7 days)
  const computeSuggestions = (): RepetitionSuggestion[] => {
    const recentTasks = tasks.filter(t => {
      const date = new Date(t.createdAt);
      const now = new Date();
      const diffDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    });

    const frequencyMap = new Map<string, { count: number; originalTitle: string }>();
    
    recentTasks.forEach(t => {
      const norm = normalizeTitle(t.title);
      const existing = Array.from(frequencyMap.keys()).find(k => getSimilarity(k, norm) > 0.8);
      
      if (existing) {
        const data = frequencyMap.get(existing)!;
        frequencyMap.set(existing, { count: data.count + 1, originalTitle: data.originalTitle });
      } else {
        frequencyMap.set(norm, { count: 1, originalTitle: t.title });
      }
    });

    return Array.from(frequencyMap.entries())
      .filter(([_, data]) => data.count >= 3)
      .map(([norm, data]) => ({
        id: norm,
        normalizedTitle: norm,
        originalTitle: data.originalTitle,
        count: data.count
      }));
  };

  const suggestions = computeSuggestions();

  const acceptSuggestion = (id: string) => {
    audio.playChimeDone();
    alert(`Rotina criada para: ${id}`);
  };

  const dismissSuggestion = (_id: string) => {};

  // Compatibility helpers (automatic background sync)
  const syncGoogleTasksNow = async () => {
    if (!googleSync.email) return;
    setIsSyncingTasks(true);
    try {
      const { tasks: cloudTasks } = await loadUserTasksFromCloud(googleSync.email);
      if (cloudTasks && cloudTasks.length > 0) {
        setTasks(cloudTasks);
      }
      const nowIso = new Date().toISOString();
      setLastTasksSync(nowIso);
    } finally {
      setIsSyncingTasks(false);
    }
  };

  const pushAllLocalTasksToGoogle = async () => {
    if (!googleSync.email) return;
    await saveUserTasksToCloud(googleSync.email, tasks);
  };

  return (
    <TasksContext.Provider value={{
      tasks, addTask, updateTaskStatus, updateTask, deleteTask, updateTaskDuration,
      suggestions, acceptSuggestion, dismissSuggestion, resetLearning,
      isGoogleTasksConnected: googleSync.isConnected,
      isSyncingTasks,
      lastTasksSync,
      syncGoogleTasksNow,
      pushAllLocalTasksToGoogle
    }}>
      {children}
    </TasksContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
};
