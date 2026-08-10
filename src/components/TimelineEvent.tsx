import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckSquare, Trash2, Check } from 'lucide-react';
import { getLocalDateString } from '../utils/time';
import type { Event } from '../utils/time';
import { audio } from '../utils/audio';

interface TimelineEventProps {
  event: Event;
  initialTop: number;
  height: number;
  hourHeight?: number; // default 80
  onUpdateTimes: (id: string, newStart: string, newEnd: string) => void;
  onUpdate: (id: string, updates: Partial<Event>) => void;
  onDelete: (id: string) => void;
  widthPct?: number; // For overlapping events
  leftPct?: number;
}

const timeStringToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTimeString = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  if (h < 0) return `00:00`;
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
  onUpdate,
  onDelete,
  widthPct = 100,
  leftPct = 0
}) => {
  const [currentTop, setCurrentTop] = useState(0); 
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);
  
  // Resizing state
  const [resizeMode, setResizeMode] = useState<'start' | 'end' | null>(null);
  const [resizeDelta, setResizeDelta] = useState(0);
  const resizeStartYRef = useRef(0);

  const titleInputRef = useRef<HTMLInputElement>(null);
  
  const eventDurationMins = timeStringToMinutes(event.end) - timeStringToMinutes(event.start);
  
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: PointerEvent) => {
      setIsFocused(false);
      if (isEditing) {
        setIsEditing(false);
        if (editTitle.trim() !== event.title) {
          onUpdate(event.id, { title: editTitle.trim() || 'Sem Título' });
        }
      }
    };
    if (isFocused || isEditing) {
      window.addEventListener('pointerdown', handleClickOutside);
      return () => window.removeEventListener('pointerdown', handleClickOutside);
    }
  }, [isFocused, isEditing, editTitle, event.title, event.id, onUpdate]);

  // Window-level resize listeners for robustness
  useEffect(() => {
    if (!resizeMode) return;
    
    const handleMove = (e: PointerEvent) => {
      setResizeDelta(e.clientY - resizeStartYRef.current);
    };
    
    const handleUp = (e: PointerEvent) => {
      const offsetMinutes = resizeDelta * (60 / hourHeight);
      let originalStartMins = timeStringToMinutes(event.start);
      let originalEndMins = timeStringToMinutes(event.end);
      
      if (resizeMode === 'start') {
         let newStartMins = Math.round((originalStartMins + offsetMinutes) / 5) * 5;
         if (newStartMins >= originalEndMins - 5) newStartMins = originalEndMins - 15;
         onUpdateTimes(event.id, minutesToTimeString(newStartMins), event.end);
      } else {
         let newEndMins = Math.round((originalEndMins + offsetMinutes) / 5) * 5;
         if (newEndMins <= originalStartMins + 5) newEndMins = originalStartMins + 15;
         onUpdateTimes(event.id, event.start, minutesToTimeString(newEndMins));
      }
      
      setResizeMode(null);
      setResizeDelta(0);
      audio.playChimeDone();
    };
    
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [resizeMode, resizeDelta, event, hourHeight, onUpdateTimes]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditTitle(event.title);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (!isEditing) {
        onDelete(event.id);
      }
    }
    if (e.key === 'Enter' && isEditing) {
      setIsEditing(false);
      if (editTitle.trim() !== event.title) {
        onUpdate(event.id, { title: editTitle.trim() || 'Sem Título' });
      }
    }
  };

  const computedTop = resizeMode === 'start' ? initialTop + resizeDelta : initialTop;
  const computedHeight = resizeMode === 'start' ? height - resizeDelta : (resizeMode === 'end' ? height + resizeDelta : height);
  const finalHeight = Math.max(computedHeight, 30);

  return (
    <motion.div
      drag={!resizeMode && !isEditing ? "y" : false}
      dragMomentum={false}
      onDragStart={() => setIsFocused(false)}
      onDrag={(_e, info) => setCurrentTop(info.offset.y)}
      onDragEnd={(_e, info) => {
        const offsetPx = info.offset.y;
        const offsetMinutes = offsetPx * (60 / hourHeight);
        
        const originalStartMins = timeStringToMinutes(event.start);
        let newStartMins = originalStartMins + offsetMinutes;
        
        newStartMins = Math.round(newStartMins / 5) * 5;
        const newEndMins = newStartMins + eventDurationMins;
        
        const newStartStr = minutesToTimeString(newStartMins);
        const newEndStr = minutesToTimeString(newEndMins);
        
        onUpdateTimes(event.id, newStartStr, newEndStr);
        setCurrentTop(0);
        audio.playChimeDone();
      }}
      whileDrag={{ 
        scale: 1.02, 
        zIndex: 30, 
        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 0 0 2px var(--color-brand-500)",
        cursor: "grabbing"
      }}
      onPointerDown={(e) => { 
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        setIsFocused(true); 
      }}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`absolute right-4 rounded-xl flex flex-col justify-center transition-all duration-150 z-20 select-none touch-none px-4 py-3 outline-none group
        ${!resizeMode && !isEditing ? 'cursor-grab shadow-sm hover:shadow-md' : ''}
        ${isFocused && !resizeMode ? 'ring-2 ring-brand-400/50' : ''}
        bg-${event.color || 'brand'}-50/70 dark:bg-${event.color || 'brand'}-950/30
        border-l-[6px] border-${event.color || 'brand'}-400 dark:border-${event.color || 'brand'}-500
        ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}
        ${resizeMode ? 'z-40 shadow-lg opacity-95' : ''}
      `}
      style={{ 
        top: computedTop, 
        height: finalHeight,
        width: widthPct === 100 ? 'calc(100% - 108px)' : `calc(${widthPct}% - ${108 / (100/widthPct)}px)`,
        left: leftPct === 0 ? '92px' : `calc(92px + ${leftPct}% - ${108 * (leftPct/100)}px)`,
        y: currentTop 
      }}
      layout={!resizeMode}
    >
      {/* Top Resize Handle */}
      {!isEditing && (
        <div 
          className="absolute -top-2 left-0 right-0 h-6 cursor-ns-resize z-50 flex items-start justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onPointerDown={(e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            e.stopPropagation();
            setResizeMode('start');
            resizeStartYRef.current = e.clientY;
          }}
        >
           <div className="w-12 h-1.5 mt-2 rounded-full bg-brand-400/80 shadow-sm" />
        </div>
      )}

      {/* Axis Dot */}
      {leftPct === 0 && (
        <div className={`absolute -left-[24px] top-4 w-[9px] h-[9px] rounded-full bg-${event.color || 'brand'}-400 dark:bg-${event.color || 'brand'}-500 shadow-sm z-0`}></div>
      )}

      <div className="flex items-center justify-between gap-2 h-full pointer-events-none">
        <div className="flex flex-col min-w-0 flex-1 justify-center gap-1 pointer-events-auto">
          {finalHeight >= 40 && (
            <span className={`text-[11px] font-medium text-${event.color || 'brand'}-600 dark:text-${event.color || 'brand'}-400`}>
              {event.start} – {event.end}
            </span>
          )}
          
          {isEditing ? (
            <input 
              ref={titleInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking input
              className="text-[15px] font-semibold text-text-primary bg-white/50 dark:bg-black/20 px-1 py-0.5 rounded outline-none ring-1 ring-brand-500/50 w-full"
            />
          ) : (
            <span className={`text-[15px] font-semibold text-text-primary truncate transition-all ${isCompleted ? 'line-through text-text-secondary opacity-70' : ''}`}>
              {event.title}
            </span>
          )}
          
          {finalHeight >= 60 && (
            <div className="flex items-center gap-1.5 mt-0.5">
              {event.source === 'google' ? (
                <CalendarDays className="w-3.5 h-3.5 text-text-secondary/70" />
              ) : (
                <CheckSquare className="w-3.5 h-3.5 text-text-secondary/70" />
              )}
              <span className="text-[11px] font-medium text-text-secondary/70">
                {event.source === 'google' ? 'Google Agenda' : 'Tarefa Local'}
              </span>
            </div>
          )}
        </div>
        
        {!resizeMode && (
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Delete button appears on hover/focus */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event.id);
              }}
              className="p-1.5 rounded-full bg-red-100/0 text-red-600/0 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 group-hover:text-red-500/60 group-focus-within:text-red-500/60 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {event.source !== 'google' && (
              <button 
                disabled={!isPastOrPresent(event.date, event.start)}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setIsCompleted(!isCompleted);
                  audio.playClick();
                }}
                className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors
                  ${!isPastOrPresent(event.date, event.start) ? 'opacity-30 cursor-not-allowed border-border-color/50 bg-transparent' : ''}
                  ${isCompleted 
                    ? `bg-${event.color || 'brand'}-500 border-${event.color || 'brand'}-500` 
                    : 'border-border-color/80 bg-app-bg/50 hover:bg-card-bg'
                  }`}
              >
                {isCompleted && <Check className="w-4 h-4 text-white" />}
              </button>
            )}
            
            {event.source === 'google' && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-${event.color || 'brand'}-100 dark:bg-${event.color || 'brand'}-900/40`}>
                <Check className={`w-4 h-4 text-${event.color || 'brand'}-500`} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Resize Handle */}
      {!isEditing && (
        <div 
          className="absolute -bottom-2 left-0 right-0 h-6 cursor-ns-resize z-50 flex items-end justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onPointerDown={(e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            e.stopPropagation();
            setResizeMode('end');
            resizeStartYRef.current = e.clientY;
          }}
        >
           <div className="w-12 h-1.5 mb-2 rounded-full bg-brand-400/80 shadow-sm" />
        </div>
      )}
    </motion.div>
  );
};
