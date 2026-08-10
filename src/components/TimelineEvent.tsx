import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { CalendarDays, CheckSquare, Trash2, GripVertical, Check } from 'lucide-react';
import { getLocalDateString } from '../utils/time';
import type { Event } from '../utils/time';
import { audio } from '../utils/audio';

interface TimelineEventProps {
  event: Event;
  initialTop: number;
  height: number;
  hourHeight?: number; // default 80
  onUpdateTimes: (id: string, newStart: string, newEnd: string) => void;
  onDelete: (id: string) => void;
  widthPct?: number; // For overlapping events
  leftPct?: number;
}

const timeStringToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTimeString = (minutes: number): string => {
  // Handle wrapping over midnight for display purposes (though logically it might be day+1)
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  // Handle negative times
  if (h < 0) return `00:00`; // safeguard
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const isPastOrPresent = (eventDate: string, eventStart: string): boolean => {
  const today = getLocalDateString();
  if (eventDate < today) return true;
  if (eventDate > today) return false;
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = timeStringToMinutes(eventStart);
  return currentMins >= startMins;
};

export const TimelineEvent: React.FC<TimelineEventProps> = ({ 
  event, 
  initialTop, 
  height, 
  hourHeight = 80,
  onUpdateTimes,
  onDelete,
  widthPct = 100,
  leftPct = 0
}) => {
  const [isDraggable, setIsDraggable] = useState(false);
  const [currentTop, setCurrentTop] = useState(0); // Offset delta during drag
  const [isCompleted, setIsCompleted] = useState(false);
  const longPressTimer = useRef<any>(null);
  
  const eventDurationMins = timeStringToMinutes(event.end) - timeStringToMinutes(event.start);
  
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only allow left click / main touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    longPressTimer.current = setTimeout(() => {
      audio.playClick();
      setIsDraggable(true);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 500); // 500ms for long press
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerUp = () => {
    cancelLongPress();
  };

  // Click outside to cancel edit mode
  useEffect(() => {
    if (!isDraggable) return;
    const handleClickOutside = () => setIsDraggable(false);
    window.addEventListener('pointerdown', handleClickOutside);
    return () => window.removeEventListener('pointerdown', handleClickOutside);
  }, [isDraggable]);

  const handleDragStart = () => {
    // Optional logic when drag starts
  };

  const handleDrag = (_: any, info: PanInfo) => {
    setCurrentTop(info.offset.y);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDraggable(false);
    
    // Calculate new times
    const offsetPx = info.offset.y;
    // 80px = 60 minutes => 1px = 60/80 = 0.75 minutes
    const offsetMinutes = offsetPx * (60 / hourHeight);
    
    const originalStartMins = timeStringToMinutes(event.start);
    let newStartMins = originalStartMins + offsetMinutes;
    
    // Snap to nearest 5 minutes
    newStartMins = Math.round(newStartMins / 5) * 5;
    
    const newEndMins = newStartMins + eventDurationMins;
    
    const newStartStr = minutesToTimeString(newStartMins);
    const newEndStr = minutesToTimeString(newEndMins);
    
    onUpdateTimes(event.id, newStartStr, newEndStr);
    
    // Reset delta since the new initialTop will be provided by parent re-render
    setCurrentTop(0);
    audio.playChimeDone();
  };

  return (
    <motion.div
      drag={isDraggable ? "y" : false}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerMove={cancelLongPress}
      onClick={(e) => { e.stopPropagation(); }} 
      className={`absolute right-4 rounded-xl flex flex-col justify-center transition-all duration-300 z-20 select-none touch-none px-4 py-3 overflow-hidden
        ${isDraggable ? 'shadow-xl scale-[1.02] cursor-grab active:cursor-grabbing z-30 ring-2 ring-brand-500' : 'shadow-sm cursor-pointer'}
        bg-${event.color || 'brand'}-50/70 dark:bg-${event.color || 'brand'}-950/30
        border-l-[6px] border-${event.color || 'brand'}-400 dark:border-${event.color || 'brand'}-500
        ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}
      `}
      style={{ 
        top: initialTop, 
        height: Math.max(height, 60),
        width: widthPct === 100 ? 'calc(100% - 108px)' : `calc(${widthPct}% - ${108 / (100/widthPct)}px)`,
        left: leftPct === 0 ? '92px' : `calc(92px + ${leftPct}% - ${108 * (leftPct/100)}px)`,
        y: currentTop // framer motion controlled offset
      }}
      layout
    >
      {/* Axis Dot */}
      {leftPct === 0 && (
        <div className={`absolute -left-[24px] top-4 w-[9px] h-[9px] rounded-full bg-${event.color || 'brand'}-400 dark:bg-${event.color || 'brand'}-500 shadow-sm z-0`}></div>
      )}

      <div className="flex items-center justify-between gap-2 h-full">
        <div className="flex flex-col min-w-0 flex-1 justify-center gap-1">
          {height >= 40 && (
            <span className={`text-[11px] font-medium text-${event.color || 'brand'}-600 dark:text-${event.color || 'brand'}-400`}>
              {event.start} – {event.end}
            </span>
          )}
          <span className={`text-[15px] font-semibold text-text-primary truncate transition-all ${isCompleted ? 'line-through text-text-secondary opacity-70' : ''}`}>
            {event.title}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {event.source === 'google' ? (
              <CalendarDays className="w-3.5 h-3.5 text-text-secondary/70" />
            ) : (
              <CheckSquare className="w-3.5 h-3.5 text-text-secondary/70" />
            )}
            <span className="text-[11px] font-medium text-text-secondary/70">
              {event.source === 'google' ? 'Evento' : 'Tarefa'}
            </span>
          </div>
        </div>
        
        {!isDraggable && event.source !== 'google' && (
          <button 
            disabled={!isPastOrPresent(event.date, event.start)}
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsCompleted(!isCompleted);
              audio.playClick();
            }}
            className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ml-2 transition-colors
              ${!isPastOrPresent(event.date, event.start) ? 'opacity-30 cursor-not-allowed border-border-color/50 bg-transparent' : ''}
              ${isCompleted 
                ? `bg-${event.color || 'brand'}-500 border-${event.color || 'brand'}-500` 
                : 'border-border-color/80 bg-app-bg/50 hover:bg-card-bg'
              }`}
          >
             {isCompleted && (
               <Check className="w-4 h-4 text-white" />
             )}
          </button>
        )}
        {!isDraggable && event.source === 'google' && (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-2 bg-${event.color || 'brand'}-100 dark:bg-${event.color || 'brand'}-900/40`}>
             <Check className={`w-4 h-4 text-${event.color || 'brand'}-500`} />
          </div>
        )}
        
        {isDraggable && (
          <div className="flex flex-col items-center justify-between h-full py-1 pr-1 shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event.id);
                setIsDraggable(false);
              }}
              className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors pointer-events-auto"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {height >= 60 && <GripVertical className="w-4 h-4 text-brand-400/50" />}
          </div>
        )}
      </div>
    </motion.div>
  );
};
