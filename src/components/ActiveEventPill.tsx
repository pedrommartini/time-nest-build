import React, { useEffect, useState } from 'react';
import { useFocus } from '../contexts/FocusContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useCalendar } from '../contexts/CalendarContext';
import { audio } from '../utils/audio';

export const ActiveEventPill: React.FC = () => {
  const { isActive, isPaused, activeTask, activeEventId, timeRemaining, totalDuration } = useFocus();
  const { setActiveTab } = useNavigation();
  const { events } = useCalendar();

  const [title, setTitle] = useState('Foco em Andamento');

  useEffect(() => {
    if (activeTask) {
      setTitle(activeTask.title);
    } else if (activeEventId) {
      const ev = events.find(e => e.id === activeEventId);
      if (ev) {
        setTitle(ev.title);
      } else {
        setTitle('Evento em Andamento');
      }
    }
  }, [activeTask, activeEventId, events]);

  if (!isActive) return null;

  const progress = totalDuration > 0 ? ((totalDuration - timeRemaining) / totalDuration) * 100 : 0;
  
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div 
      onClick={() => { audio.playClick(); setActiveTab('focus'); }}
      className={`
        absolute bottom-[88px] left-1/2 -translate-x-1/2 w-[90%] max-w-[360px] 
        rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.06)] border cursor-pointer z-50 transition-all animate-slide-up
        flex flex-col overflow-hidden bg-app-bg
        ${isPaused ? 'border-yellow-400/50' : 'border-border-color/60'}
      `}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-4">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-brand-600 mb-0.5 lowercase tracking-wider">agora</span>
          <span className="font-bold text-text-primary text-[17px] truncate max-w-[170px] leading-tight">{title}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-bold text-brand-600 mb-0.5">termina em</span>
          <span className="font-bold text-brand-600 text-[26px] font-mono leading-none tracking-tight">{formatTime(timeRemaining)}</span>
        </div>
      </div>
      <div className="w-full h-[3px] bg-border-color/30 mt-auto">
        <div 
          className="h-full bg-brand-500 transition-all duration-1000 ease-linear rounded-r-full"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};
