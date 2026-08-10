import React, { useRef, useEffect, useState } from 'react';
import { audio } from '../utils/audio';

export interface WheelOption {
  value: string | number;
  label: string | React.ReactNode;
}

interface WheelPickerProps {
  options: WheelOption[];
  value: string | number;
  onChange: (val: string | number) => void;
  itemHeight?: number; // Height of each item in pixels
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ options, value, onChange, itemHeight = 60 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTickIndexRef = useRef<number>(-1);

  // Find index of current value
  const currentIndex = Math.max(0, options.findIndex(opt => opt.value === value));

  useEffect(() => {
    lastTickIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    // Initial scroll to the selected item
    if (containerRef.current && !isScrolling) {
      containerRef.current.scrollTop = currentIndex * itemHeight;
    }
  }, [currentIndex, isScrolling, itemHeight]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    setIsScrolling(true);
    
    // Calculate which item is centered
    const scrollTop = e.currentTarget.scrollTop;
    const centerIndex = Math.round(scrollTop / itemHeight);
    const safeIndex = Math.max(0, Math.min(options.length - 1, centerIndex));

    if (lastTickIndexRef.current !== safeIndex) {
      audio.playTick();
      lastTickIndexRef.current = safeIndex;
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      
      if (options[safeIndex].value !== value) {
        onChange(options[safeIndex].value);
      }
    }, 100); // Faster delay to detect scroll end
  };

  return (
    <div className="relative w-full overflow-hidden" style={{ height: itemHeight * 9 }}>
      {/* Selection Highlight (Center) */}
      <div 
        className="absolute w-full bg-brand-500/10 dark:bg-brand-500/20 rounded-2xl pointer-events-none"
        style={{
          height: itemHeight,
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
      
      {/* Scrollable Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto hide-scrollbar snap-y snap-mandatory relative"
        style={{ scrollBehavior: isScrolling ? 'auto' : 'smooth' }}
      >
        {/* Padding items to allow snapping the first and last to the center */}
        <div style={{ height: itemHeight * 4 }} className="snap-start" />
        
        {options.map((opt, idx) => {
          const distance = Math.abs(idx - currentIndex);
          let opacityClass = 'opacity-0';
          let scaleClass = 'scale-75';
          
          if (distance === 0) {
            opacityClass = 'opacity-100 text-3xl text-brand-600 dark:text-brand-400 font-black';
            scaleClass = 'scale-110';
          } else if (distance === 1) {
            opacityClass = 'opacity-40 text-2xl text-text-secondary font-bold';
            scaleClass = 'scale-95';
          } else if (distance === 2) {
            opacityClass = 'opacity-15 text-xl text-text-secondary font-medium';
            scaleClass = 'scale-90';
          } else if (distance === 3) {
            opacityClass = 'opacity-5 text-lg text-text-secondary/50 font-normal';
            scaleClass = 'scale-75';
          }

          return (
            <div 
              key={opt.value}
              className={`flex items-center justify-center snap-center transition-all duration-75 select-none ${opacityClass} ${scaleClass}`}
              style={{ height: itemHeight }}
            >
              {opt.label}
            </div>
          );
        })}
        
        <div style={{ height: itemHeight * 4 }} className="snap-end" />
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};
