import React, { useEffect, useState } from 'react';
import { useAlarmManager } from '../contexts/AlarmManagerContext';
import { audio } from '../utils/audio';
import { Bell, Moon, Pill, Check, Zap } from 'lucide-react';

export const AlarmOverlay: React.FC = () => {
  const { activeAlarm, dismissAlarm } = useAlarmManager();
  
  // Gamified state
  const [sequence, setSequence] = useState<number[]>([]);
  const targetSequence = [1, 2, 3];
  
  useEffect(() => {
    if (activeAlarm) {
      if (activeAlarm.sound === 'chime') {
         audio.playChimeDone();
         const interval = setInterval(() => audio.playChimeDone(), 3000);
         return () => clearInterval(interval);
      } else {
         audio.playAmbient(activeAlarm.sound, 0.5);
         return () => audio.stopAmbient();
      }
    } else {
       audio.stopAmbient();
    }
  }, [activeAlarm]);

  if (!activeAlarm) return null;

  const handleDismiss = () => {
    audio.playClick();
    audio.stopAmbient();
    dismissAlarm();
    setSequence([]);
  };

  const handleGamifiedClick = (num: number) => {
    audio.playTick();
    const newSeq = [...sequence, num];
    
    // Check if correct so far
    let isCorrect = true;
    for(let i = 0; i < newSeq.length; i++) {
       if (newSeq[i] !== targetSequence[i]) {
          isCorrect = false;
          break;
       }
    }
    
    if (isCorrect) {
       setSequence(newSeq);
       if (newSeq.length === targetSequence.length) {
          setTimeout(handleDismiss, 300);
       }
    } else {
       // Reset on error
       setSequence([]);
    }
  };

  const Icon = activeAlarm.type === 'sleep' ? Moon : Pill;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-app-bg/95 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-sm modal-standard overflow-hidden animate-scale-in">
        
        {/* Header Graphic */}
        <div className={`relative h-48 flex items-center justify-center overflow-hidden transition-colors duration-500 ${
          activeAlarm.visual === 'gamified' ? 'bg-orange-500' : 'bg-brand-600'
        }`}>
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          
          <div className="relative z-10 w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-lg animate-pulse-slow">
             <Icon className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-3">
             <Bell className={`w-5 h-5 ${activeAlarm.visual === 'gamified' ? 'text-orange-500' : 'text-brand-500'} animate-wiggle`} />
             <h2 className="text-xl font-bold text-text-primary">Alarme</h2>
          </div>
          
          <p className="text-base font-bold text-text-secondary mb-8 leading-relaxed">
             {activeAlarm.title}
          </p>

          {activeAlarm.visual === 'gamified' ? (
             <div className="w-full flex flex-col items-center">
                <p className="text-[11px] font-bold text-orange-500 mb-5 uppercase tracking-widest flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 rounded-full">
                   <Zap className="w-3.5 h-3.5" /> Pressione em ordem
                </p>
                <div className="flex gap-4">
                   {[1, 2, 3].map(num => {
                      const isPressed = sequence.includes(num);
                      return (
                        <button 
                           key={num}
                           onClick={() => !isPressed && handleGamifiedClick(num)}
                           className={`w-14 h-14 rounded-full text-xl font-black transition-all duration-300 flex items-center justify-center shadow-sm ${
                             isPressed ? 'bg-green-500 text-white scale-90 border-transparent' : 'bg-card-bg border-2 border-border-color text-text-primary hover:border-orange-500 hover:text-orange-500 active:scale-95'
                           }`}
                        >
                           {isPressed ? <Check className="w-6 h-6" /> : num}
                        </button>
                      );
                   })}
                </div>
             </div>
          ) : (
             <div className="w-full flex flex-col gap-3 mt-4">
                <button 
                  onClick={handleDismiss}
                  className="w-full py-4 btn-primary text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                >
                  Desligar Alarme
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
