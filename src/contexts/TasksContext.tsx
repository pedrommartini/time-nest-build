// Tasks and Repetition/Suggestion Context for TimeNest

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Task } from '../utils/time';
import { parseNLPInput, normalizeTitle, getSimilarity } from '../utils/nlp';
import { audio } from '../utils/audio';
import confetti from 'canvas-confetti';
import { usePreferences } from './PreferencesContext';
import { useCalendar } from './CalendarContext';
import { useGamification } from './GamificationContext';

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

  const syncGoogleTasksNow = async () => {
    if (!googleSync.isConnected || !googleSync.accessToken || googleSync.accessToken === 'demo_token') return;
    try {
      const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists/@default/tasks?showCompleted=true&showHidden=true', {
        headers: { 'Authorization': `Bearer ${googleSync.accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        const googleTasks: Task[] = (data.items || [])
          .filter((item: any) => item.status !== 'hidden' && item.title)
          .map((item: any) => ({
            id: `google-${item.id}`,
            title: item.title,
            estimatedDuration: 30, // Default for imported tasks
            size: 'Média',
            priority: 'Média',
            status: item.status === 'completed' ? 'completed' : 'pending',
            category: 'Google Tasks',
            createdAt: item.updated || new Date().toISOString(),
            source: 'google'
          }));
        
        setTasks(prev => {
           const locals = prev.filter(t => t.source !== 'google');
           return [...locals, ...googleTasks];
        });
      }
    } catch (e) {
      console.error('Error fetching Google Tasks', e);
    }
  };

  useEffect(() => {
    if (!googleSync.isConnected || !googleSync.accessToken || googleSync.accessToken === 'demo_token') return;
    
    const interval = setInterval(() => {
       if (!document.hidden) syncGoogleTasksNow();
    }, 60000);
    
    const handleVisibilityChange = () => {
       if (!document.hidden) syncGoogleTasksNow();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    syncGoogleTasksNow();
    
    return () => {
       clearInterval(interval);
       document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [googleSync.isConnected, googleSync.accessToken]);

  const pushTaskToGoogle = async (task: Task, isUpdate = false) => {
    if (!googleSync.isConnected || !googleSync.accessToken || googleSync.accessToken === 'demo_token') return;
    try {
      let url = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks';
      let method = 'POST';
      let body: any = { title: task.title, status: task.status === 'completed' ? 'completed' : 'needsAction' };
      
      if (task.description) {
        body.notes = task.description;
      }

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
        body: JSON.stringify(body)
      });
      
      if (response.ok && !isUpdate) {
         const data = await response.json();
         setTasks(prev => prev.map(t => t.id === task.id ? { ...t, id: `google-${data.id}`, source: 'google' } : t));
      }
    } catch(e) {}
  };
  
  const deleteTaskFromGoogle = async (taskId: string) => {
    if (!googleSync.isConnected || !googleSync.accessToken || googleSync.accessToken === 'demo_token' || !taskId.startsWith('google-')) return;
    try {
      const googleId = taskId.replace('google-', '');
      await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${googleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${googleSync.accessToken}` }
      });
    } catch(e) {}
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
      source: 'nlp',
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
      pushTaskToGoogle({ ...task, status }, true);
    } else if (task) {
      pushTaskToGoogle({ ...task, status }, true);
    }
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    const updated = tasks.find(t => t.id === id);
    if (updated && updated.id.startsWith('google-')) {
       pushTaskToGoogle({ ...updated, ...updates }, true);
    }
  };

  const deleteTask = (id: string) => {
    if (id.startsWith('google-')) {
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
      suggestions, acceptSuggestion, dismissSuggestion, resetLearning
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
