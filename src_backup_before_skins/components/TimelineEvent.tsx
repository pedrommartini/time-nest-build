import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { Trash2, GripVertical } from 'lucide-react';
import type { Event } from '../utils/time';
import { audio } from '../utils/audio';

interface TimelineEventProps {
  event: Event;
  initialTop: number;
  height: number;
  hourHeight?: number; // default 80
  onUpdateTimes: (id: string, newStart: string, newEnd: string) => void;
  onDelete: (id: string) => void;
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

export const TimelineEvent: React.FC<TimelineEventProps> = ({ 
  event, 
  initialTop, 
  height, 
  hourHeight = 80,
  onUpdateTimes,
  onDelete
}) => {
  const [isDraggable, setIsDraggable] = useState(false);
  const [currentTop, setCurrentTop] = useState(0); // Offset delta during drag
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
      className={`absolute left-14 right-4 rounded-xl border p-2 flex flex-col justify-center transition-shadow z-20 select-none touch-none
        ${isDraggable ? 'shadow-xl scale-[1.02] cursor-grab active:cursor-grabbing z-30 ring-2 ring-brand-500' : 'shadow-sm cursor-pointer'}
        bg-${event.color || 'brand'}-50 dark:bg-${event.color || 'brand'}-950/30
        border-${event.color || 'brand'}-200 dark:border-${event.color || 'brand'}-900/50
      `}
      style={{ 
        top: initialTop, 
        height: Math.max(height, 20),
        y: currentTop // framer motion controlled offset
      }}
      layout
    >
      <div className="flex items-start justify-between gap-2 h-full">
        <div className="flex flex-col min-w-0 flex-1 justify-center">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full shrink-0 bg-${event.color || 'brand'}-500`}></span>
            <span className={`text-xs font-semibold text-${event.color || 'brand'}-900 dark:text-${event.color || 'brand'}-300 truncate`}>
              {event.title}
            </span>
          </div>
          {height >= 40 && (
            <span className={`text-[10px] text-${event.color || 'brand'}-600 dark:text-${event.color || 'brand'}-500 ml-3.5 mt-0.5`}>
              {event.start} - {event.end} {event.source === 'google' && '(GCal)'}
            </span>
          )}
        </div>
        
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
