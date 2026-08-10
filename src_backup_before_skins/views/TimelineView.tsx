// Timeline View - Core Screen for TimeNest

import React, { useEffect, useRef, useState } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { useTasks } from '../contexts/TasksContext';
import { useFocus } from '../contexts/FocusContext';
import { useNavigation } from '../contexts/NavigationContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { Play, Pause, Square, Search, Mic, CalendarDays, Menu, ChevronUp, Clock, Moon } from 'lucide-react';
import { audio } from '../utils/audio';
import { SmartInputOverlay } from '../components/SmartInputOverlay';
import { TimelineEvent } from '../components/TimelineEvent';
import { getLocalDateString } from '../utils/time';

const getDaysDifference = (eventDateStr: string) => {
  if (!eventDateStr) return 0;
  const [ey, em, ed] = eventDateStr.split('-').map(Number);
  const eventDate = new Date(ey, em - 1, ed);
  eventDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper for px offset
const timeToOffsetPx = (timeStr: string, hourHeight: number = 80) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  // Shift by 365 days (8760 hours) to place "Today" in the middle of a 2-year virtual view
  return (h + 8760) * hourHeight + (m / 60) * hourHeight;
};

export const TimelineView: React.FC = () => {
  const { events, freeIntervals, updateEventTimes, deleteEvent } = useCalendar();
  const { tasks } = useTasks();
  const { activeTask, isActive, isPaused, timeRemaining, pauseTimer, resumeTimer, stopTimer, startTimer } = useFocus();
  const { setActiveTab } = useNavigation();
  const { isTestEnvironment, sleepStart, sleepEnd } = usePreferences();
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [availableMinutes, setAvailableMinutes] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isCentered, setIsCentered] = useState(true);
  const [visibleRange, setVisibleRange] = useState({ start: 8750, end: 8790 });
  
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isSmartInputOpen, setIsSmartInputOpen] = useState(false);
  const [startWithVoice, setStartWithVoice] = useState(false);

  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef<any>(null);

  // Tick every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();
      setCurrentTimeStr(`${String(currentH).padStart(2, '0')}:${String(currentM).padStart(2, '0')}`);
      
      const currentTotalMinutes = currentH * 60 + currentM;
      
      const todayStr = getLocalDateString();
      const todayEvents = events.filter(e => {
        if (e.date !== todayStr) return false;
        const [eh, em] = e.start.split(':').map(Number);
        return (eh * 60 + em) > currentTotalMinutes;
      }).sort((a, b) => {
        const aM = parseInt(a.start.split(':')[0]) * 60 + parseInt(a.start.split(':')[1]);
        const bM = parseInt(b.start.split(':')[0]) * 60 + parseInt(b.start.split(':')[1]);
        return aM - bM;
      });

      if (todayEvents.length > 0) {
        const next = todayEvents[0];
        const nextM = parseInt(next.start.split(':')[0]) * 60 + parseInt(next.start.split(':')[1]);
        setAvailableMinutes(nextM - currentTotalMinutes);
      } else {
        setAvailableMinutes(24 * 60 - currentTotalMinutes);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [events]);

  useEffect(() => {
    if (!containerRef.current || !currentTimeStr) return;
    const offset = timeToOffsetPx(currentTimeStr);
    const scrollTop = containerRef.current.scrollTop;
    const clientHeight = containerRef.current.clientHeight;
    const targetScrollTop = offset - (clientHeight - 85) / 2;
    setIsCentered(Math.abs(scrollTop - targetScrollTop) < 100);
  }, [currentTimeStr]);

  // Handle auto centering
  useEffect(() => {
    if (!containerRef.current || !currentTimeStr || !isAutoScrolling) return;
    const offset = timeToOffsetPx(currentTimeStr);
    
    // Smooth scroll to make "Agora" appear vertically centered
    const container = containerRef.current;
    
    isProgrammaticScroll.current = true;
    clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 1000);

    container.scrollTo({
      top: offset - (container.clientHeight - 85) / 2,
      behavior: 'smooth'
    });
  }, [currentTimeStr, isAutoScrolling]);

  // Handle user scroll breaking the auto-scroll lock
  const handleScroll = () => {
    if (!containerRef.current || !currentTimeStr) return;
    const offset = timeToOffsetPx(currentTimeStr);
    const scrollTop = containerRef.current.scrollTop;
    const clientHeight = containerRef.current.clientHeight;
    
    // Virtualization: render a small window of hours around the scroll position
    const startHour = Math.max(0, Math.floor(scrollTop / 80) - 5);
    const endHour = Math.min(17544, Math.ceil((scrollTop + clientHeight) / 80) + 5);
    setVisibleRange(prev => (prev.start !== startHour || prev.end !== endHour) ? { start: startHour, end: endHour } : prev);

    const targetScrollTop = offset - (clientHeight - 85) / 2;
    const nearCenter = Math.abs(scrollTop - targetScrollTop) < 100;
    setIsCentered(nearCenter);
    
    if (!nearCenter && !isProgrammaticScroll.current) {
      setIsAutoScrolling(false);
    } else if (nearCenter && !isProgrammaticScroll.current) {
      setIsAutoScrolling(true);
    }
  };

  const resumeAutoScroll = () => {
    audio.playClick();
    setIsAutoScrolling(true);
    setIsCentered(true);
    
    if (containerRef.current && currentTimeStr) {
      isProgrammaticScroll.current = true;
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 1000);

      containerRef.current.scrollTo({
        top: timeToOffsetPx(currentTimeStr) - (containerRef.current.clientHeight - 85) / 2,
        behavior: 'smooth'
      });
    }
  };

  const formatTimeRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="relative h-full flex flex-col bg-app-bg overflow-hidden animate-fade-in">
      
      {/* Header & Smart Input Bar */}
      <div className="z-40 bg-app-bg/80 backdrop-blur-md pt-6 pb-4 px-5 border-b border-border-color/50 flex gap-3 items-center shrink-0">
        <button className="w-10 h-10 rounded-full border border-border-color bg-card-bg flex items-center justify-center shadow-sm">
          <Menu className="w-5 h-5 text-text-secondary" />
        </button>
        
        <div className="flex-1 relative flex items-center">
          <Search className="w-5 h-5 text-text-secondary absolute left-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Adicionar tarefa ou evento..."
            readOnly
            onClick={() => { setStartWithVoice(false); setIsSmartInputOpen(true); }}
            className="w-full h-12 pl-11 pr-12 rounded-full border border-border-color bg-card-bg shadow-inner focus:outline-none focus:ring-2 focus:ring-brand-500/30 text-sm cursor-text"
          />
          <button type="button" onClick={() => { setStartWithVoice(true); setIsSmartInputOpen(true); }} className="absolute right-1 w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform">
            <Mic className="w-5 h-5" />
          </button>
        </div>

        {!isTestEnvironment && (
          <button className="w-10 h-10 rounded-full border border-border-color bg-card-bg flex items-center justify-center shadow-sm">
            <CalendarDays className="w-5 h-5 text-text-secondary" />
          </button>
        )}
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar relative pb-32"
      >
        <div className="relative w-full" style={{ height: '1403520px' }}>
          
          {/* Hour Grid Lines (Virtualized) */}
          {Array.from({ length: visibleRange.end - visibleRange.start + 1 }).map((_, i) => {
            const absoluteHour = visibleRange.start + i;
            const displayHour = absoluteHour % 24;
            const isMidnight = displayHour === 0;
            const daysFromToday = Math.floor(absoluteHour / 24) - 365;

            let dayLabel = '';
            if (isMidnight) {
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() + daysFromToday);
              const dateStr = `${String(targetDate.getDate()).padStart(2, '0')}/${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
              
              if (daysFromToday === 0) dayLabel = `Hoje, ${dateStr}`;
              else if (daysFromToday === 1) dayLabel = `Amanhã, ${dateStr}`;
              else if (daysFromToday === -1) dayLabel = `Ontem, ${dateStr}`;
              else dayLabel = dateStr;
            }

            const startSleepMins = parseInt(sleepStart.split(':')[0]) * 60 + parseInt(sleepStart.split(':')[1]);
            const endSleepMins = parseInt(sleepEnd.split(':')[0]) * 60 + parseInt(sleepEnd.split(':')[1]);
            const isMidnightInSleep = isMidnight && (startSleepMins > endSleepMins || (0 >= startSleepMins && 0 < endSleepMins));

            return (
              <div key={absoluteHour} className="absolute w-full flex items-center pr-4" style={{ top: absoluteHour * 80 }}>
                <span className={`text-[10px] w-12 text-right pr-2 ${
                  isMidnightInSleep ? 'text-sky-600 dark:text-sky-400 font-bold' :
                  isMidnight ? 'text-brand-500 dark:text-brand-400 font-bold' : 
                  'text-text-secondary font-medium'
                }`}>
                  {String(displayHour).padStart(2, '0')}:00
                </span>
                
                {isMidnight ? (
                  <div className="flex-1 relative flex justify-center items-center">
                    <div className={`absolute w-full h-[1px] ${isMidnightInSleep ? 'bg-sky-300/40 dark:bg-sky-800/40' : 'bg-border-color'}`}></div>
                    <span className={`relative z-10 px-3 py-0.5 text-[11px] uppercase tracking-widest font-bold shadow-xs rounded-full border ${
                      isMidnightInSleep 
                        ? 'bg-sky-100/90 dark:bg-sky-950/90 text-sky-700 dark:text-sky-300 border-sky-300/80 dark:border-sky-800/80' 
                        : 'bg-app-bg text-brand-600 dark:text-brand-400 border-border-color opacity-90'
                    }`}>
                      {dayLabel}
                    </span>
                  </div>
                ) : (
                  <div className="flex-1 h-[1px] bg-border-color"></div>
                )}
              </div>
            );
          })}

          {/* Sleep Blocks (Unified Continuous Block across Midnight) */}
          {Array.from({ length: Math.ceil((visibleRange.end - visibleRange.start) / 24) + 2 }).map((_, i) => {
            const currentDayOffset = Math.floor(visibleRange.start / 24) - 1 + i;
            const startMins = parseInt(sleepStart.split(':')[0]) * 60 + parseInt(sleepStart.split(':')[1]);
            const endMins = parseInt(sleepEnd.split(':')[0]) * 60 + parseInt(sleepEnd.split(':')[1]);
            
            let topPx = 0;
            let bottomPx = 0;

            if (startMins > endMins) {
              // Overnight sleep (e.g. 23:00 to 07:00) -> Spans across midnight continuously
              topPx = timeToOffsetPx(sleepStart) + (currentDayOffset - 365) * 24 * 80;
              bottomPx = timeToOffsetPx(sleepEnd) + (currentDayOffset + 1 - 365) * 24 * 80;
            } else {
              // Same day sleep
              topPx = timeToOffsetPx(sleepStart) + (currentDayOffset - 365) * 24 * 80;
              bottomPx = timeToOffsetPx(sleepEnd) + (currentDayOffset - 365) * 24 * 80;
            }

            const heightPx = Math.max(bottomPx - topPx, 40);

            return (
              <div 
                key={currentDayOffset}
                className="absolute left-14 right-4 rounded-2xl border-2 border-dashed p-3.5 flex items-start justify-between bg-sky-100/40 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 pointer-events-none z-0 shadow-xs"
                style={{ top: topPx, height: heightPx }}
              >
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                  <Moon className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  <span>Horário de Sono</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 bg-sky-200/50 dark:bg-sky-900/40 px-2 py-0.5 rounded-full">
                  {sleepStart} - {sleepEnd}
                </span>
              </div>
            );
          })}

          {/* Events */}
          {events.map(event => {
            const daysDiff = getDaysDifference(event.date);
            const top = timeToOffsetPx(event.start) + (daysDiff * 24 * 80);
            const bottom = timeToOffsetPx(event.end) + (daysDiff * 24 * 80);
            const height = Math.max(bottom - top, 20); // Min 20px

            return (
              <TimelineEvent
                key={event.id}
                event={event}
                initialTop={top}
                height={height}
                hourHeight={80}
                onUpdateTimes={updateEventTimes}
                onDelete={deleteEvent}
              />
            );
          })}

          {/* Free Intervals */}
          {freeIntervals.map((interval, i) => {
            // Hide intervals that have already passed
            if (currentTimeStr) {
               const [ch, cm] = currentTimeStr.split(':').map(Number);
               const [eh, em] = interval.end.split(':').map(Number);
               if (eh * 60 + em <= ch * 60 + cm) return null;
            }

            const top = timeToOffsetPx(interval.start);
            const bottom = timeToOffsetPx(interval.end);
            const height = Math.max(bottom - top, 24);

            return (
              <div 
                key={i}
                className="absolute left-14 right-4 border-2 border-dashed border-brand-300 dark:border-brand-800 rounded-xl flex items-center justify-center cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-900/10 transition-colors z-0"
                style={{ top: top + 4, height: height - 8 }}
                onClick={() => {
                  audio.playClick();
                }}
              >
                <div className="flex flex-col items-center opacity-60">
                  <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                    {interval.usableMinutes} min disponíveis
                  </span>
                  <span className="text-[9px] text-text-secondary">
                    (margem deduzida)
                  </span>
                </div>
              </div>
            );
          })}

          {/* Current Time Indicator (AGORA) */}
          {currentTimeStr && (
            <div 
              className="absolute w-full z-20 pointer-events-none transition-all duration-1000 ease-linear"
              style={{ top: timeToOffsetPx(currentTimeStr) }}
            >
              <div className="relative flex items-center pr-4">
                <div className="w-12 flex justify-end pr-2">
                  <div className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                    AGORA
                  </div>
                </div>
                <div className="flex-1 h-[2px] bg-red-500 relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* Floating Action / Recenter Button */}
      {!isCentered && (
        <button 
          onClick={resumeAutoScroll}
          className="absolute bottom-[100px] right-1/2 translate-x-1/2 bg-app-bg text-brand-600 dark:text-brand-400 px-4 py-2.5 rounded-full shadow-lg border border-border-color text-xs font-bold flex items-center gap-2 animate-slide-up z-50 active:scale-95 transition-transform"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          Voltar para AGORA
        </button>
      )}

      {/* Collapsible Tasks Drawer / Active Task UI */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-app-bg z-40 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] border-t border-border-color flex flex-col transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          isActive ? 'h-[85px]' : isDrawerExpanded ? 'h-[50vh]' : 'h-[85px]'
        }`}
        onClick={() => { if (!isActive && !isDrawerExpanded) setIsDrawerExpanded(true); }}
      >
        {isActive && activeTask ? (
          <div className="px-6 py-4 flex items-center justify-between h-full">
            <div className="flex flex-col min-w-0 pr-4">
              <span className="text-[10px] font-bold text-brand-500 dark:text-brand-400 uppercase tracking-wider mb-0.5">
                {isPaused ? 'Foco Pausado' : 'Foco em Andamento'}
              </span>
              <span className="font-bold text-text-primary truncate">
                {activeTask.title}
              </span>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xl font-mono font-bold ${isPaused ? 'text-slate-500 dark:text-slate-400' : 'text-brand-600 dark:text-brand-400'}`}>
                {formatTimeRemaining(timeRemaining)}
              </span>
              
              <div className="flex gap-1.5">
                {isPaused ? (
                  <button onClick={(e) => { e.stopPropagation(); resumeTimer(); }} className="p-2.5 rounded-full bg-brand-500 text-white shadow-md active:scale-95 transition-transform"><Play className="w-4 h-4 fill-current ml-0.5" /></button>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); pauseTimer(); }} className="p-2.5 rounded-full bg-slate-500 dark:bg-slate-600 text-white shadow-md active:scale-95 transition-transform"><Pause className="w-4 h-4 fill-current" /></button>
                )}
                <button onClick={(e) => { e.stopPropagation(); stopTimer(true); }} className="p-2.5 rounded-full bg-red-500 text-white shadow-md active:scale-95 transition-transform"><Square className="w-4 h-4 fill-current" /></button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="w-10 h-1 bg-border-color rounded-full mx-auto my-2 shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsDrawerExpanded(!isDrawerExpanded); }}></div>
            
            <div className="px-6 pb-2 shrink-0 flex items-center justify-between cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsDrawerExpanded(!isDrawerExpanded); }}>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-text-primary">Tarefas disponíveis</h3>
                {!isActive && (
                  <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {tasks.filter(t => t.status === 'pending' && t.estimatedDuration <= availableMinutes).length}
                  </span>
                )}
              </div>
              <button className="p-2 bg-card-bg rounded-full border border-border-color">
                <ChevronUp className={`w-4 h-4 text-text-secondary transition-transform ${isDrawerExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            <div className={`px-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-6 transition-opacity duration-200 ${isDrawerExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <p className="text-xs text-text-secondary mb-4 shrink-0">
                Tempo livre até o próximo evento: <span className="font-bold text-brand-600 dark:text-brand-400">{availableMinutes > 60 ? `${Math.floor(availableMinutes/60)}h${availableMinutes%60 > 0 ? String(availableMinutes%60).padStart(2,'0') : ''}` : `${availableMinutes} min`}</span>
              </p>
              
              <div className="flex flex-col gap-3">
                {tasks
                  .filter(t => t.status === 'pending' && t.estimatedDuration <= availableMinutes)
                  .map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-2xl bg-card-bg border border-border-color shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className={`w-2.5 h-2.5 mt-1.5 rounded-full ${
                        task.size === 'Grande' ? 'bg-red-500' :
                        task.size === 'Média' ? 'bg-blue-500' : 'bg-green-500'
                      }`}></span>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-primary mb-1">{task.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.estimatedDuration} min
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            task.size === 'Grande' ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400' :
                            task.size === 'Média' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' :
                            'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400'
                          }`}>
                            {task.size}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        startTimer(task, task.estimatedDuration);
                        setActiveTab('focus');
                      }}
                      className="w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-500 flex items-center justify-center text-white shadow-md active:scale-95 transition-transform shrink-0"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  </div>
                ))}
                
                {tasks.filter(t => t.status === 'pending' && t.estimatedDuration <= availableMinutes).length === 0 && (
                  <div className="text-center text-sm text-text-secondary py-8">
                    Nenhuma tarefa cabe neste tempo livre.
                  </div>
                )}
              </div>

              <button 
                onClick={() => setActiveTab('tasks')}
                className="mt-4 w-full py-3.5 rounded-2xl border-2 border-dashed border-border-color text-brand-600 dark:text-brand-400 font-bold text-sm hover:bg-card-bg transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                <span>+</span> Ver todas as tarefas
              </button>
            </div>
          </>
        )}
      </div>

      <SmartInputOverlay 
        isOpen={isSmartInputOpen}
        startWithVoice={startWithVoice}
        onClose={() => setIsSmartInputOpen(false)}
      />
    </div>
  );
};
