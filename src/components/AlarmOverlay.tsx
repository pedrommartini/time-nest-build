import React, { useEffect, useState } from 'react';
import { useAlarmManager } from '../contexts/AlarmManagerContext';
import { useBackHandler } from '../contexts/NavigationContext';
import { audio } from '../utils/audio';
import { Capacitor } from '@capacitor/core';

// Native vibration using Capacitor Haptics (stronger than navigator.vibrate on Android WebView)
const nativeVibrate = async (pattern: 'normal' | 'critical' | 'task') => {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      if (pattern === 'critical') {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 150);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 300);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 450);
      } else {
        await Haptics.impact({ style: ImpactStyle.Medium });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 200);
      }
    }
  } catch (e) {
    // Fallback to Web Vibration API
  }
  // Also trigger Web Vibration API as fallback
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (pattern === 'critical') {
      navigator.vibrate([400, 100, 400, 100, 400, 100, 400]);
    } else if (pattern === 'task') {
      navigator.vibrate([300, 100, 300]);
    } else {
      navigator.vibrate([250, 100, 250, 100, 250]);
    }
  }
};

export const AlarmOverlay: React.FC = () => {
  const { activeAlarm, dismissAlarm } = useAlarmManager();
  const [screen, setScreen] = useState<'main' | 'snooze' | 'difficulty'>('main');
  
  // Return to main alarm screen if on snooze/difficulty
  useBackHandler(() => {
    setScreen('main');
    return true;
  }, !!activeAlarm && screen !== 'main', 60);

  // Dismiss alarm if at main alarm screen
  useBackHandler(() => {
    dismissAlarm();
    return true;
  }, !!activeAlarm && screen === 'main', 50);

  useEffect(() => {
    if (activeAlarm) {
      setScreen('main'); // Reset screen when new alarm comes in
      
      // Start audio and haptics
      const isCritical = activeAlarm.intent === 'critical';
      const isTask = activeAlarm.intent === 'task-now';
      
      const pattern = isCritical ? 'critical' : (isTask ? 'task' : 'normal');
      
      // Vibrate immediately with native Haptics
      nativeVibrate(pattern);
      
      // Repeat vibration every 4s
      const vibInterval = setInterval(() => nativeVibrate(pattern), 4000);
      
      // Audio
      let audioInterval: any;
      if (activeAlarm.sound === 'chime') {
         audio.playChimeDone();
         audioInterval = setInterval(() => audio.playChimeDone(), isCritical ? 2000 : 4000);
      } else {
         audio.playAmbient(activeAlarm.sound, isCritical ? 0.8 : 0.5);
      }
      
      return () => {
        clearInterval(vibInterval);
        if (audioInterval) clearInterval(audioInterval);
        audio.stopAmbient();
      };
    }
  }, [activeAlarm]);

  if (!activeAlarm) return null;

  const handleDismiss = () => {
    audio.playClick();
    audio.stopAmbient();
    dismissAlarm();
  };

  const handleSnoozeOption = (_mins: number | 'task') => {
    audio.playClick();
    audio.stopAmbient();
    // In a real app, this would schedule a new alarm. For now we just dismiss.
    dismissAlarm();
  };

  const handleDifficultyOption = (_reason: string) => {
    audio.playClick();
    audio.stopAmbient();
    // In a real app, this would trigger specific flows. For now we just dismiss.
    dismissAlarm();
  };

  // Determine styles based on intent
  let bgClass = 'bg-brand-900';
  let badgeClass = 'bg-brand-800 text-brand-100';
  let badgeText = 'ALERTA';
  let ctaText = 'Confirmar';
  let secondaryText = '+5 min';
  let tertiaryText = 'Dispensar';

  switch(activeAlarm.intent) {
    case 'pre-event':
      bgClass = 'bg-[#6D5D8A]'; // Lavanda escuro
      badgeClass = 'bg-[#8F7BAE] text-white';
      badgeText = 'EM 15 MIN'; // Or dynamic based on time
      ctaText = 'Vou me preparar agora';
      break;
    case 'task-now':
      bgClass = 'bg-[#4B5563]'; // Slate dark
      badgeClass = 'bg-[#6B7280] text-white';
      badgeText = 'AGORA';
      ctaText = 'Começar foco agora';
      tertiaryText = 'Pular por enquanto';
      break;
    case 'critical':
      bgClass = 'bg-orange-600';
      badgeClass = 'bg-orange-500 text-white';
      badgeText = 'URGENTE';
      ctaText = 'Estou saindo agora';
      tertiaryText = 'Não posso ir';
      break;
    case 'test':
      bgClass = 'bg-brand-600';
      badgeClass = 'bg-brand-500 text-white';
      badgeText = 'TESTE';
      ctaText = 'Ok, entendi';
      break;
  }

  // --- Screens ---
  
  if (screen === 'snooze') {
    return (
      <div className={`fixed inset-0 z-[500] flex flex-col p-8 ${bgClass} text-white animate-fade-in`}>
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <div className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-6 self-start bg-white/20">
            ADIAR
          </div>
          <h1 className="text-4xl font-black mb-2 leading-tight tracking-tight">Precisa de mais tempo?</h1>
          <p className="text-lg opacity-80 mb-1">{activeAlarm.title}</p>
          {activeAlarm.metadata && <p className="text-sm opacity-60 mb-10">{activeAlarm.metadata}</p>}
          
          <div className="flex flex-col gap-3">
            <button onClick={() => handleSnoozeOption(5)} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg text-left px-6 transition-colors">
              + 5 minutos
            </button>
            <button onClick={() => handleSnoozeOption(10)} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg text-left px-6 transition-colors">
              + 10 minutos
            </button>
            <button onClick={() => handleSnoozeOption(15)} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg text-left px-6 transition-colors">
              + 15 minutos
            </button>
            <button onClick={() => handleSnoozeOption('task')} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg text-left px-6 transition-colors border border-white/20">
              Quando eu terminar a tarefa atual
            </button>
          </div>
        </div>
        
        <button onClick={() => setScreen('main')} className="py-4 opacity-60 hover:opacity-100 font-bold mt-auto transition-opacity">
          Voltar
        </button>
      </div>
    );
  }

  if (screen === 'difficulty') {
    return (
      <div className={`fixed inset-0 z-[500] flex flex-col p-8 ${bgClass} text-white animate-fade-in`}>
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
          <h1 className="text-4xl font-black mb-2 leading-tight tracking-tight">O que está dificultando?</h1>
          <p className="text-lg opacity-80 mb-10">{activeAlarm.title}</p>
          
          <div className="flex flex-col gap-3">
            <button onClick={() => handleDifficultyOption('no-start')} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg text-left px-6 transition-colors">
              Não sei por onde começar
            </button>
            <button onClick={() => handleDifficultyOption('finishing-other')} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg text-left px-6 transition-colors">
              Estou terminando outra coisa
            </button>
            <button onClick={() => handleDifficultyOption('tired')} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg text-left px-6 transition-colors">
              Estou cansado
            </button>
            <button onClick={() => handleDifficultyOption('distracted')} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-lg text-left px-6 transition-colors">
              Me distraí
            </button>
          </div>
        </div>
        
        <button onClick={() => setScreen('main')} className="py-4 opacity-60 hover:opacity-100 font-bold mt-auto transition-opacity">
          Voltar
        </button>
      </div>
    );
  }

  // --- Main Screen ---
  return (
    <div className={`fixed inset-0 z-[500] flex flex-col p-8 ${bgClass} text-white overflow-hidden animate-fade-in`}>
      
      {/* Radial Effects Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[150vw] h-[150vw] max-w-[800px] max-h-[800px] rounded-full bg-white/5 animate-pulse-slow blur-3xl"></div>
        <div className="absolute w-[100vw] h-[100vw] max-w-[500px] max-h-[500px] rounded-full bg-white/10 animate-ping-slow blur-2xl opacity-50"></div>
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-8 self-start ${badgeClass}`}>
          {badgeText}
        </div>
        
        <h1 className="text-5xl font-black mb-3 leading-tight tracking-tight drop-shadow-md">
          {activeAlarm.title}
        </h1>
        
        {activeAlarm.durationOrTime && (
          <h2 className="text-4xl font-bold opacity-90 mb-2 drop-shadow-sm">
            {activeAlarm.durationOrTime}
          </h2>
        )}
        
        {activeAlarm.metadata && (
          <p className="text-sm font-medium opacity-70 mt-2 flex items-center gap-1.5">
            {activeAlarm.metadata}
          </p>
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-4 mt-auto max-w-md mx-auto w-full pb-6">
        <button 
          onClick={handleDismiss}
          className="w-full py-5 bg-white text-black rounded-full font-black text-lg shadow-[0_8px_30px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          {ctaText}
        </button>
        
        <button 
          onClick={() => setScreen('snooze')}
          className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-full font-bold text-base transition-colors"
        >
          {secondaryText}
        </button>
        
        {activeAlarm.intent === 'task-now' && (
          <button 
            onClick={() => setScreen('difficulty')}
            className="w-full py-4 opacity-70 hover:opacity-100 font-bold text-sm transition-opacity"
          >
            Não consigo começar
          </button>
        )}
        
        {activeAlarm.intent !== 'task-now' && (
          <button 
            onClick={handleDismiss}
            className="w-full py-4 opacity-60 hover:opacity-100 font-bold text-sm transition-opacity"
          >
            {tertiaryText}
          </button>
        )}
      </div>
      
    </div>
  );
};
