import React, { useState, useEffect } from 'react';
import { useFocus } from '../contexts/FocusContext';
import { useTasks } from '../contexts/TasksContext';
import { useBackHandler } from '../contexts/NavigationContext';
import { Play, Pause, Square, Headphones, Volume2, CloudRain, Waves, Coffee, TreePine, Clock, X, Check, AlertCircle, Sparkles, Utensils, Edit2, CheckCircle2, Flame, TrendingUp } from 'lucide-react';
import { audio } from '../utils/audio';

export const FocusView: React.FC = () => {
  const { 
    activeTask, isActive, isPaused,
    timeRemaining, totalDuration,
    ambientSound, setAmbientSound, ambientVolume, setAmbientVolume,
    stats, startTimer, pauseTimer, resumeTimer, stopTimer 
  } = useFocus();
  
  const { tasks } = useTasks();
  
  const [activeTab, setActiveTab] = useState<'foco' | 'sessoes' | 'sons'>('foco');
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [durationInput, setDurationInput] = useState<number>(30);
  const [conflictError, setConflictError] = useState<string | null>(null);

  // Close task selector modal if open
  useBackHandler(() => {
    setShowTaskSelector(false);
    return true;
  }, showTaskSelector, 20);

  // Switch back to 'foco' tab if in 'sessoes' or 'sons'
  useBackHandler(() => {
    setActiveTab('foco');
    return true;
  }, activeTab !== 'foco' && !showTaskSelector, 10);

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
    <div className="h-full flex flex-col bg-app-bg animate-fade-in relative pb-20 overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="px-6 pt-8 pb-5 shrink-0">
        <h2 className="text-3xl font-black text-text-primary truncate tracking-tight">
          {isActive && activeTask ? activeTask.title : 'Foco Profundo'}
        </h2>
        <p className="text-[13px] font-semibold text-text-secondary/80 mt-1">
          Concentre-se no que importa e veja seus resultados.
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-6 shrink-0">
        <div className="bg-card-bg rounded-2xl border border-border-color/60 flex p-1 shadow-sm">
          <button 
            onClick={() => { audio.playClick(); setActiveTab('foco'); }} 
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'foco' ? 'bg-brand-50/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-text-secondary hover:bg-app-bg'}`}
          >
            <Clock className="w-4 h-4" /> Foco agora
          </button>
          <button 
            onClick={() => { audio.playClick(); setActiveTab('sessoes'); }} 
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'sessoes' ? 'bg-brand-50/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-text-secondary hover:bg-app-bg'}`}
          >
            <TrendingUp className="w-4 h-4" /> Sessões
          </button>
          <button 
            onClick={() => { audio.playClick(); setActiveTab('sons'); }} 
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'sons' ? 'bg-brand-50/80 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-text-secondary hover:bg-app-bg'}`}
          >
            <Headphones className="w-4 h-4" /> Sons
          </button>
        </div>
      </div>

      {activeTab === 'foco' && (
        <div className="animate-fade-in flex flex-col">
          {/* Main Focus Card */}
          <div className="bg-card-bg mx-5 rounded-[32px] border border-border-color shadow-sm p-6 mb-6 flex flex-col items-center relative overflow-hidden">
            
            <span className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-[11px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full border border-brand-100 dark:border-brand-800 flex items-center gap-2 mb-8">
              <Clock className="w-3.5 h-3.5" /> Sessão de foco
            </span>
            
            {/* Circular Timer */}
            <div className="relative w-64 h-64 flex items-center justify-center rounded-full mb-8">
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible">
                <circle cx="128" cy="128" r="118" className="stroke-brand-50 dark:stroke-brand-900/20 fill-none" strokeWidth="6" />
                <circle 
                  cx="128" cy="128" r="118" 
                  className="fill-none transition-all duration-1000 ease-linear stroke-brand-500" 
                  strokeWidth="6" 
                  strokeDasharray="741.4" 
                  strokeDashoffset={isActive ? 741.4 - (741.4 * progress) / 100 : 0} 
                  strokeLinecap="round" 
                />
              </svg>
              
              {/* White Handle */}
              <div className="absolute w-full h-full pointer-events-none transition-all duration-1000 ease-linear z-10" style={{ transform: `rotate(${progress * 3.6}deg)` }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-brand-500 rounded-full mt-1.5 shadow-sm"></div>
              </div>

              <div className="flex flex-col items-center justify-center z-10 w-full">
                <span className="text-[13px] font-bold text-text-secondary/70 mb-1">Faltam</span>
                <span className="text-6xl font-mono text-text-primary tracking-tighter font-normal mb-2">
                   {formatTimeBig(isActive ? timeRemaining : durationInput * 60)}
                </span>
                <span className="bg-brand-50 dark:bg-brand-900/30 text-brand-500 dark:text-brand-400 text-[11px] font-bold px-3 py-1 rounded-full mb-3">
                   até o {activeTask ? 'evento' : 'foco'} terminar
                </span>
                <div className="flex items-center gap-1.5 text-text-secondary font-semibold text-xs">
                   <Clock className="w-3.5 h-3.5" /> {activeTask ? 'Tarefa' : 'Sessão'} de {activeTask?.estimatedDuration || durationInput} mins
                </div>
              </div>
            </div>

            {/* Info Block */}
            <div className="w-full bg-app-bg/50 border border-border-color rounded-2xl p-4 flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-xl flex items-center justify-center shrink-0">
                  <Utensils className="w-6 h-6 text-brand-500" />
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-sm font-bold text-text-primary truncate">
                    {isActive && activeTask ? activeTask.title : 'Sessão Livre'}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-text-secondary flex items-center gap-1"><Clock className="w-3 h-3" /> {(activeTask?.estimatedDuration || durationInput)} min</span>
                    <span className="bg-brand-100/50 text-brand-600 text-[9px] font-bold px-2 py-0.5 rounded-full">{activeTask ? 'Tarefa' : 'Foco'}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowTaskSelector(true)} className="text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform px-2 shrink-0">
                 <Edit2 className="w-3.5 h-3.5" /> Alterar
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 w-full px-2">
              <button onClick={() => stopTimer()} className="flex flex-col items-center gap-2 active:scale-95 transition-transform group">
                <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/40 transition-colors shadow-sm">
                   <Square className="w-6 h-6 text-brand-600 dark:text-brand-400 fill-brand-600 dark:fill-brand-400" />
                </div>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Stop</span>
              </button>

              {!isActive ? (
                <button onClick={() => { audio.playClick(); setShowTaskSelector(true); }} className="flex flex-col items-center gap-2 active:scale-95 transition-transform group">
                  <div className="w-20 h-20 bg-brand-600 rounded-full shadow-[0_8px_20px_rgba(98,93,218,0.3)] flex items-center justify-center hover:scale-105 transition-all">
                     <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </div>
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Iniciar</span>
                </button>
              ) : (
                <button onClick={isPaused ? resumeTimer : pauseTimer} className="flex flex-col items-center gap-2 active:scale-95 transition-transform group">
                  <div className="w-20 h-20 bg-brand-600 rounded-full shadow-[0_8px_20px_rgba(98,93,218,0.3)] flex items-center justify-center hover:scale-105 transition-all">
                     {isPaused ? <Play className="w-8 h-8 text-white fill-white ml-1" /> : <Pause className="w-8 h-8 text-white fill-white" />}
                  </div>
                  <span className="text-xs font-bold text-brand-600 dark:text-brand-400">{isPaused ? 'Retomar' : 'Pausar'}</span>
                </button>
              )}

              <button onClick={() => stopTimer(true)} className="flex flex-col items-center gap-2 active:scale-95 transition-transform group">
                <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center group-hover:bg-brand-100 dark:group-hover:bg-brand-900/40 transition-colors shadow-sm">
                   <Check className="w-7 h-7 text-brand-600 dark:text-brand-400 stroke-[3]" />
                </div>
                <span className="text-xs font-bold text-brand-600 dark:text-brand-400">Concluído</span>
              </button>
            </div>
          </div>

          {/* Session Stats */}
          <div className="px-6 mb-6">
            <h3 className="text-sm font-bold text-text-primary mb-3">Sessão atual</h3>
            <div className="bg-card-bg border border-border-color rounded-2xl p-4 flex justify-between items-center shadow-sm">
              <div className="flex flex-col items-center flex-1 border-r border-border-color/60">
                 <Clock className="w-4 h-4 text-brand-500 mb-1" />
                 <span className="text-[8px] font-bold text-text-secondary uppercase tracking-widest mb-0.5 text-center px-1">Tempo focado</span>
                 <span className="text-sm font-black text-text-primary">20 min</span>
              </div>
              <div className="flex flex-col items-center flex-1 border-r border-border-color/60">
                 <CheckCircle2 className="w-4 h-4 text-green-500 mb-1" />
                 <span className="text-[8px] font-bold text-text-secondary uppercase tracking-widest mb-0.5 text-center px-1">Ciclos</span>
                 <span className="text-sm font-black text-text-primary">{stats.completedCycles} / 4</span>
              </div>
              <div className="flex flex-col items-center flex-1 border-r border-border-color/60">
                 <Flame className="w-4 h-4 text-orange-500 mb-1" />
                 <span className="text-[8px] font-bold text-text-secondary uppercase tracking-widest mb-0.5 text-center px-1">Foco hoje</span>
                 <span className="text-sm font-black text-text-primary">{stats.focusMinutesToday}m</span>
              </div>
              <div className="flex flex-col items-center flex-1">
                 <TrendingUp className="w-4 h-4 text-blue-500 mb-1" />
                 <span className="text-[8px] font-bold text-text-secondary uppercase tracking-widest mb-0.5 text-center px-1">Sequência</span>
                 <span className="text-sm font-black text-text-primary">{stats.bestStreak} dias</span>
              </div>
            </div>
          </div>

          {/* Smart Suggestion */}
          <div className="px-6 mb-8">
            <div className="bg-card-bg border border-border-color rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span className="text-xs font-bold text-text-primary">Sugestão inteligente</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-text-secondary leading-relaxed">
                  Você tem mais <span className="font-bold text-text-primary">1h 45min</span> livres hoje.<br/>
                  {pendingTasks.length > 0 ? (
                    <>Que tal começar <span className="text-brand-600 font-bold">"{pendingTasks[0].title}"</span>?</>
                  ) : (
                    <>Aproveite para descansar ou ler um livro!</>
                  )}
                </p>
                <button className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-bold py-2.5 px-4 rounded-xl shrink-0 border border-brand-100 dark:border-brand-800">
                  Ver tarefas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessoes' && (
        <div className="px-6 animate-fade-in flex flex-col items-center justify-center py-20 text-center">
          <TrendingUp className="w-16 h-16 text-border-color mb-4" />
          <h3 className="text-lg font-bold text-text-primary mb-2">Histórico de Sessões</h3>
          <p className="text-sm text-text-secondary">Seu progresso será exibido aqui em breve.</p>
        </div>
      )}

      {activeTab === 'sons' && (
        <div className="px-6 animate-fade-in">
          {/* Ambient Sound Panel */}
          <div className="w-full bg-card-bg p-6 rounded-3xl border border-border-color shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-brand-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Ruído Branco</h3>
                  <p className="text-xs text-text-secondary">Concentre-se com sons relaxantes</p>
                </div>
              </div>
              {ambientSound !== 'none' && (
                <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 capitalize bg-brand-50 dark:bg-brand-900/20 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-900/30">
                  Tocando
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-5 gap-2 mb-6">
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
                  className={`flex flex-col items-center justify-center py-3 rounded-2xl gap-2 transition-all ${
                    ambientSound === s.id 
                      ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/50 shadow-inner scale-95' 
                      : 'bg-app-bg/50 text-text-secondary border border-transparent hover:border-border-color/40 active:scale-95'
                  }`}
                >
                  <s.icon className={`w-5 h-5 ${ambientSound === s.id ? 'fill-brand-600/20' : ''}`} />
                  <span className="text-[10px] font-bold">{s.label}</span>
                </button>
              ))}
            </div>
            
            {ambientSound !== 'none' && (
              <div className="flex items-center gap-4 bg-app-bg/50 rounded-2xl p-4 animate-fade-in border border-border-color/50">
                <Volume2 className="w-5 h-5 text-text-secondary shrink-0" />
                <input 
                  type="range" 
                  min="0" max="1" step="0.05"
                  value={ambientVolume}
                  onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                  className="w-full accent-brand-500 h-1.5 bg-border-color rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Selector Bottom Sheet */}
      {showTaskSelector && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex flex-col justify-end animate-fade-in" onClick={() => setShowTaskSelector(false)}>
          <div 
            className="modal-standard w-full h-[80vh] rounded-t-3xl rounded-b-none p-6 animate-slide-up flex flex-col"
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
                className="flex-1 py-4 btn-secondary text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={handleStart}
                className="flex-[2] py-4 btn-primary text-xs truncate px-2"
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
