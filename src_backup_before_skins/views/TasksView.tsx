// Tasks View - To-Do List Management for TimeNest

import React, { useState } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { formatDurationFriendly } from '../utils/time';
import { Plus, Check, Clock, BrainCircuit, Play } from 'lucide-react';
import { audio } from '../utils/audio';
import { useFocus } from '../contexts/FocusContext';
import { useNavigation } from '../contexts/NavigationContext';
import { SmartInputOverlay } from '../components/SmartInputOverlay';

export const TasksView: React.FC = () => {
  const { tasks, suggestions, acceptSuggestion, dismissSuggestion } = useTasks();
  const { startTimer } = useFocus();
  const { setActiveTab } = useNavigation();
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [showInput, setShowInput] = useState(false);

  const handlePlay = (task: any) => {
    audio.playClick();
    startTimer(task, task.estimatedDuration);
    setActiveTab('focus');
  };



  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  // Group by priority/size for visual hierarchy
  const bigTasks = filteredTasks.filter(t => t.size === 'Grande' && t.status === 'pending');
  const otherTasks = filteredTasks.filter(t => t.size !== 'Grande' || t.status === 'completed');

  const renderTask = (task: any) => (
    <div 
      key={task.id} 
      className={`group flex items-center justify-between p-3 bg-card-bg rounded-2xl border transition-all ${
        task.status === 'completed' 
          ? 'opacity-60 grayscale border-transparent' 
          : 'border-border-color hover:border-brand-300 dark:hover:border-brand-700 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className={`w-2.5 h-2.5 mt-1.5 shrink-0 rounded-full ${
          task.status === 'completed' ? 'bg-text-secondary' :
          task.size === 'Grande' ? 'bg-red-500' :
          task.size === 'Média' ? 'bg-blue-500' : 'bg-green-500'
        }`}></span>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${task.status === 'completed' ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
            {task.title}
          </p>
          
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 ${
              task.size === 'Grande' ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
              task.size === 'Média' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' :
              'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400'
            }`}>
              <Clock className="w-2.5 h-2.5" />
              {formatDurationFriendly(task.estimatedDuration)}
            </span>

            {task.category !== 'Geral' && (
              <span className="text-[9px] font-bold text-text-secondary bg-app-bg border border-border-color px-1.5 py-0.5 rounded">
                {task.category}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {task.status === 'pending' && (
        <button 
          onClick={() => handlePlay(task)}
          className="w-10 h-10 shrink-0 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center text-white shadow-md active:scale-95 transition-transform ml-3"
        >
          <Play className="w-4 h-4 fill-current ml-0.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-app-bg animate-fade-in relative pb-20">
      
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-text-primary">Tarefas Flexíveis</h2>
        </div>

        {/* Filters */}
        <div className="flex gap-2 bg-card-bg p-1 rounded-xl border border-border-color">
          {['pending', 'completed', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => { audio.playClick(); setFilter(f as any); }}
              className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                filter === f 
                  ? 'bg-app-bg text-brand-600 dark:text-brand-400 shadow-sm border border-border-color/50' 
                  : 'text-text-secondary hover:bg-app-bg/50'
              }`}
            >
              {f === 'pending' ? 'Pendentes' : f === 'completed' ? 'Feitas' : 'Todas'}
            </button>
          ))}
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pb-8">
        
        {/* Repetition Suggestions (Intelligence) */}
        {suggestions.length > 0 && filter === 'pending' && (
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-3">
              <BrainCircuit className="w-4 h-4 text-brand-500" />
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Sugestões de Rotina</h3>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 custom-scrollbar snap-x">
              {suggestions.map(sug => (
                <div key={sug.id} className="snap-center shrink-0 w-64 bg-brand-50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800/50 p-3 rounded-2xl">
                  <p className="text-[10px] text-text-secondary mb-1">Você criou isso {sug.count}x recentemente.</p>
                  <p className="text-sm font-bold text-brand-900 dark:text-brand-300 mb-3 truncate">{sug.originalTitle}</p>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => dismissSuggestion(sug.id)}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-brand-600 bg-brand-100/50 dark:bg-brand-900/30 hover:bg-brand-200/50"
                    >
                      Ignorar
                    </button>
                    <button 
                      onClick={() => acceptSuggestion(sug.id)}
                      className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm"
                    >
                      Tornar Rotina
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Big Tasks Section */}
        {bigTasks.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Grandes Projetos</h3>
            <div className="flex flex-col gap-2">
              {bigTasks.map(renderTask)}
            </div>
          </div>
        )}

        {/* Other Tasks Section */}
        <div>
          {bigTasks.length > 0 && (
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Outras Tarefas</h3>
          )}
          
          <div className="flex flex-col gap-2">
            {otherTasks.length > 0 ? (
              otherTasks.map(renderTask)
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-text-secondary flex items-center justify-center mb-4">
                  <Check className="w-8 h-8 text-text-secondary" />
                </div>
                <p className="text-sm font-semibold text-text-primary">Tudo limpo por aqui</p>
                <p className="text-xs text-text-secondary mt-1 max-w-[200px]">Nenhuma tarefa nesta categoria no momento.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Floating Add Button */}
      <button 
        onClick={() => { audio.playClick(); setShowInput(true); }}
        className="absolute bottom-24 right-5 w-14 h-14 bg-brand-600 hover:bg-brand-500 text-white rounded-full shadow-lg shadow-brand-500/30 flex items-center justify-center active:scale-95 transition-all z-20"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Smart Input Overlay */}
      <SmartInputOverlay 
        isOpen={showInput}
        onClose={() => setShowInput(false)}
        initialValue=""
      />
    </div>
  );
};
