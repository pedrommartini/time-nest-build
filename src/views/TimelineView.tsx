// Timeline View - Core Screen for TimeNest

import React, { useEffect, useRef, useState } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { useTasks } from '../contexts/TasksContext';
import { useFocus } from '../contexts/FocusContext';
import { useNavigation } from '../contexts/NavigationContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useProfile } from '../contexts/ProfileContext';
import { Play, Search, Mic, CalendarDays, ChevronUp, Clock, Moon, Sparkles, Sunrise, Battery, BatteryMedium, BatteryFull } from 'lucide-react';
import { audio } from '../utils/audio';
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
  const { isActive, startTimer } = useFocus();
  const { setActiveTab, openSmartInput } = useNavigation();
  const { isTestEnvironment, sleepStart, sleepEnd } = usePreferences();
  const { energyLevel } = useProfile();
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [availableMinutes, setAvailableMinutes] = useState(0);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isCentered, setIsCentered] = useState(true);
  const [visibleRange, setVisibleRange] = useState({ start: 8750, end: 8790 });
  
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef<any>(null);

  const availableTasksCount = tasks.filter(t => t.status === 'pending' && t.estimatedDuration <= availableMinutes).length;
  const hasTasks = availableTasksCount > 0;

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


  return (
    <div className="relative h-full flex flex-col bg-app-bg overflow-hidden animate-fade-in">
      
      {/* Floating Top Header (No background strip) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-[290px] flex items-center gap-2 pointer-events-none">
        {/* Floating Search & Quick Input Pill */}
        <div 
          onClick={() => { openSmartInput(false); }}
          className="flex-1 h-10 bg-white/95 dark:bg-card-bg/95 backdrop-blur-md border border-gray-200/80 dark:border-border-color hover:border-brand-500/40 rounded-full px-3.5 flex items-center justify-between cursor-pointer transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] group pointer-events-auto"
        >
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Search className="w-4 h-4 text-text-secondary group-hover:text-brand-500 transition-colors shrink-0" />
            <span className="text-[13px] text-text-secondary truncate font-medium">
              Adicionar tarefa ou evento...
            </span>
          </div>
          
          <button 
            type="button" 
            onClick={(e) => { 
              e.stopPropagation(); 
              audio.playClick();
              openSmartInput(true); 
            }} 
            className="w-7 h-7 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-full flex items-center justify-center transition-all shadow-sm shrink-0"
            title="Entrada por Voz"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        </div>

        {!isTestEnvironment && (
          <button 
            onClick={() => audio.playClick()}
            className="w-10 h-10 rounded-full border border-gray-200/80 dark:border-border-color bg-white/95 dark:bg-card-bg/95 backdrop-blur-md hover:bg-app-bg text-text-secondary hover:text-text-primary flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] shrink-0 active:scale-95 pointer-events-auto"
          >
            <CalendarDays className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar relative pt-16 pb-32"
      >
        <div className="relative w-full" style={{ height: '1403520px' }}>
          
          {/* Vertical Axis Line */}
          <div className="absolute top-0 bottom-0 left-[72px] w-[1px] bg-border-color/60 z-0"></div>

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

            const hourOffsetPx = absoluteHour * 80;
            const currentOffsetPx = currentTimeStr ? timeToOffsetPx(currentTimeStr) : -9999;
            const distance = Math.abs(hourOffsetPx - currentOffsetPx);
            
            const FADE_START = 35;
            const HIDE_AT = 22;
            let labelScale = 1;
            let labelOpacity = 1;
            
            if (distance <= HIDE_AT) {
              labelScale = 0;
              labelOpacity = 0;
            } else if (distance < FADE_START) {
              const ratio = (distance - HIDE_AT) / (FADE_START - HIDE_AT);
              labelScale = ratio;
              labelOpacity = Math.max(0, ratio - 0.2); 
            }

            return (
              <div key={absoluteHour} className="absolute w-full flex items-center" style={{ top: hourOffsetPx - 8 }}>
                <span 
                  className={`text-[12px] w-[64px] text-right pr-3 transition-all duration-1000 ease-linear origin-right ${
                    isMidnightInSleep ? 'text-sky-600 dark:text-sky-400 font-bold' :
                    isMidnight ? 'text-brand-500 dark:text-brand-400 font-bold' : 
                    'text-text-secondary font-medium'
                  }`}
                  style={{
                    opacity: labelOpacity,
                    transform: `scale(${labelScale})`
                  }}
                >
                  {String(displayHour).padStart(2, '0')}:00
                </span>
                
                {/* Axis Dot */}
                <div className={`absolute left-[70px] w-[5px] h-[5px] rounded-full z-0 ${isMidnight ? 'bg-brand-500' : 'bg-border-color'}`}></div>

                {isMidnight && (
                  <div className="absolute left-[92px] right-4 flex justify-center items-center z-10">
                    <div className="absolute w-full h-[1px] bg-border-color/60 -z-10"></div>
                    <span className={`relative px-4 py-1 text-[11px] uppercase tracking-widest font-bold shadow-sm rounded-full border ${
                      isMidnightInSleep 
                        ? 'bg-sky-100/90 dark:bg-sky-950/90 text-sky-700 dark:text-sky-300 border-sky-300/80 dark:border-sky-800/80'
                        : 'bg-app-bg text-brand-600 dark:text-brand-400 border-border-color/80'
                    }`}>
                      {dayLabel}
                    </span>
                  </div>
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
                className="absolute left-[92px] right-4 rounded-2xl border-2 border-dashed p-3.5 flex items-start justify-between bg-sky-100/40 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 pointer-events-none z-0 shadow-xs"
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

          {/* Morning Energy Card (Today only) */}
          {(() => {
            const currentHour = new Date().getHours();
            const currentMin = new Date().getMinutes();
            const currentTotal = currentHour * 60 + currentMin;
            const endMins = parseInt(sleepEnd.split(':')[0]) * 60 + parseInt(sleepEnd.split(':')[1]);
            
            // Show only if it's past wake up time and before noon, or if testing
            if (isTestEnvironment || (currentTotal >= endMins && currentTotal <= 12 * 60)) {
              const topPx = timeToOffsetPx(sleepEnd) + (0) * 24 * 80 + 20; // 0 = today, slightly below wake up
              
              let BatteryIcon = BatteryMedium;
              let energyColor = 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
              let suggestion = 'Faça tarefas moderadas. Não se esgote.';
              if (energyLevel === 'Baixa') {
                BatteryIcon = Battery;
                energyColor = 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
                suggestion = 'Foque apenas no essencial. Descanse um pouco.';
              } else if (energyLevel === 'Alta') {
                BatteryIcon = BatteryFull;
                energyColor = 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
                suggestion = 'Ótimo momento para focar nas tarefas mais difíceis!';
              }

              return (
                <div 
                  className={`absolute left-[92px] right-4 rounded-2xl border p-4 flex flex-col gap-2 shadow-sm z-0 ${energyColor}`}
                  style={{ top: topPx }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
                      <Sunrise className="w-4 h-4" />
                      Bom dia!
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20">
                      <BatteryIcon className="w-3 h-3" />
                      Energia {energyLevel}
                    </div>
                  </div>
                  <p className="text-[11px] font-medium leading-relaxed opacity-90">
                    {suggestion}
                  </p>
                </div>
              );
            }
            return null;
          })()}

          {/* Events */}
          {(() => {
            const placedEvents: any[] = [];
            
            events.forEach(event => {
              const daysDiff = getDaysDifference(event.date);
              const top = timeToOffsetPx(event.start) + (daysDiff * 24 * 80);
              const bottom = timeToOffsetPx(event.end) + (daysDiff * 24 * 80);
              const height = Math.max(bottom - top, 20);
              
              const overlapping = placedEvents.filter(p => p.daysDiff === daysDiff && p.top < bottom && p.bottom > top);

              placedEvents.push({
                event,
                daysDiff,
                top,
                bottom,
                height,
                column: overlapping.length,
                totalColumns: overlapping.length + 1
              });
              
              if (overlapping.length > 0) {
                 const maxCols = overlapping.length + 1;
                 overlapping.forEach(p => p.totalColumns = Math.max(p.totalColumns, maxCols));
                 placedEvents[placedEvents.length-1].totalColumns = maxCols;
              }
            });

            return placedEvents.map(({ event, top, height, column, totalColumns }) => {
              const widthPct = 100 / totalColumns;
              const leftPct = column * widthPct;
              
              return (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  initialTop={top}
                  height={height}
                  hourHeight={80}
                  onUpdateTimes={updateEventTimes}
                  onDelete={deleteEvent}
                  widthPct={widthPct}
                  leftPct={leftPct}
                />
              );
            });
          })()}

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
                className="absolute left-[92px] right-4 border border-dashed border-brand-300/60 dark:border-brand-700/60 bg-brand-50/30 dark:bg-brand-900/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-brand-50/50 dark:hover:bg-brand-900/20 transition-colors z-0"
                style={{ top: top + 4, height: height - 8 }}
                onClick={() => {
                  audio.playClick();
                }}
              >
                <div className="flex flex-col items-center justify-center">
                  <Sparkles className="w-4 h-4 text-brand-400 mb-1.5" />
                  <span className="font-handwritten text-[17px] text-slate-700 dark:text-slate-300 tracking-wide leading-tight">
                    Tempo livre
                  </span>
                  <span className="font-handwritten text-[15px] text-slate-600 dark:text-slate-400 tracking-wide">
                    {interval.usableMinutes > 60 ? `${Math.floor(interval.usableMinutes/60)}h${interval.usableMinutes%60 > 0 ? String(interval.usableMinutes%60).padStart(2,'0') : ''}` : `${interval.usableMinutes}m`} disponíveis
                  </span>
                </div>
              </div>
            );
          })}

          {/* Current Time Indicator (AGORA) */}
          {currentTimeStr && (
            <div 
              className="absolute w-full z-20 pointer-events-none transition-all duration-1000 ease-linear"
              style={{ top: timeToOffsetPx(currentTimeStr) - 20 }}
            >
              <div className="relative flex items-center pl-1">
                <div className="w-[66px] h-[40px] flex flex-col items-center justify-center bg-red-50/70 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 rounded-[14px] z-10 relative shadow-[0_2px_10px_rgba(239,68,68,0.1)]">
                  <span className="text-[9px] font-black uppercase tracking-wider text-red-500 dark:text-red-400 mb-0.5">AGORA</span>
                  <span className="text-sm font-black text-red-500 dark:text-red-400 leading-none">{currentTimeStr}</span>
                </div>
                <div className="flex-1 h-[2px] bg-red-500/80 dark:bg-red-500/60 relative mr-4 z-0 ml-1"></div>
                <div className="absolute left-[71px] top-1/2 -translate-y-1/2 z-20 flex items-center justify-center -translate-x-1/2">
                  <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-red-400/30 opacity-75"></span>
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] z-20"></div>
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
          style={{ bottom: isDrawerExpanded ? (hasTasks ? '406px' : '306px') : '176px' }}
          className="absolute right-1/2 translate-x-1/2 bg-app-bg text-brand-600 dark:text-brand-400 px-4 py-2.5 rounded-full shadow-lg border border-border-color text-[11px] font-bold flex items-center gap-2 animate-slide-up z-50 active:scale-95 transition-transform transition-[bottom] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
          </span>
          Voltar para AGORA
        </button>
      )}

      {/* Collapsible Tasks Drawer */}
      {!isActive && (
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-card-bg z-40 rounded-t-[44px] shadow-[0_-8px_30px_rgba(40,30,70,0.06)] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            isDrawerExpanded ? (hasTasks ? 'h-[390px]' : 'h-[290px]') : 'h-[160px]'
          }`}
          onClick={() => { if (!isDrawerExpanded) setIsDrawerExpanded(true); }}
        >
          <>
            <div className="w-[56px] h-[5px] bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-2 shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsDrawerExpanded(!isDrawerExpanded); }}></div>
            
            <div className="px-6 pb-2 pt-1 shrink-0 flex items-center justify-between cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsDrawerExpanded(!isDrawerExpanded); }}>
              <div className="flex items-center gap-2">
                <h3 className="text-[19px] font-bold text-gray-900 dark:text-gray-100 tracking-tight">Tarefas disponíveis</h3>
                {!isActive && (
                  <span className="w-6 h-6 rounded-full bg-[#7C3AED] text-white text-[12px] font-bold flex items-center justify-center shadow-sm ml-0.5">
                    {tasks.filter(t => t.status === 'pending' && t.estimatedDuration <= availableMinutes).length}
                  </span>
                )}
              </div>
              <ChevronUp className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isDrawerExpanded ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`px-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col transition-opacity duration-200 ${
              isDrawerExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } ${hasTasks ? 'pb-[95px]' : 'pb-4'}`}>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-3 shrink-0 font-medium">
                Escolha o que você quer fazer no seu tempo livre
              </p>
              
              <div className="flex flex-col border border-gray-100 dark:border-gray-800 rounded-[28px] overflow-hidden bg-white dark:bg-card-bg shadow-sm">
                {tasks
                  .filter(t => t.status === 'pending' && t.estimatedDuration <= availableMinutes)
                  .map((task, index) => (
                  <div key={task.id} className={`flex items-center justify-between py-3.5 px-4 ${index > 0 ? 'border-t border-gray-100 dark:border-gray-800/60' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        ['bg-[#22C55E]', 'bg-[#EAB308]', 'bg-[#3B82F6]', 'bg-[#8B5CF6]', 'bg-[#F97316]'][index % 5]
                      }`} />
                      
                      <div className="flex flex-col">
                        <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 mb-0.5">{task.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-gray-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {task.estimatedDuration} min
                          </span>
                          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            task.size === 'Média' ? 'bg-[#F3E8FF] text-[#7E22CE] dark:bg-brand-950/40 dark:text-brand-300' :
                            task.size === 'Grande' ? 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-red-950/40 dark:text-red-300' :
                            'bg-[#DCFCE7] text-[#15803D] dark:bg-green-950/40 dark:text-green-300'
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
                      className="w-9 h-9 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                    >
                      <Play className="w-4 h-4 text-[#7C3AED] fill-[#7C3AED] ml-0.5" />
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
                className="mt-4 w-full py-2 text-[#7C3AED] dark:text-brand-400 font-semibold text-[14px] hover:opacity-80 transition-opacity flex items-center justify-center gap-1.5 shrink-0"
              >
                <span className="text-[18px] font-normal">+</span> Ver todas as tarefas
              </button>
            </div>
          </>
        </div>
      )}
    </div>
  );
};
