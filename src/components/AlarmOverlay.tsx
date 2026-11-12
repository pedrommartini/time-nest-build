import React, { useState, useEffect, useRef } from 'react';
import { useAlarmManager } from '../contexts/AlarmManagerContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useBackHandler } from '../contexts/NavigationContext';
import { AlarmVisualDisplay } from './AlarmVisualDisplay';

export const AlarmOverlay: React.FC = () => {
  const { 
    activeAlarm, 
    dismissAlarm, 
    snoozeAlarm, 
    handleDifficulty, 
    executePrimaryAction 
  } = useAlarmManager();
  const { theme, isLowStimulation } = usePreferences();
  
  const [screen, setScreen] = useState<'main' | 'snooze' | 'difficulty'>('main');
  const wakeLockRef = useRef<any>(null);

  // Reset to 'main' screen whenever a new alarm becomes active
  useEffect(() => {
    if (activeAlarm) {
      setScreen('main');
    }
  }, [activeAlarm?.id]);

  // Screen WakeLock management: maintain active display & re-request on visibility change
  useEffect(() => {
    if (!activeAlarm) return;

    const requestWakeLock = async () => {
      try {
        if (typeof navigator !== 'undefined' && 'wakeLock' in navigator && document.visibilityState === 'visible') {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Silently catch wakeLock denials or unsupported contexts
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [activeAlarm]);

  // Keyboard Escape Handler (Hierarchy: snooze/difficulty -> main -> dismiss)
  useEffect(() => {
    if (!activeAlarm) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();

        if (screen !== 'main') {
          setScreen('main');
        } else {
          dismissAlarm();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [activeAlarm, screen, dismissAlarm]);

  // Return to main alarm screen if on snooze/difficulty (Priority 60)
  useBackHandler(() => {
    setScreen('main');
    return true;
  }, !!activeAlarm && screen !== 'main', 60);

  // Dismiss alarm if at main alarm screen (Priority 50)
  useBackHandler(() => {
    dismissAlarm();
    return true;
  }, !!activeAlarm && screen === 'main', 50);

  if (!activeAlarm) return null;

  return (
    <AlarmVisualDisplay
      alarm={activeAlarm}
      theme={theme === 'dark' ? 'dark' : 'light'}
      isLowStimulation={isLowStimulation}
      screen={screen}
      onScreenChange={setScreen}
      onPrimaryAction={executePrimaryAction}
      onSnooze={snoozeAlarm}
      onDifficulty={handleDifficulty}
      onDismiss={dismissAlarm}
      containerMode="fullscreen"
      interactive={true}
    />
  );
};
