import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { audio } from '../utils/audio';

export interface SlideToConfirmProps {
  onConfirm: () => void;
  text: string;
  isCritical?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  iconColor?: string;
  threshold?: number; // 0.0 to 1.0 (default 0.75)
}

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  onConfirm,
  text,
  isCritical = false,
  disabled = false,
  className = '',
  style,
  iconColor = isCritical ? 'text-[#DC2626]' : 'text-[#3E12B3]',
  threshold = 0.75,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [maxDrag, setMaxDrag] = useState<number>(240);
  const [isNudging, setIsNudging] = useState<boolean>(false);

  const startXRef = useRef<number>(0);
  const currentDragXRef = useRef<number>(0);
  const activePointerIdRef = useRef<number | null>(null);

  // Measure container and compute max travel distance
  const updateDimensions = useCallback(() => {
    if (!containerRef.current || !thumbRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const thumbWidth = thumbRef.current.clientWidth || 48;
    // Total padding: 8px on left, 8px on right (p-2 = 16px)
    const available = Math.max(60, containerWidth - thumbWidth - 16);
    setMaxDrag(available);
  }, []);

  useEffect(() => {
    updateDimensions();
    const handleResize = () => updateDimensions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateDimensions]);

  // Trigger tactile / haptic feedback
  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([25, 40, 30]);
      }
    } catch (_) {}

    try {
      import('@capacitor/haptics')
        .then(({ Haptics, ImpactStyle }) => {
          Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
        })
        .catch(() => {});
    } catch (_) {}
  };

  // Pointer Down (Mouse click or Touch start)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isCompleted) return;
    
    // Only respond to primary mouse button or touch
    if (e.button !== 0) return;

    activePointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    currentDragXRef.current = dragX;
    setIsDragging(true);
    setIsNudging(false);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Pointer Move (Mouse drag or Touch move)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerIdRef.current !== e.pointerId || isCompleted) return;

    const deltaX = e.clientX - startXRef.current;
    const clamped = Math.max(0, Math.min(maxDrag, deltaX));
    currentDragXRef.current = clamped;
    setDragX(clamped);
  };

  // Pointer Up or Cancel (Release)
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerIdRef.current !== e.pointerId) return;

    setIsDragging(false);
    activePointerIdRef.current = null;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}

    const currentX = currentDragXRef.current;
    const progress = maxDrag > 0 ? currentX / maxDrag : 0;

    if (progress >= threshold) {
      // Completed! Snap all the way to the end
      setDragX(maxDrag);
      setIsCompleted(true);
      audio.playClick();
      triggerHaptic();

      // Trigger completion callback after smooth arrival animation
      setTimeout(() => {
        onConfirm();
      }, 160);
    } else {
      // Released before threshold
      if (currentX <= 6) {
        // User tapped without dragging -> give guidance nudge
        setIsNudging(true);
        audio.playTick();
        setTimeout(() => setIsNudging(false), 500);
      }
      // Spring back to start
      setDragX(0);
      currentDragXRef.current = 0;
    }
  };

  const progress = maxDrag > 0 ? Math.min(1, Math.max(0, dragX / maxDrag)) : 0;
  const isNearEnd = progress >= threshold;

  // Text opacity gently fades as the thumb advances
  const textOpacity = Math.max(0, 1 - progress * 1.45);

  const defaultBackground = isCritical
    ? 'linear-gradient(135deg, #F94A1E 0%, #D81414 100%)'
    : 'linear-gradient(135deg, #4F17C5 0%, #2F0A9E 100%)';

  const defaultShadow = isCritical
    ? '0 14px 34px -4px rgba(220, 38, 38, 0.50)'
    : '0 14px 34px -4px rgba(79, 23, 197, 0.45)';

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label={text}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled || isCompleted) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setDragX(maxDrag);
          setIsCompleted(true);
          audio.playClick();
          triggerHaptic();
          setTimeout(() => onConfirm(), 160);
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-16 sm:h-[66px] rounded-full p-2 flex items-center select-none overflow-hidden touch-none transition-shadow duration-200 cursor-grab ${
        isDragging ? 'cursor-grabbing' : ''
      } ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
      style={{
        background: defaultBackground,
        boxShadow: defaultShadow,
        ...style,
      }}
    >
      {/* Background progress fill trail following the thumb */}
      <div
        className="absolute left-0 top-0 bottom-0 pointer-events-none rounded-full transition-all"
        style={{
          width: `${dragX + 56}px`,
          background: 'rgba(255, 255, 255, 0.16)',
          transition: isDragging ? 'none' : 'width 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      />

      {/* Track Label: Centered with shimmer and fade */}
      <div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none px-14"
        style={{
          opacity: textOpacity,
          transition: isDragging ? 'none' : 'opacity 0.25s ease-out',
        }}
      >
        <span className="font-bold text-white text-[16px] sm:text-[17px] tracking-tight drop-shadow-xs truncate slide-shimmer-text">
          {text}
        </span>
      </div>

      {/* Visual Direction Chevron Hint on right end */}
      <div 
        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none opacity-40 transition-opacity"
        style={{ opacity: Math.max(0, 0.45 - progress) }}
      >
        <ChevronRight className="w-4 h-4 text-white animate-pulse" />
        <ChevronRight className="w-4 h-4 text-white animate-pulse -ml-2" style={{ animationDelay: '150ms' }} />
      </div>

      {/* The Draggable White Thumb Disc */}
      <div
        ref={thumbRef}
        className={`relative z-10 w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md ${
          isNudging ? 'animate-slide-nudge' : ''
        } ${isNearEnd ? 'ring-2 ring-emerald-400' : ''}`}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s',
          boxShadow: isDragging 
            ? '0 8px 24px rgba(0,0,0,0.35)' 
            : '0 3px 10px rgba(0,0,0,0.22)',
        }}
      >
        {isCompleted || isNearEnd ? (
          <Check className="w-5 h-5 stroke-[3] text-emerald-600 animate-scale-in" />
        ) : (
          <ArrowRight className={`w-5 h-5 stroke-[2.75] ${iconColor}`} />
        )}
      </div>
    </div>
  );
};
