import React, { useState } from 'react';
import { useAlarmManager } from '../contexts/AlarmManagerContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useBackHandler } from '../contexts/NavigationContext';
import { audio } from '../utils/audio';
import { ChevronRight, ArrowLeft, Sparkles, Moon, Sun, Pill, AlertTriangle } from 'lucide-react';

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
  const [gamifiedProgress, setGamifiedProgress] = useState(0);

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

  if (!activeAlarm) return null;

  const isDark = theme === 'dark';
  const isCritical = activeAlarm.intent === 'critical';
  const isTask = activeAlarm.type === 'task' || activeAlarm.intent === 'task-now';
  const isSleep = activeAlarm.type === 'sleep';
  const isWake = activeAlarm.type === 'wake';
  const isMed = activeAlarm.type === 'medication';

  // Badges & CTAs based on type/intent
  let badgeText = activeAlarm.badge || 'LEMBRETE';
  let ctaText = activeAlarm.ctaText || 'Confirmar';
  let secondaryText = '+5 min';
  let tertiaryText = 'Dispensar';

  if (isTask) {
    if (!activeAlarm.badge) badgeText = 'AGORA';
    if (!activeAlarm.ctaText) ctaText = 'Começar foco agora';
    tertiaryText = 'Pular por enquanto';
  } else if (isSleep) {
    if (!activeAlarm.badge) badgeText = '🌙 HORA DE DORMIR';
    if (!activeAlarm.ctaText) ctaText = 'Vou me preparar agora';
    secondaryText = '+10 min';
    tertiaryText = 'Adiar sono';
  } else if (isWake) {
    if (!activeAlarm.badge) badgeText = '☀️ HORA DE ACORDAR';
    if (!activeAlarm.ctaText) ctaText = 'Acordei! Iniciar dia';
    secondaryText = '+5 min Soneca';
  } else if (isMed) {
    if (!activeAlarm.badge) badgeText = '💊 MEDICAMENTO';
    if (!activeAlarm.ctaText) ctaText = 'Tomar agora';
    tertiaryText = 'Lembrar mais tarde';
  } else if (isCritical) {
    if (!activeAlarm.badge) badgeText = 'URGENTE';
    if (!activeAlarm.ctaText) ctaText = 'Estou saindo agora';
    tertiaryText = 'Não posso ir';
  }

  // Visual Palette
  let bgClass = isDark ? 'bg-[#14121E] text-white' : 'bg-[#FAF8F5] text-[#1E1B2E]';
  let haloClass = isDark 
    ? 'from-purple-900/40 via-purple-950/20 to-transparent' 
    : 'from-purple-200/50 via-purple-100/30 to-transparent';
  let badgeClass = isDark ? 'bg-purple-950/80 text-purple-300 border border-purple-800/50' : 'bg-purple-100 text-purple-900 border border-purple-200';
  let ctaClass = isDark 
    ? 'bg-white text-[#14121E] shadow-[0_10px_35px_rgba(255,255,255,0.25)] hover:bg-neutral-100' 
    : 'bg-[#1E1B2E] text-white shadow-[0_10px_35px_rgba(30,27,46,0.2)] hover:bg-black';
  let secondaryClass = isDark 
    ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10' 
    : 'bg-black/5 hover:bg-black/10 text-[#1E1B2E] border border-black/10';
  let tertiaryClass = isDark ? 'text-white/60 hover:text-white' : 'text-[#6E6A82] hover:text-[#1E1B2E]';

  if (isCritical) {
    haloClass = isDark ? 'from-rose-950/60 via-red-950/30 to-transparent' : 'from-rose-200/60 via-orange-100/30 to-transparent';
    badgeClass = isDark ? 'bg-rose-950/90 text-rose-300 border border-rose-800/60' : 'bg-rose-100 text-rose-800 border border-rose-200';
  } else if (isWake) {
    haloClass = isDark ? 'from-amber-950/50 via-amber-950/20 to-transparent' : 'from-amber-200/60 via-amber-100/30 to-transparent';
    badgeClass = isDark ? 'bg-amber-950/90 text-amber-300 border border-amber-800/60' : 'bg-amber-100 text-amber-900 border border-amber-200';
  } else if (isMed) {
    haloClass = isDark ? 'from-pink-950/50 via-pink-950/20 to-transparent' : 'from-pink-200/60 via-pink-100/30 to-transparent';
    badgeClass = isDark ? 'bg-pink-950/90 text-pink-300 border border-pink-800/60' : 'bg-pink-100 text-pink-900 border border-pink-200';
  } else if (isSleep) {
    haloClass = isDark ? 'from-indigo-950/70 via-slate-950/40 to-transparent' : 'from-indigo-200/60 via-indigo-100/30 to-transparent';
    badgeClass = isDark ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-800/60' : 'bg-indigo-100 text-indigo-900 border border-indigo-200';
  }

  // --- SCREEN: SNOOZE (ADIAR) ---
  if (screen === 'snooze') {
    return (
      <div className={`fixed inset-0 z-[500] flex flex-col p-8 ${bgClass} animate-fade-in`}>
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-6 self-start ${badgeClass}`}>
            ADIAR ALARME
          </div>
          <h1 className="text-3xl font-black mb-2 leading-tight tracking-tight">
            Precisa de mais tempo?
          </h1>
          <p className="text-base font-semibold opacity-85 mb-1">{activeAlarm.title}</p>
          {activeAlarm.metadata && <p className="text-xs opacity-60 mb-8">{activeAlarm.metadata}</p>}
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => snoozeAlarm(5)} 
              className={`w-full py-4 rounded-2xl font-bold text-base text-left px-5 transition-all flex items-center justify-between ${secondaryClass}`}
            >
              <span>+ 5 minutos</span>
              <ChevronRight className="w-5 h-5 opacity-50" />
            </button>
            <button 
              onClick={() => snoozeAlarm(10)} 
              className={`w-full py-4 rounded-2xl font-bold text-base text-left px-5 transition-all flex items-center justify-between ${secondaryClass}`}
            >
              <span>+ 10 minutos</span>
              <ChevronRight className="w-5 h-5 opacity-50" />
            </button>
            <button 
              onClick={() => snoozeAlarm(15)} 
              className={`w-full py-4 rounded-2xl font-bold text-base text-left px-5 transition-all flex items-center justify-between ${secondaryClass}`}
            >
              <span>+ 15 minutos</span>
              <ChevronRight className="w-5 h-5 opacity-50" />
            </button>
            <button 
              onClick={() => snoozeAlarm('task_end')} 
              className={`w-full py-4 rounded-2xl font-bold text-base text-left px-5 transition-all flex items-center justify-between ${secondaryClass} border-dashed`}
            >
              <span>Quando terminar a tarefa atual</span>
              <ChevronRight className="w-5 h-5 opacity-50" />
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => { audio.playClick(); setScreen('main'); }} 
          className="py-4 font-bold mt-auto opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao alarme</span>
        </button>
      </div>
    );
  }

  // --- SCREEN: DIFFICULTY (NÃO CONSEGUI COMEÇAR) ---
  if (screen === 'difficulty') {
    return (
      <div className={`fixed inset-0 z-[500] flex flex-col p-8 ${bgClass} animate-fade-in`}>
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-6 self-start ${badgeClass}`}>
            APOIO TDAH
          </div>
          <h1 className="text-3xl font-black mb-2 leading-tight tracking-tight">
            O que está dificultando?
          </h1>
          <p className="text-sm font-semibold opacity-75 mb-8">
            {activeAlarm.title} {activeAlarm.durationOrTime ? `• ${activeAlarm.durationOrTime}` : ''}
          </p>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => handleDifficulty('no-start')} 
              className={`w-full py-4 rounded-2xl font-bold text-sm text-left px-5 transition-all flex items-center justify-between ${secondaryClass}`}
            >
              <div>
                <p className="font-bold">Não sei por onde começar</p>
                <p className="text-[10px] opacity-70 font-normal mt-0.5">Iniciar apenas micro-passo de 5 min</p>
              </div>
              <ChevronRight className="w-5 h-5 opacity-50 shrink-0" />
            </button>

            <button 
              onClick={() => handleDifficulty('finishing-other')} 
              className={`w-full py-4 rounded-2xl font-bold text-sm text-left px-5 transition-all flex items-center justify-between ${secondaryClass}`}
            >
              <div>
                <p className="font-bold">Estou terminando outra coisa</p>
                <p className="text-[10px] opacity-70 font-normal mt-0.5">Adiar 5 minutos para finalizar</p>
              </div>
              <ChevronRight className="w-5 h-5 opacity-50 shrink-0" />
            </button>

            <button 
              onClick={() => handleDifficulty('tired')} 
              className={`w-full py-4 rounded-2xl font-bold text-sm text-left px-5 transition-all flex items-center justify-between ${secondaryClass}`}
            >
              <div>
                <p className="font-bold">Estou cansado</p>
                <p className="text-[10px] opacity-70 font-normal mt-0.5">Pausa de 15 minutos para respirar</p>
              </div>
              <ChevronRight className="w-5 h-5 opacity-50 shrink-0" />
            </button>

            <button 
              onClick={() => handleDifficulty('distracted')} 
              className={`w-full py-4 rounded-2xl font-bold text-sm text-left px-5 transition-all flex items-center justify-between ${secondaryClass}`}
            >
              <div>
                <p className="font-bold">Me distraí</p>
                <p className="text-[10px] opacity-70 font-normal mt-0.5">Retomar agora com som calmante</p>
              </div>
              <ChevronRight className="w-5 h-5 opacity-50 shrink-0" />
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => { audio.playClick(); setScreen('main'); }} 
          className="py-4 font-bold mt-auto opacity-70 hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>
      </div>
    );
  }

  // --- SCREEN: MAIN FULLSCREEN ALARM (APPROVED VISUAL REFERENCE) ---
  return (
    <div className={`fixed inset-0 z-[500] flex flex-col p-8 ${bgClass} overflow-hidden animate-fade-in select-none`}>
      
      {/* Concentric Soft Radial Background Halos */}
      {!isLowStimulation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`w-[140vw] h-[140vw] max-w-[700px] max-h-[700px] rounded-full bg-gradient-to-r ${haloClass} blur-3xl animate-pulse-slow`}></div>
          <div className={`absolute w-[90vw] h-[90vw] max-w-[450px] max-h-[450px] rounded-full bg-gradient-to-tr ${haloClass} blur-2xl opacity-60 animate-ping-slow`}></div>
        </div>
      )}

      {/* Top Content Area */}
      <div className="relative z-10 flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        
        {/* Badge Pill */}
        <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider mb-6 self-start shadow-xs ${badgeClass}`}>
          {isWake && <Sun className="w-3.5 h-3.5 text-amber-500" />}
          {isSleep && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          {isMed && <Pill className="w-3.5 h-3.5 text-rose-500" />}
          {isCritical && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
          <span>{badgeText}</span>
        </div>
        
        {/* Large Bold Title */}
        <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-tight tracking-tight drop-shadow-xs">
          {activeAlarm.title}
        </h1>
        
        {/* Time or Duration right below title */}
        {activeAlarm.durationOrTime && (
          <h2 className="text-3xl sm:text-4xl font-extrabold opacity-90 mb-2 font-mono">
            {activeAlarm.durationOrTime}
          </h2>
        )}
        
        {/* Discreet Metadata */}
        {activeAlarm.metadata && (
          <p className="text-xs sm:text-sm font-semibold opacity-70 mt-2 flex items-center gap-1.5">
            <span>{activeAlarm.metadata}</span>
          </p>
        )}
      </div>

      {/* Bottom CTA & Actions Area */}
      <div className="relative z-10 flex flex-col gap-3 mt-auto max-w-sm mx-auto w-full pb-4">
        
        {/* Gamified Challenge Mode (if enabled) */}
        {activeAlarm.visual === 'gamified' && gamifiedProgress < 100 ? (
          <button
            onClick={() => {
              audio.playClick();
              const next = gamifiedProgress + 50;
              setGamifiedProgress(next);
              if (next >= 100) {
                setTimeout(executePrimaryAction, 200);
              }
            }}
            className={`w-full py-5 rounded-full font-black text-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${ctaClass}`}
          >
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>Toque 2x para Despertar ({gamifiedProgress / 50}/2)</span>
          </button>
        ) : (
          /* Primary Contextual CTA */
          <button 
            onClick={executePrimaryAction}
            className={`w-full py-5 rounded-full font-black text-lg tracking-wide transition-transform active:scale-95 hover:scale-[1.02] ${ctaClass}`}
          >
            {ctaText}
          </button>
        )}
        
        {/* Secondary +5 min Snooze Button */}
        <button 
          onClick={() => {
            audio.playClick();
            setScreen('snooze');
          }}
          className={`w-full py-4 rounded-full font-bold text-sm tracking-wide transition-colors ${secondaryClass}`}
        >
          {secondaryText}
        </button>
        
        {/* Difficulty Button for Tasks */}
        {isTask && (
          <button 
            onClick={() => {
              audio.playClick();
              setScreen('difficulty');
            }}
            className={`w-full py-3 font-bold text-xs tracking-wide opacity-75 hover:opacity-100 transition-opacity ${tertiaryClass}`}
          >
            Não consigo começar
          </button>
        )}
        
        {/* Tertiary Dismiss for non-tasks */}
        {!isTask && (
          <button 
            onClick={dismissAlarm}
            className={`w-full py-3 font-bold text-xs tracking-wide opacity-60 hover:opacity-100 transition-opacity ${tertiaryClass}`}
          >
            {tertiaryText}
          </button>
        )}
      </div>
      
    </div>
  );
};
