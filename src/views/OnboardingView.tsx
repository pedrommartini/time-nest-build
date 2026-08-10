import React, { useState } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';
import { useCalendar } from '../contexts/CalendarContext';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { audio } from '../utils/audio';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { AnimatedTimeline, AnimatedSync, AnimatedSleep } from '../components/AnimatedIcons';

interface OnboardingViewProps {
  onComplete: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  const { sleepStart, sleepEnd, updateSleepTime } = usePreferences();
  const { googleSync, connectGoogle } = useCalendar();
  const [step, setStep] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tempStart, setTempStart] = useState(sleepStart);
  const [tempEnd, setTempEnd] = useState(sleepEnd);

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const nextStep = () => {
    if (step < 2) {
      audio.playClick();
      setStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) {
      audio.playClick();
      setStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    audio.playChimeDone();
    updateSleepTime(tempStart, tempEnd);
    localStorage.setItem('timenest_onboarding_completed', 'true');
    onComplete();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && step < 2) {
      nextStep();
    } else if (isRightSwipe && step > 0) {
      prevStep();
    }
  };

  const childVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <>
            <motion.h1 variants={childVariants} className="text-xl md:text-2xl font-bold text-text-primary mb-6">Bem-vindo ao TimeNest</motion.h1>
            <motion.div variants={childVariants} className="w-56 h-56 md:w-64 md:h-64 mb-6">
              <AnimatedTimeline />
            </motion.div>
            <motion.p variants={childVariants} className="text-text-secondary text-xs md:text-sm mb-4 w-full px-4">
              Seu assistente pessoal para organizar o dia, aumentar o foco e respeitar o seu sono.
            </motion.p>
          </>
        );
      
      case 1:
        return (
          <>
            <motion.h1 variants={childVariants} className="text-xl md:text-2xl font-bold text-text-primary mb-6">Conecte sua Agenda</motion.h1>
            <motion.div variants={childVariants} className="w-56 h-56 md:w-64 md:h-64 mb-6">
              <AnimatedSync />
            </motion.div>
            <motion.p variants={childVariants} className="text-text-secondary text-xs md:text-sm mb-6 w-full px-4">
              Sincronize com o Google para importar e exportar seus eventos automaticamente.
            </motion.p>
            
            <motion.div variants={childVariants} className="w-full">
              {!googleSync.isConnected ? (
                <button 
                  onClick={async () => {
                    setIsSyncing(true);
                    await connectGoogle();
                    setIsSyncing(false);
                  }}
                  disabled={isSyncing}
                  className="w-full max-w-[240px] mx-auto flex items-center justify-center gap-2 bg-white text-gray-800 font-semibold py-3 rounded-2xl shadow-md hover:shadow-lg active:scale-95 transition-all mb-4 text-xs"
                >
                  {isSyncing ? (
                    <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Conectar Google
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full max-w-[240px] mx-auto flex items-center justify-center gap-2 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 font-semibold py-3 rounded-2xl shadow-sm mb-4 border border-green-300 dark:border-green-800 text-xs">
                  <Check className="w-4 h-4" />
                  Conta Conectada!
                </div>
              )}
              
              <button 
                onClick={nextStep}
                className="text-text-secondary hover:text-brand-500 font-medium text-[10px] py-1 transition-colors block mx-auto"
              >
                Pular esta etapa
              </button>
            </motion.div>
          </>
        );

      case 2:
        return (
          <>
            <motion.h1 variants={childVariants} className="text-xl md:text-2xl font-bold text-text-primary mb-6">Horário de Sono</motion.h1>
            <motion.div variants={childVariants} className="w-56 h-56 md:w-64 md:h-64 mb-6">
              <AnimatedSleep />
            </motion.div>
            <motion.p variants={childVariants} className="text-text-secondary text-xs md:text-sm mb-6 w-full px-4">
              Protegemos seu descanso. Nenhum evento ou tarefa será sugerido nesse período.
            </motion.p>
            
            <motion.div variants={childVariants} className="w-full">
              <div className="w-full max-w-[240px] mx-auto bg-card-bg p-4 rounded-2xl border border-border-color space-y-4 shadow-sm mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary text-xs">Dormir</span>
                  <input 
                    type="time" 
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="bg-app-bg text-text-primary px-2 py-1.5 rounded-lg border border-border-color font-mono text-xs text-center focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div className="h-px bg-border-color w-full" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-primary text-xs">Acordar</span>
                  <input 
                    type="time" 
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="bg-app-bg text-text-primary px-2 py-1.5 rounded-lg border border-border-color font-mono text-xs text-center focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <button
                onClick={handleFinish}
                className="w-full max-w-[240px] mx-auto py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Check className="w-4 h-4" />
                Começar a usar
              </button>
            </motion.div>
          </>
        );
    }
  };

  const variants: Variants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95
    }),
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { 
        type: "spring" as const, stiffness: 300, damping: 30,
        staggerChildren: 0.3,
        delayChildren: 0.1
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.95
    })
  };

  const [[page, direction], setPage] = useState([0, 0]);

  const paginate = (newDirection: number) => {
    if (step + newDirection >= 0 && step + newDirection <= 2) {
      setPage([step + newDirection, newDirection]);
      if (newDirection > 0) nextStep();
      else prevStep();
    }
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="fixed inset-0 z-[100] flex flex-col bg-app-bg dot-pattern text-text-primary overflow-hidden"
    >
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        
        {/* Content Area with Animation */}
        <AnimatePresence initial={true} custom={direction} mode="wait">
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="w-full max-w-sm px-12 md:px-16 flex flex-col items-center justify-center text-center absolute"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Side Arrows */}
        {step > 0 && (
          <button
            onClick={() => paginate(-1)}
            className="absolute left-2 md:left-6 z-20 p-2 md:p-3 text-text-secondary hover:text-brand-500 hover:bg-brand-500/10 rounded-full transition-all active:scale-90"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
          </button>
        )}

        {step < 2 && (
          <button
            onClick={() => paginate(1)}
            className="absolute right-2 md:right-6 z-20 p-2 md:p-3 text-text-secondary hover:text-brand-500 hover:bg-brand-500/10 rounded-full transition-all active:scale-90"
            aria-label="Próximo"
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Bottom Indicators Bar */}
      <div className="h-24 w-full flex items-center justify-center shrink-0 z-10">
        <div className="flex items-center gap-3">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => {
                if (step !== i) {
                  audio.playClick();
                  setPage([i, i > step ? 1 : -1]);
                  setStep(i);
                }
              }}
              className={`transition-all duration-300 rounded-full ${
                step === i 
                  ? 'w-8 h-2.5 bg-brand-600 dark:bg-brand-400' 
                  : 'w-2.5 h-2.5 bg-border-color hover:bg-text-secondary'
              }`}
              aria-label={`Ir para a etapa ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
