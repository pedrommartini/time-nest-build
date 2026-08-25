import React, { useState, useEffect } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';
import { useCalendar } from '../contexts/CalendarContext';
import { useProfile } from '../contexts/ProfileContext';
import { useMedication } from '../contexts/MedicationContext';
import { useBackHandler } from '../contexts/NavigationContext';
import { ChevronLeft, ChevronRight, Check, Pill, Plus, Trash2, AlertCircle, Sparkles, ArrowLeft } from 'lucide-react';
import { audio } from '../utils/audio';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { AnimatedTimeline, AnimatedSync, AnimatedSleep } from '../components/AnimatedIcons';
import { 
  cleanUsernameInput, 
  validateUsernameFormat, 
  isUsernameAvailable, 
  generateUsernameSuggestions, 
  reserveUsername 
} from '../utils/username';

import { useSync } from '../contexts/SyncContext';

interface OnboardingViewProps {
  onComplete: () => void;
  isManualReplay?: boolean;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete, isManualReplay = false }) => {
  const { sleepStart, sleepEnd, updateSleepTime, sleep5MinAlarmEnabled, setSleep5MinAlarmEnabled } = usePreferences();
  const { googleSync, connectGoogle } = useCalendar();
  const { profile, setProfile } = useProfile();
  const { medications, addMedication, deleteMedication } = useMedication();
  const { hasCloudDataForAccount, hydrateAccountFromCloud, saveCloudBackup } = useSync();

  const [step, setStep] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tempStart, setTempStart] = useState(sleepStart);
  const [tempEnd, setTempEnd] = useState(sleepEnd);

  // Username state
  const [tempUsername, setTempUsername] = useState(profile.username || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameValid, setUsernameValid] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Medication setup modal & step state
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [medName, setMedName] = useState('');
  const [medTime, setMedTime] = useState('08:00');

  const prevStep = () => {
    if (step > 0) {
      audio.playClick();
      setPage([step - 1, -1]);
      setStep(prev => prev - 1);
    }
  };

  // Close medication modal if open
  useBackHandler(() => {
    setShowMedicationModal(false);
    return true;
  }, showMedicationModal, 20);

  // Go to previous step if step > 0
  useBackHandler(() => {
    prevStep();
    return true;
  }, step > 0 && !showMedicationModal, 10);

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  // Auto-generate username when Google sync finishes or on step 2 load
  useEffect(() => {
    if (step === 2 || googleSync.isConnected) {
      const baseName = googleSync.email || profile.name || profile.email || 'user';
      const generated = generateUsernameSuggestions(baseName, profile.id);
      setSuggestions(generated);

      // If user hasn't typed a custom username or username is default 'visitante'
      if (!tempUsername || tempUsername === 'visitante') {
        const cleanFirst = cleanUsernameInput(generated[0] || 'user');
        setTempUsername(cleanFirst);
        validateAndCheckUsername(cleanFirst);
      }
    }
  }, [step, googleSync.isConnected]);

  const validateAndCheckUsername = (val: string) => {
    const cleaned = cleanUsernameInput(val);
    const format = validateUsernameFormat(cleaned);

    if (!format.isValid) {
      setUsernameValid(false);
      setUsernameError(format.error);
      return false;
    }

    const avail = isUsernameAvailable(cleaned, profile.id);
    if (!avail.available) {
      setUsernameValid(false);
      setUsernameError(avail.reason || 'Username indisponível.');
      return false;
    }

    setUsernameValid(true);
    setUsernameError(null);
    return true;
  };

  const handleUsernameChange = (val: string) => {
    const cleaned = cleanUsernameInput(val);
    setTempUsername(cleaned);
    validateAndCheckUsername(cleaned);
  };

  const handleSelectSuggestion = (sugg: string) => {
    audio.playClick();
    const cleaned = cleanUsernameInput(sugg);
    setTempUsername(cleaned);
    validateAndCheckUsername(cleaned);
  };

  const nextStep = () => {
    if (step === 2) {
      // Validate username before leaving step 2
      if (!validateAndCheckUsername(tempUsername)) {
        return;
      }
      // Save username to profile & registry
      reserveUsername(tempUsername, profile.id, profile.username);
      setProfile({ ...profile, username: tempUsername });
    }

    if (step < 3) {
      audio.playClick();
      setStep(prev => prev + 1);
    } else if (step === 3) {
      // After sleep step, show medication question popup
      audio.playClick();
      setShowMedicationModal(true);
    }
  };

  const handleFinish = async () => {
    audio.playChimeDone();
    updateSleepTime(tempStart, tempEnd);
    if (tempUsername && usernameValid) {
      reserveUsername(tempUsername, profile.id, profile.username);
      setProfile({ ...profile, username: tempUsername });
    }
    localStorage.setItem('timenest_onboarding_completed', 'true');
    
    const currEmail = googleSync.email || profile.email;
    if (currEmail) {
      saveCloudBackup(currEmail);
    }
    
    // Request native alarm permissions on first run
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { registerPlugin } = await import('@capacitor/core');
        const NativeAlarm = registerPlugin<any>('NativeAlarm');
        if (NativeAlarm && NativeAlarm.requestPermissions) {
          await NativeAlarm.requestPermissions();
        }
      }
    } catch (e) {
      console.warn('Could not request native permissions on onboard finish', e);
    }

    onComplete();
  };

  const handleAddMedication = async () => {
    if (!medName.trim()) return;
    audio.playClick();
    await addMedication(medName.trim(), medTime, true);
    setMedName('');
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

    if (isLeftSwipe && step < (showMedicationModal ? 4 : 3)) {
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
                    const user = await connectGoogle();
                    if (user) {
                      const userEmail = user.email || googleSync.email;
                      const newProfile = { ...profile };
                      if (user.displayName || user.name) newProfile.name = user.displayName || user.name;
                      if (user.email) newProfile.email = user.email;
                      if (user.imageUrl || user.photoUrl) newProfile.avatar = user.imageUrl || user.photoUrl;
                      
                      const autoSugg = generateUsernameSuggestions(user.email || user.displayName || user.name || 'user', profile.id)[0];
                      if (autoSugg) {
                        const cleanSugg = cleanUsernameInput(autoSugg);
                        newProfile.username = cleanSugg;
                        setTempUsername(cleanSugg);
                      }
                      setProfile(newProfile);

                      // If account already has data in cloud and this is NOT a manual replay, skip to timeline!
                      if (!isManualReplay && userEmail && hasCloudDataForAccount(userEmail)) {
                        hydrateAccountFromCloud(userEmail);
                        localStorage.setItem('timenest_onboarding_completed', 'true');
                        setIsSyncing(false);
                        onComplete();
                        return;
                      }
                    }
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
                {googleSync.isConnected ? 'Continuar' : 'Pular esta etapa'}
              </button>
            </motion.div>
          </>
        );

      case 2:
        return (
          <>
            <motion.h1 variants={childVariants} className="text-xl md:text-2xl font-bold text-text-primary mb-2">Escolha seu Username</motion.h1>
            <motion.p variants={childVariants} className="text-text-secondary text-xs mb-6 w-full px-4">
              Defina a sua identificação única no TimeNest.
            </motion.p>
            
            <motion.div variants={childVariants} className="w-full max-w-[280px] mx-auto flex flex-col items-center">
              <div className="w-full bg-card-bg p-4 rounded-2xl border border-border-color shadow-sm mb-3">
                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 text-left">Username único</label>
                <div className={`relative flex items-center bg-app-bg rounded-xl border transition-colors px-3 py-2 ${
                  usernameError ? 'border-red-500 bg-red-50/10' : usernameValid && tempUsername ? 'border-green-500 bg-green-50/10' : 'border-border-color focus-within:border-brand-500'
                }`}>
                  <span className="text-brand-500 font-bold text-sm mr-1">@</span>
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="seu_username"
                    className="w-full bg-transparent text-text-primary font-mono text-sm focus:outline-none"
                    maxLength={20}
                  />
                  {usernameValid && tempUsername && (
                    <Check className="w-4 h-4 text-green-500 ml-1 shrink-0" />
                  )}
                  {usernameError && (
                    <AlertCircle className="w-4 h-4 text-red-500 ml-1 shrink-0" />
                  )}
                </div>

                {/* Validation Status message */}
                {usernameError && (
                  <p className="text-[10px] text-red-500 font-medium text-left mt-1.5 flex items-center gap-1">
                    {usernameError}
                  </p>
                )}
                {usernameValid && tempUsername && (
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-medium text-left mt-1.5 flex items-center gap-1">
                    ✓ Username reservado e disponível!
                  </p>
                )}
              </div>

              {/* Suggestions Chips */}
              {suggestions.length > 0 && (
                <div className="w-full mb-6 text-left">
                  <span className="text-[10px] font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Sugestões automáticas:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((sugg) => (
                      <button
                        key={sugg}
                        type="button"
                        onClick={() => handleSelectSuggestion(sugg)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                          tempUsername === cleanUsernameInput(sugg)
                            ? 'bg-brand-500 text-white border-brand-500'
                            : 'bg-card-bg text-text-secondary border-border-color hover:border-brand-400 hover:text-brand-500'
                        }`}
                      >
                        {sugg}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={nextStep}
                disabled={!usernameValid || !tempUsername}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:pointer-events-none"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          </>
        );

      case 3:
        return (
          <>
            <motion.h1 variants={childVariants} className="text-xl md:text-2xl font-bold text-text-primary mb-4">Horário de Sono</motion.h1>
            <motion.div variants={childVariants} className="w-44 h-44 md:w-52 md:h-52 mb-4">
              <AnimatedSleep />
            </motion.div>
            <motion.p variants={childVariants} className="text-text-secondary text-xs md:text-sm mb-4 w-full px-4">
              Protegemos seu descanso. Nenhum evento ou tarefa será sugerido nesse período.
            </motion.p>
            
            <motion.div variants={childVariants} className="w-full">
              <div className="w-full max-w-[260px] mx-auto bg-card-bg p-4 rounded-2xl border border-border-color space-y-3 shadow-sm mb-4">
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
                
                {/* 5 Min Before Alarm Toggle */}
                <div className="h-px bg-border-color w-full" />
                <div className="flex justify-between items-center pt-1">
                  <div className="text-left pr-2">
                    <span className="font-semibold text-text-primary text-[11px] block leading-tight">Alarme 5 min antes</span>
                    <span className="text-[9px] text-text-secondary">Aviso prévio para desacelerar</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audio.playClick();
                      setSleep5MinAlarmEnabled(!sleep5MinAlarmEnabled);
                    }}
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ${
                      sleep5MinAlarmEnabled ? 'bg-brand-500' : 'bg-border-color'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      sleep5MinAlarmEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

              <button
                onClick={nextStep}
                className="w-full max-w-[260px] mx-auto py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center gap-2 text-xs"
              >
                Avançar
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          </>
        );

      case 4:
        return (
          <>
            <motion.h1 variants={childVariants} className="text-xl font-bold text-text-primary mb-2 flex items-center justify-center gap-2">
              <Pill className="w-5 h-5 text-red-500" />
              Horário de Medicamentos
            </motion.h1>
            <motion.p variants={childVariants} className="text-text-secondary text-xs mb-4 w-full px-4">
              Cadastre seus medicamentos diários para nunca esquecer uma dose.
            </motion.p>

            <motion.div variants={childVariants} className="w-full max-w-[280px] mx-auto">
              <div className="bg-card-bg p-3.5 rounded-2xl border border-border-color shadow-sm mb-4 space-y-3">
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Nome do medicamento"
                    value={medName}
                    onChange={(e) => setMedName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-app-bg border border-border-color text-text-primary text-xs focus:outline-none focus:border-brand-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={medTime}
                      onChange={(e) => setMedTime(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-app-bg border border-border-color font-mono text-xs text-text-primary text-center focus:outline-none focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      disabled={!medName.trim()}
                      className="px-4 py-2 bg-brand-600 text-white rounded-xl font-bold text-xs hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  </div>
                </div>

                {/* List of Added Meds */}
                {medications.length > 0 && (
                  <div className="pt-2 border-t border-border-color space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                    {medications.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-app-bg border border-border-color/50 text-xs">
                        <div className="flex items-center gap-2">
                          <Pill className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="font-bold text-text-primary truncate max-w-[120px]">{m.name}</span>
                          <span className="font-mono text-[10px] text-text-secondary bg-card-bg px-1.5 py-0.5 rounded border border-border-color">{m.time}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMedication(m.id)}
                          className="text-text-secondary hover:text-red-500 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Check className="w-4 h-4" />
                Concluir e Começar
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
    const maxS = showMedicationModal ? 4 : 3;
    if (step + newDirection >= 0 && step + newDirection <= maxS) {
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
      {/* Top Bar with Back Button */}
      {step > 0 && (
        <div className="absolute top-4 left-4 z-30 animate-fade-in">
          <button
            type="button"
            onClick={() => paginate(-1)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card-bg/90 border border-border-color shadow-sm text-text-primary text-xs font-semibold hover:bg-card-bg active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-brand-500" />
            <span>Voltar</span>
          </button>
        </div>
      )}

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
            className="w-full max-w-sm px-8 md:px-16 flex flex-col items-center justify-center text-center absolute"
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

        {step < (showMedicationModal ? 4 : 3) && (
          <button
            onClick={() => paginate(1)}
            className="absolute right-2 md:right-6 z-20 p-2 md:p-3 text-text-secondary hover:text-brand-500 hover:bg-brand-500/10 rounded-full transition-all active:scale-90"
            aria-label="Próximo"
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10" strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Medication Question Modal Prompt */}
      {showMedicationModal && step === 3 && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="w-full max-w-xs bg-card-bg border border-border-color rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-500 flex items-center justify-center mb-4 border border-red-200 dark:border-red-900">
              <Pill className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-2">Horários de Medicamentos</h3>
            <p className="text-xs text-text-secondary mb-6 leading-relaxed">
              Você gostaria de configurar horários de medicamentos agora para receber lembretes?
            </p>
            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  setPage([4, 1]);
                  setStep(4);
                }}
                className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Sim, configurar
              </button>
              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  handleFinish();
                }}
                className="w-full py-2.5 rounded-2xl bg-transparent hover:bg-border-color/30 text-text-secondary font-semibold text-xs transition-colors"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Indicators Bar */}
      <div className="h-20 w-full flex items-center justify-center shrink-0 z-10">
        <div className="flex items-center gap-2.5">
          {[0, 1, 2, 3, ...(step === 4 || showMedicationModal ? [4] : [])].map((i) => (
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
                  ? 'w-7 h-2.5 bg-brand-600 dark:bg-brand-400' 
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
