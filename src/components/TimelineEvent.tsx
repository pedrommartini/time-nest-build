import React, { useState, useRef, useEffect } from 'react';
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
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Dragging state (Notion-style)
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  
  const isDraggingRef = useRef(false);
  const dragOffsetYRef = useRef(0);
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const longPressTimerRef = useRef<any>(null);
  const dragStartYRef = useRef(0);

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(event.title);
  
  // Resizing state
  const [resizeMode, setResizeMode] = useState<'start' | 'end' | null>(null);
  const [resizeDelta, setResizeDelta] = useState(0);
  const resizeStartYRef = useRef(0);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const isCompleted = !!event.completed;
  
  const eventDurationMins = Math.max(15, timeStringToMinutes(event.end) - timeStringToMinutes(event.start));

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isEditing]);

  // Click outside listener for focus and inline edit cancel
  useEffect(() => {
    const handleClickOutside = () => {
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

  // Native Non-Passive Touch Event Handlers for Flawless Mobile Touch Dragging
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (resizeMode || isEditing) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;

      touchStartPosRef.current = { x: startX, y: startY };

      // Clear any existing timer
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

      // Start 250ms long-press timer
      longPressTimerRef.current = setTimeout(() => {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate(40); } catch (err) {}
        }
        audio.playClick();
        setIsDragging(true);
        isDraggingRef.current = true;
        dragStartYRef.current = startY;
        setIsFocused(true);
      }, 250);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isEditing || resizeMode) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];

      if (!isDraggingRef.current) {
        // Allow up to 25px finger jitter during long-press wait before canceling
        const dist = Math.hypot(
          touch.clientX - touchStartPosRef.current.x,
          touch.clientY - touchStartPosRef.current.y
        );
        if (dist > 25) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      } else {
        // Dragging is active! Prevent browser vertical scroll completely!
        if (e.cancelable) e.preventDefault();
        
        const deltaY = touch.clientY - dragStartYRef.current;
        dragOffsetYRef.current = deltaY;
        setDragOffsetY(deltaY);
      }
    };

    const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      if (isDraggingRef.current) {
        setIsDragging(false);
        isDraggingRef.current = false;

        const deltaY = dragOffsetYRef.current;
        const offsetMinutes = Math.round((deltaY * (60 / hourHeight)) / 5) * 5;
        
        if (offsetMinutes !== 0) {
          const originalStartMins = timeStringToMinutes(event.start);
          let newStartMins = originalStartMins + offsetMinutes;
          if (newStartMins < 0) newStartMins = 0;
          if (newStartMins + eventDurationMins > 24 * 60) newStartMins = 24 * 60 - eventDurationMins;

          const newEndMins = newStartMins + eventDurationMins;
          onUpdateTimes(event.id, minutesToTimeString(newStartMins), minutesToTimeString(newEndMins));
          audio.playChimeDone();
        }
        
        dragOffsetYRef.current = 0;
        setDragOffsetY(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [hourHeight, event, eventDurationMins, isEditing, resizeMode, onUpdateTimes]);

  // Desktop Mouse Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (resizeMode || isEditing) return;

    setIsFocused(true);
    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;

    const handleMouseMove = (me: MouseEvent) => {
      const deltaY = me.clientY - dragStartYRef.current;
      dragOffsetYRef.current = deltaY;
      setDragOffsetY(deltaY);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (isDraggingRef.current) {
        setIsDragging(false);
        isDraggingRef.current = false;

        const deltaY = dragOffsetYRef.current;
        const offsetMinutes = Math.round((deltaY * (60 / hourHeight)) / 5) * 5;
        
        if (offsetMinutes !== 0) {
          const originalStartMins = timeStringToMinutes(event.start);
          let newStartMins = originalStartMins + offsetMinutes;
          if (newStartMins < 0) newStartMins = 0;
          if (newStartMins + eventDurationMins > 24 * 60) newStartMins = 24 * 60 - eventDurationMins;

          const newEndMins = newStartMins + eventDurationMins;
          onUpdateTimes(event.id, minutesToTimeString(newStartMins), minutesToTimeString(newEndMins));
          audio.playChimeDone();
        }
        
        dragOffsetYRef.current = 0;
        setDragOffsetY(0);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Window-level resize listeners
  useEffect(() => {
    if (!resizeMode) return;
    
    const handleMove = (e: PointerEvent) => {
      setResizeDelta(e.clientY - resizeStartYRef.current);
    };
    
    const handleUp = () => {
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

  const computedTop = resizeMode === 'start' 
    ? initialTop + resizeDelta 
    : (isDragging ? initialTop + dragOffsetY : initialTop);
    
  const computedHeight = resizeMode === 'start' 
    ? height - resizeDelta 
    : (resizeMode === 'end' ? height + resizeDelta : height);
    
  const finalHeight = Math.max(computedHeight, 30);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`absolute right-4 rounded-xl flex flex-col justify-center transition-all duration-75 select-none px-4 py-3 outline-none group
        ${!resizeMode && !isEditing ? 'cursor-grab active:cursor-grabbing' : ''}
        ${isFocused && !resizeMode && !isDragging ? 'ring-2 ring-brand-400/50' : ''}
        bg-${event.color || 'brand'}-50/90 dark:bg-${event.color || 'brand'}-950/40
        border-l-[6px] border-${event.color || 'brand'}-400 dark:border-${event.color || 'brand'}-500
        ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}
        ${isDragging ? 'z-50 shadow-2xl scale-[1.03] ring-2 ring-brand-500 opacity-95 cursor-grabbing' : (resizeMode ? 'z-40 shadow-lg opacity-95' : 'z-20 shadow-sm hover:shadow-md')}
      `}
      style={{ 
        top: computedTop, 
        height: finalHeight,
        width: widthPct === 100 ? 'calc(100% - 108px)' : `calc(${widthPct}% - ${108 / (100/widthPct)}px)`,
        left: leftPct === 0 ? '92px' : `calc(92px + ${leftPct}% - ${108 * (leftPct/100)}px)`,
        touchAction: isDragging ? 'none' : 'pan-y'
      }}
    >
      {/* Top Resize Handle */}
      {!isEditing && !isDragging && (
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
              onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking input
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
        
        {!resizeMode && !isDragging && (
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Delete button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(event.id);
              }}
              className="p-1.5 rounded-full bg-red-100/0 text-red-600/0 hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 group-hover:text-red-500/60 group-focus-within:text-red-500/60 transition-all"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Checkmark Toggle */}
            <button 
              disabled={!isPastOrPresent(event.date, event.start)}
              onClick={(e) => { 
                e.stopPropagation(); 
                audio.playClick();
                onUpdate(event.id, { completed: !isCompleted });
              }}
              className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors
                ${!isPastOrPresent(event.date, event.start) ? 'opacity-40 cursor-not-allowed border-border-color/50 bg-transparent' : 'cursor-pointer'}
                ${isCompleted 
                  ? `bg-${event.color || 'brand'}-500 border-${event.color || 'brand'}-500` 
                  : 'border-border-color/80 bg-app-bg/50 hover:bg-card-bg'
                }`}
              title={isCompleted ? "Marcar como pendente" : "Marcar como concluído"}
            >
              {isCompleted && <Check className="w-4 h-4 text-white" />}
            </button>
          </div>
        )}
      </div>

      {/* Bottom Resize Handle */}
      {!isEditing && !isDragging && (
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
    </div>
  );
};
