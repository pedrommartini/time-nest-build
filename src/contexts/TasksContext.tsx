// Tasks and Repetition/Suggestion Context for TimeNest

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Task } from '../utils/time';
import { parseNLPInput, normalizeTitle, getSimilarity } from '../utils/nlp';
import { audio } from '../utils/audio';
import confetti from 'canvas-confetti';
import { usePreferences } from './PreferencesContext';
import { useCalendar } from './CalendarContext';
import { useGamification } from './GamificationContext';
import { 
  taskToGoogleTaskPayload, 
  googleTaskItemToTimeNestTask 
} from '../utils/googleTasks';

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

  const [isSyncingTasks, setIsSyncingTasks] = useState(false);
  const [lastTasksSync, setLastTasksSync] = useState<string | null>(() => {
    return localStorage.getItem('timenest_last_tasks_sync') || null;
  });

  const pushTaskToGoogle = async (task: Task, isUpdate = false) => {
    if (!googleSync.isConnected) return;
    const isRealToken = googleSync.accessToken && googleSync.accessToken !== 'demo_token';
    const cleanEmail = (googleSync.email || 'user').trim().toLowerCase();

    if (isRealToken) {
      try {
        const payload = taskToGoogleTaskPayload(task);
        let url = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks';
        let method = 'POST';

        if (isUpdate && task.id.startsWith('google-')) {
          const googleId = task.id.replace('google-', '');
          url = `${url}/${googleId}`;
          method = 'PATCH';
        }

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${googleSync.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          if (!isUpdate || !task.id.startsWith('google-')) {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, id: `google-${data.id}`, source: 'google' } : t));
          }
        }
      } catch (e) {
        console.error('Failed to push task to Google Tasks:', e);
      }
    } else {
      // Demo / fallback cloud binding tied to user account
      const accountKey = `timenest_tasks_account_${cleanEmail}`;
      try {
        const raw = localStorage.getItem(accountKey);
        let list: Task[] = raw ? JSON.parse(raw) : [];
        const idx = list.findIndex(t => t.id === task.id);
        if (idx >= 0) {
          list[idx] = { ...task, source: 'google' };
        } else {
          list.push({ ...task, source: 'google' });
        }
        localStorage.setItem(accountKey, JSON.stringify(list));
      } catch(e) {}
    }
  };

  const deleteTaskFromGoogle = async (taskId: string) => {
    if (!googleSync.isConnected) return;
    const isRealToken = googleSync.accessToken && googleSync.accessToken !== 'demo_token';
    const cleanEmail = (googleSync.email || 'user').trim().toLowerCase();

    if (isRealToken && taskId.startsWith('google-')) {
      try {
        const googleId = taskId.replace('google-', '');
        await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${googleId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${googleSync.accessToken}` }
        });
      } catch (e) {
        console.error('Failed to delete task from Google Tasks:', e);
      }
    } else {
      const accountKey = `timenest_tasks_account_${cleanEmail}`;
      try {
        const raw = localStorage.getItem(accountKey);
        if (raw) {
          const list: Task[] = JSON.parse(raw);
          const filtered = list.filter(t => t.id !== taskId);
          localStorage.setItem(accountKey, JSON.stringify(filtered));
        }
      } catch(e) {}
    }
  };

  const syncGoogleTasksNow = async () => {
    if (!googleSync.isConnected) return;
    setIsSyncingTasks(true);
    try {
      const isRealToken = googleSync.accessToken && googleSync.accessToken !== 'demo_token';
      const cleanEmail = (googleSync.email || 'user').trim().toLowerCase();

      if (isRealToken) {
        const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists/@default/tasks?showCompleted=true&showHidden=true', {
          headers: { 'Authorization': `Bearer ${googleSync.accessToken}` }
        });

        if (response.ok) {
          const data = await response.json();
          const items: any[] = data.items || [];
          
          setTasks(prev => {
            const remoteGoogleTasks: Task[] = items
              .filter((item: any) => item.status !== 'hidden' && item.title)
              .map((item: any) => {
                const existing = prev.find(t => t.id === `google-${item.id}`);
                return googleTaskItemToTimeNestTask(item, existing);
              });

            // Local tasks that haven't been pushed to Google Tasks yet
            const unpushedLocals = prev.filter(t => !t.id.startsWith('google-') && t.source !== 'google');

            // Asynchronously upload unpushed local tasks to Google Tasks cloud
            if (unpushedLocals.length > 0) {
              unpushedLocals.forEach(localTask => {
                pushTaskToGoogle(localTask, false);
              });
            }

            const merged = [
              ...unpushedLocals,
              ...remoteGoogleTasks
            ];

            const nowIso = new Date().toISOString();
            setLastTasksSync(nowIso);
            localStorage.setItem('timenest_last_tasks_sync', nowIso);
            return merged;
          });
        }
      } else {
        // Fallback / Demo account mode (e.g. linked to pedrovski8tube@gmail.com)
        const accountKey = `timenest_tasks_account_${cleanEmail}`;
        const storedAccountTasks = localStorage.getItem(accountKey);
        if (storedAccountTasks) {
          const parsed = JSON.parse(storedAccountTasks) as Task[];
          setTasks(prev => {
            const localIds = new Set(prev.map(t => t.id));
            const newFromCloud = parsed.filter(t => !localIds.has(t.id));
            const combined = [...prev, ...newFromCloud];
            localStorage.setItem(accountKey, JSON.stringify(combined));
            return combined;
          });
        } else {
          setTasks(prev => {
            if (prev.length > 0) {
              localStorage.setItem(accountKey, JSON.stringify(prev));
            }
            return prev;
          });
        }
        const nowIso = new Date().toISOString();
        setLastTasksSync(nowIso);
        localStorage.setItem('timenest_last_tasks_sync', nowIso);
      }
    } catch (e) {
      console.error('Error fetching Google Tasks', e);
    } finally {
      setIsSyncingTasks(false);
    }
  };

  const pushAllLocalTasksToGoogle = async () => {
    if (!googleSync.isConnected) return;
    const unpushed = tasks.filter(t => !t.id.startsWith('google-') && t.source !== 'google');
    for (const t of unpushed) {
      await pushTaskToGoogle(t, false);
    }
  };

  useEffect(() => {
    if (!googleSync.isConnected) return;
    
    syncGoogleTasksNow();

    const interval = setInterval(() => {
       if (!document.hidden) syncGoogleTasksNow();
    }, 60000);
    
    const handleVisibilityChange = () => {
       if (!document.hidden) syncGoogleTasksNow();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
       clearInterval(interval);
       document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [googleSync.isConnected, googleSync.accessToken, googleSync.email]);

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
      // Use basic heuristics if no learned data
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
      source: googleSync.isConnected ? 'google' : 'nlp',
      recurrenceRule: options?.recurrenceRule,
      notificationOffset: options?.notificationOffset,
      alarmEnabled: options?.alarmEnabled,
      projectId: options?.projectId
    };
    
    setTasks(prev => [newTask, ...prev]);
    audio.playClick();
    
    if (googleSync.isConnected) {
       pushTaskToGoogle(newTask, false);
    }
    return newTask.id;
  };

  const updateTaskStatus = (id: string, status: 'pending' | 'completed') => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
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
      if (googleSync.isConnected) {
        pushTaskToGoogle({ ...task, status }, true);
      }
    } else if (task && googleSync.isConnected) {
      pushTaskToGoogle({ ...task, status }, true);
    }
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const current = tasks.find(t => t.id === id);
    if (current && googleSync.isConnected) {
      pushTaskToGoogle({ ...current, ...updates }, true);
    }
  };

  const deleteTask = (id: string) => {
    if (googleSync.isConnected) {
      deleteTaskFromGoogle(id);
    }
    setTasks(prev => prev.filter(t => t.id !== id));
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
    // In a full app, this would create a Routine template. 
    // For this prototype, we'll just dismiss it with a success sound.
    audio.playChimeDone();
    alert(`Rotina criada para: ${id}`);
  };

  const dismissSuggestion = (_id: string) => {
    // We would store this in a "dismissedSuggestions" array to avoid showing it again soon.
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
