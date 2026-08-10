// Focus View - Timer and Ambient Audio for TimeNest

import React, { useState, useEffect } from 'react';
import { useFocus } from '../contexts/FocusContext';
import { useTasks } from '../contexts/TasksContext';
import { Play, Pause, Square, Headphones, Volume2, CloudRain, Waves, Coffee, TreePine, Clock, X, Check, AlertCircle } from 'lucide-react';
import { audio } from '../utils/audio';

export const FocusView: React.FC = () => {
  const { 
    activeTask, isActive, isPaused,
    timeRemaining, totalDuration,
    ambientSound, setAmbientSound, ambientVolume, setAmbientVolume,
    stats, startTimer, pauseTimer, resumeTimer, stopTimer 
  } = useFocus();
  
  const { tasks } = useTasks();
  
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [durationInput, setDurationInput] = useState<number>(30);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Clear conflict error when opening/closing the selector
  useEffect(() => {
    if (!showTaskSelector) {
      setConflictError(null);
    }
  }, [showTaskSelector]);

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  const formatTimeBig = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStart = () => {
    const result = startTimer(selectedTask, durationInput);
    if (!result.success) {
      setConflictError(result.error || 'Conflito de horário detectado.');
      audio.playClick();
    } else {
      setConflictError(null);
      setShowTaskSelector(false);
    }
  };

  const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;

  return (
    <div className="h-full flex flex-col bg-app-bg animate-fade-in relative pb-20">
      
      {/* Header */}
      <div className="px-5 pt-6 pb-4 shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-text-primary truncate pr-4">
            {isActive && activeTask ? activeTask.title : 'Foco Profundo'}
          </h2>
          <div className="bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-800/50 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-brand-700 dark:text-brand-300">
              {stats.focusMinutesToday} min hoje
            </span>
          </div>
        </div>
      </div>

      {/* Visually Centered Main Body */}
      <div className="flex-1 flex flex-col items-center justify-between px-5 pb-6 pt-2 overflow-y-auto custom-scrollbar">
        <div /> {/* Top spacer for vertical balance */}

        {/* Timer Circle & Task Label */}
        <div className="flex flex-col items-center justify-center my-auto">
          {isActive && activeTask && (
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/20 border border-brand-100 dark:border-brand-900/30 px-3.5 py-1 rounded-full uppercase tracking-wider mb-5 max-w-[280px] truncate text-center animate-slide-up">
              {activeTask.title}
            </span>
          )}

          <div className={`
            relative w-64 h-64 flex items-center justify-center rounded-full transition-all duration-1000
            ${isActive && !isPaused ? 'shadow-[0_0_35px_rgba(120,124,225,0.18)] border border-brand-500/20' : 'border border-border-color/30'}
          `}>
            {/* Background SVG Ring with Linear Gradient */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
              <defs>
                <linearGradient id="timer-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-brand-400, #939ae8)" />
                  <stop offset="100%" stopColor="var(--color-brand-600, #625dda)" />
                </linearGradient>
              </defs>
              <circle 
                cx="128" cy="128" r="118" 
                className="stroke-border-color/60 dark:stroke-border-color/30 fill-none" 
                strokeWidth="5"
              />
              <circle 
                cx="128" cy="128" r="118" 
                className="fill-none transition-all duration-1000 ease-linear" 
                stroke="url(#timer-grad)"
                strokeWidth="6"
                strokeDasharray="741.4" // 2 * PI * 118
                strokeDashoffset={isActive ? 741.4 - (741.4 * progress) / 100 : 0}
                strokeLinecap="round"
              />
            </svg>

            {/* Time Display */}
            <div className="flex flex-col items-center justify-center z-10">
              <span className={`text-6xl font-mono font-extralight tracking-tighter ${
                isPaused ? 'text-slate-500 dark:text-slate-400' : 
                isActive ? 'text-brand-600 dark:text-brand-400' : 'text-text-primary'
              }`}>
                {formatTimeBig(isActive ? timeRemaining : durationInput * 60)}
              </span>
              
              {!isActive && (
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mt-2">minutos</span>
              )}
            </div>
          </div>
        </div>

        {/* Controls & Ambient Panel (grouped at the bottom) */}
        <div className="w-full flex flex-col items-center gap-6 mt-4 shrink-0">
          
          {/* Main Action Buttons */}
          <div className="w-full flex justify-center">
            {!isActive ? (
              <button 
                onClick={() => { audio.playClick(); setShowTaskSelector(true); }}
                className="w-full max-w-[240px] py-4 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                Iniciar Foco
              </button>
            ) : (
              <div className="flex items-center gap-6 animate-fade-in">
                <button 
                  onClick={() => stopTimer()}
                  className="w-14 h-14 rounded-full bg-card-bg border border-border-color text-text-secondary flex items-center justify-center hover:bg-border-color/30 active:scale-95 transition-all shadow-sm"
                >
                  <Square className="w-5 h-5 fill-current" />
                </button>
                
                {isPaused ? (
                  <button 
                    onClick={resumeTimer}
                    className="w-20 h-20 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/30 active:scale-95 transition-all"
                  >
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </button>
                ) : (
                  <button 
                    onClick={pauseTimer}
                    className="w-20 h-20 rounded-full bg-slate-500 dark:bg-slate-600 text-white flex items-center justify-center shadow-lg shadow-slate-500/30 active:scale-95 transition-all"
                  >
                    <Pause className="w-8 h-8 fill-current" />
                  </button>
                )}
                
                <button 
                  onClick={() => stopTimer(true)}
                  className="w-14 h-14 rounded-full bg-card-bg border border-brand-200 dark:border-brand-900/50 text-brand-600 dark:text-brand-400 flex items-center justify-center hover:bg-brand-50 dark:hover:bg-brand-900/30 active:scale-95 transition-all shadow-sm"
                >
                  <Check className="w-6 h-6" strokeWidth={3} />
                </button>
              </div>
            )}
          </div>

          {/* Compact Ambient Sound Panel */}
          <div className="w-full bg-card-bg/50 backdrop-blur-md p-4 rounded-3xl border border-border-color/60 shadow-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Headphones className="w-3.5 h-3.5 text-text-secondary" />
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Ruído Branco</span>
              </div>
              {ambientSound !== 'none' && (
                <span className="text-[9px] font-bold text-brand-600 dark:text-brand-400 capitalize bg-brand-50 dark:bg-brand-900/20 px-2.5 py-0.5 rounded-full border border-brand-100 dark:border-brand-900/30">
                  Ativo
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-5 gap-1.5 mb-3.5">
              {[
                { id: 'none', icon: X, label: 'Off' },
                { id: 'rain', icon: CloudRain, label: 'Chuva' },
                { id: 'waves', icon: Waves, label: 'Ondas' },
                { id: 'cafe', icon: Coffee, label: 'Café' },
                { id: 'forest', icon: TreePine, label: 'Mata' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => { audio.playClick(); setAmbientSound(s.id as any); }}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl gap-1 transition-all ${
                    ambientSound === s.id 
                      ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/50 shadow-inner scale-95' 
                      : 'bg-app-bg/50 text-text-secondary border border-transparent hover:border-border-color/40 active:scale-95'
                  }`}
                >
                  <s.icon className={`w-4 h-4 ${ambientSound === s.id ? 'fill-brand-600/20' : ''}`} />
                  <span className="text-[9px] font-semibold">{s.label}</span>
                </button>
              ))}
            </div>
            
            {ambientSound !== 'none' && (
              <div className="flex items-center gap-3 px-2 animate-fade-in">
                <Volume2 className="w-3.5 h-3.5 text-text-secondary" />
                <input 
                  type="range" 
                  min="0" max="1" step="0.05"
                  value={ambientVolume}
                  onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                  className="w-full accent-brand-500 h-1 bg-border-color rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
          
        </div>
      </div>

      {/* Task Selector Bottom Sheet */}
      {showTaskSelector && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col justify-end animate-fade-in" onClick={() => setShowTaskSelector(false)}>
          <div 
            className="bg-app-bg w-full h-[80vh] rounded-t-3xl p-6 shadow-2xl animate-slide-up border-t border-border-color flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-border-color rounded-full mx-auto mb-6 shrink-0"></div>
            
            <h3 className="text-lg font-bold text-text-primary mb-4 shrink-0">Configurar Sessão</h3>

            {conflictError && (
              <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 animate-slide-up shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Conflito de Horário</p>
                  <p className="mt-0.5 leading-relaxed">{conflictError}</p>
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto custom-scrollbar -mx-2 px-2 pb-6">
              <div className="mb-6">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Duração (minutos)</span>
                <div className="flex gap-2">
                  {[15, 25, 30, 45, 60, 90].map(m => (
                    <button
                      key={m}
                      onClick={() => { audio.playClick(); setDurationInput(m); }}
                      className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${
                        durationInput === m
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'bg-card-bg border border-border-color text-text-primary'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 block">Vincular Tarefa (Opcional)</span>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { audio.playClick(); setSelectedTask(null); }}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      selectedTask === null
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10'
                        : 'border-border-color bg-card-bg'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${selectedTask === null ? 'text-brand-600 dark:text-brand-400' : 'text-text-primary'}`}>Sessão Livre (Sem tarefa)</span>
                    {selectedTask === null && <Check className="w-4 h-4 text-brand-500" />}
                  </button>

                  {pendingTasks.map(task => (
                    <button
                      key={task.id}
                      onClick={() => { 
                        audio.playClick(); 
                        setSelectedTask(task); 
                        // Auto-adjust duration to task estimate if reasonable
                        if (task.estimatedDuration && task.estimatedDuration <= 120) {
                          setDurationInput(task.estimatedDuration);
                        }
                      }}
                      className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                        selectedTask?.id === task.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10'
                          : 'border-border-color bg-card-bg'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className={`text-sm font-semibold truncate ${selectedTask?.id === task.id ? 'text-brand-600 dark:text-brand-400' : 'text-text-primary'}`}>
                          {task.title}
                        </span>
                        {selectedTask?.id === task.id && <Check className="w-4 h-4 text-brand-500 shrink-0 ml-2" />}
                      </div>
                      <span className="text-[10px] text-text-secondary flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Est: {task.estimatedDuration} min
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border-color mt-auto shrink-0 flex gap-3">
              <button 
                onClick={() => setShowTaskSelector(false)}
                className="flex-1 py-4 rounded-2xl text-xs font-bold text-text-secondary bg-card-bg border border-border-color hover:bg-border-color/30 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleStart}
                className="flex-[2] py-4 rounded-2xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/30 active:scale-95 transition-all truncate px-2"
              >
                Iniciar {selectedTask ? selectedTask.title : 'Sessão Livre'} ({durationInput}m)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
