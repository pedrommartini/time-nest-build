import React, { useState } from 'react';
import type { ActiveAlarm } from '../contexts/AlarmManagerContext';
import { audio } from '../utils/audio';
import { 
  Sparkles, 
  Moon, 
  Sun, 
  Pill, 
  Bell, 
  Zap, 
  Clock, 
  Lock, 
  Calendar, 
  CheckSquare, 
  ArrowRight,
  Compass,
  RotateCcw,
  BatteryLow
} from 'lucide-react';

export interface AlarmVisualDisplayProps {
  alarm: ActiveAlarm;
  theme?: 'light' | 'dark';
  isLowStimulation?: boolean;
  screen?: 'main' | 'snooze' | 'difficulty';
  onScreenChange?: (screen: 'main' | 'snooze' | 'difficulty') => void;
  onPrimaryAction?: () => void;
  onSnooze?: (minutes: number | 'task_end') => void;
  onDifficulty?: (reason: 'no-start' | 'finishing-other' | 'tired' | 'distracted') => void;
  onDismiss?: () => void;
  containerMode?: 'fullscreen' | 'embedded';
  interactive?: boolean;
}

export const AlarmVisualDisplay: React.FC<AlarmVisualDisplayProps> = ({
  alarm,
  theme = 'light',
  isLowStimulation = false,
  screen: controlledScreen,
  onScreenChange,
  onPrimaryAction,
  onSnooze,
  onDifficulty,
  onDismiss,
  containerMode = 'fullscreen',
  interactive = true,
}) => {
  const [internalScreen, setInternalScreen] = useState<'main' | 'snooze' | 'difficulty'>('main');
  const [gamifiedProgress, setGamifiedProgress] = useState(0);

  const activeScreen = controlledScreen !== undefined ? controlledScreen : internalScreen;

  const setScreen = (newScreen: 'main' | 'snooze' | 'difficulty') => {
    if (onScreenChange) {
      onScreenChange(newScreen);
    } else {
      setInternalScreen(newScreen);
    }
  };

  const isDark = theme === 'dark';
  const isCritical = alarm.intent === 'critical';
  const isTask = alarm.type === 'task' || alarm.intent === 'task-now';
  const isSleep = alarm.type === 'sleep';
  const isWake = alarm.type === 'wake';
  const isMed = alarm.type === 'medication';

  // Badges & CTAs based on type/intent
  let badgeText = alarm.badge;
  if (!badgeText) {
    if (isCritical) badgeText = 'URGENTE';
    else if (isTask) badgeText = 'AGORA';
    else if (isSleep) badgeText = '🌙 HORA DE DORMIR';
    else if (isWake) badgeText = '☀️ HORA DE ACORDAR';
    else if (isMed) badgeText = '💊 MEDICAMENTO';
    else if (alarm.intent === 'pre-event') badgeText = 'EM 15 MIN';
    else badgeText = 'EM 15 MIN';
  }

  let ctaText = alarm.ctaText;
  if (!ctaText) {
    if (isCritical) ctaText = 'Estou saindo agora';
    else if (isTask) ctaText = 'Começar foco agora';
    else if (isSleep) ctaText = 'Vou me preparar agora';
    else if (isWake) ctaText = 'Acordei! Iniciar dia';
    else if (isMed) ctaText = 'Tomar agora';
    else ctaText = 'Vou me preparar agora';
  }

  let secondaryText = '+5 min';
  if (isSleep) secondaryText = '+10 min';
  else if (isWake) secondaryText = '+5 min Soneca';

  let tertiaryText = 'Dispensar';
  if (isCritical) tertiaryText = 'Não posso ir';
  else if (isTask) tertiaryText = 'Pular por enquanto';
  else if (isSleep) tertiaryText = 'Adiar sono';
  else if (isMed) tertiaryText = 'Lembrar mais tarde';

  // Visual Palette Tokens
  const bgClass = isDark
    ? 'bg-[#120E1F] text-white'
    : isCritical
      ? 'bg-[#FFF8F5] text-[#380A0A]'
      : 'bg-[#FAF9F6] text-[#110E2E]';

  const haloThemeClass = isCritical ? 'alarm-halo-critical' : 'alarm-halo-lavender';

  const badgeClass = isDark
    ? isCritical
      ? 'bg-rose-950/90 text-rose-300 border border-rose-800/60'
      : isWake
        ? 'bg-amber-950/90 text-amber-300 border border-amber-800/60'
        : isSleep
          ? 'bg-indigo-950/90 text-indigo-300 border border-indigo-800/60'
          : isMed
            ? 'bg-pink-950/90 text-pink-300 border border-pink-800/60'
            : 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
    : isCritical
      ? 'bg-[#FFF1ED] text-[#DC2626] border border-rose-200'
      : isWake
        ? 'bg-amber-100 text-amber-900 border border-amber-200'
        : isSleep
          ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
          : isMed
            ? 'bg-pink-100 text-pink-900 border border-pink-200'
            : 'bg-purple-100/80 text-[#4338CA] border border-purple-200';

  const timeColorClass = isDark
    ? isCritical
      ? 'bg-gradient-to-r from-orange-400 to-rose-400 bg-clip-text text-transparent text-rose-400'
      : 'text-[#9B83FF]'
    : isCritical
      ? 'bg-gradient-to-r from-[#F95721] to-[#DC2626] bg-clip-text text-transparent text-[#EA3A2A]'
      : 'text-[#6E4EFF]';

  const metadataColorClass = isDark
    ? 'text-[#A19DB8]'
    : isCritical
      ? 'text-[#8C4A4A]'
      : 'text-[#6B6684]';

  // Primary Compound CTA Styling
  const primaryCtaStyle: React.CSSProperties = isCritical
    ? {
        background: 'linear-gradient(135deg, #F94A1E 0%, #D81414 100%)',
        boxShadow: '0 14px 34px -4px rgba(220, 38, 38, 0.50)',
      }
    : {
        background: 'linear-gradient(135deg, #4F17C5 0%, #2F0A9E 100%)',
        boxShadow: '0 14px 34px -4px rgba(79, 23, 197, 0.45)',
      };

  const primaryIconColor = isCritical ? 'text-[#DC2626]' : 'text-[#3E12B3]';

  // Secondary Outline Pill Styling
  const secondaryBtnStyle: React.CSSProperties = isCritical
    ? {
        border: '1.5px solid rgba(220, 38, 38, 0.35)',
      }
    : {
        border: '1.5px solid rgba(139, 92, 246, 0.35)',
      };

  const secondaryBtnClass = isCritical
    ? (isDark 
        ? 'bg-rose-950/20 hover:bg-rose-950/40 active:bg-rose-950/60 text-rose-300 border-rose-800/40' 
        : 'bg-white/40 hover:bg-rose-50/50 active:bg-rose-100/50 text-[#DC2626] border-rose-200')
    : (isDark 
        ? 'bg-purple-950/20 hover:bg-purple-950/40 active:bg-purple-950/60 text-purple-300 border-purple-800/40' 
        : 'bg-white/40 hover:bg-purple-50/50 active:bg-purple-100/50 text-[#4338CA] border-purple-200');

  const secondaryIconColor = isCritical 
    ? (isDark ? 'text-rose-300' : 'text-[#DC2626]')
    : (isDark ? 'text-purple-300' : 'text-[#4338CA]');

  // Tertiary Text Link Styling
  const tertiaryBtnClass = isCritical
    ? (isDark ? 'text-rose-300 hover:text-white' : 'text-[#6B2B2B] hover:text-[#380A0A]')
    : (isDark ? 'text-[#A19DB8] hover:text-white' : 'text-[#5B557C] hover:text-[#110E2E]');

  const containerBaseClass = containerMode === 'fullscreen'
    ? 'fixed inset-0 z-[500]'
    : 'absolute inset-0 z-10';

  // Responsive Title Sizing
  const getTitleSizeClass = (title: string) => {
    const len = title.length;
    if (len > 80) return 'text-xl sm:text-2xl leading-tight';
    if (len > 40) return 'text-2xl sm:text-3xl leading-snug';
    if (len > 24) return 'text-3xl sm:text-4xl leading-tight';
    return 'text-4xl sm:text-5xl leading-[1.08]';
  };

  return (
    <div 
      className={`${containerBaseClass} ${bgClass} overflow-hidden select-none flex flex-col items-center justify-between ${haloThemeClass} ${isDark ? 'dark' : ''} ${isLowStimulation ? 'low-stim' : ''}`}
      data-low-stim={isLowStimulation ? 'true' : undefined}
      data-theme={theme}
    >
      {/* Root Persistent Concentric Radial Halos Viewport */}
      {!isLowStimulation ? (
        <div className="alarm-halo-viewport pointer-events-none" aria-hidden="true">
          <div 
            className={`alarm-halo-stage animate-pulse-slow ${
              isCritical ? 'animate-halo-breathe-critical' : 'animate-halo-breathe-standard'
            }`}
          >
            <div className="alarm-halo-ring-4" />
            <div className="alarm-halo-ring-3" />
            <div className="alarm-halo-ring-2" />
            <div className="alarm-halo-ring-1" />
            <div className="alarm-halo-core rounded-full bg-gradient" />
          </div>
        </div>
      ) : (
        <div className="alarm-halo-viewport low-stim pointer-events-none" aria-hidden="true">
          <div className="alarm-halo-stage">
            <div className="alarm-halo-core-static rounded-full" />
          </div>
        </div>
      )}

      {/* Screen Router */}
      {/* SCREEN 1: DEDICATED SNOOZE / ADIAR SCREEN (04_snooze_adiar.png) */}
      {activeScreen === 'snooze' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-between w-full max-w-md mx-auto p-6 sm:p-8 animate-fade-in overflow-y-auto custom-scrollbar select-none">
          {/* Top Centered Information Stack (Anchored over Halo Center) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center w-full my-auto px-2">
            
            {/* Centered Pill Badge: Clock icon + ADIAR */}
            <div className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black tracking-wider mb-5 sm:mb-6 shadow-xs self-center mx-auto ${
              isDark 
                ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40' 
                : 'bg-white/80 text-[#4A2EB7] border border-[#D6CEF1]'
            }`}>
              <Clock className={`w-3.5 h-3.5 stroke-[2.2] ${isDark ? 'text-purple-300' : 'text-[#4A2EB7]'}`} />
              <span>ADIAR</span>
            </div>

            {/* 2-line Centered Title: "Precisa de \n mais tempo?" */}
            <h1 aria-label="Precisa de mais tempo?" className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.08] text-[#110E2E] dark:text-white text-center mx-auto mb-2.5 sm:mb-3 drop-shadow-xs">
              <span className="block">Precisa de</span>
              <span className="block">mais tempo?</span>
            </h1>

            {/* Context Subtitle: Event/Task title in royal purple */}
            <p className={`text-xl sm:text-2xl font-bold tracking-tight mb-1 text-center mx-auto max-w-full truncate ${
              isDark ? 'text-purple-400' : 'text-[#6E4EFF]'
            }`}>
              {alarm.title}
            </p>

            {/* Context Metadata: "Evento • 19:30" (or contextual format) */}
            <p className={`text-sm sm:text-base font-semibold text-center mx-auto ${
              isDark ? 'text-purple-300/70' : 'text-[#6B6684]'
            }`}>
              {alarm.metadata && alarm.metadata.includes('•')
                ? alarm.metadata
                : (alarm.metadata || `Evento • ${alarm.durationOrTime || '19:30'}`)}
            </p>
          </div>

          {/* 4-Pill Vertical Stack */}
          <div className="w-full flex flex-col gap-3.5 mt-auto pb-2 max-w-md mx-auto">
            {/* Pill 1 (+5 min): Primary Royal Purple Gradient Pill */}
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                if (onSnooze) onSnooze(5);
                else setScreen('main');
              }}
              className="group relative w-full h-[58px] sm:h-[62px] rounded-full p-2 flex items-center justify-between transition-all duration-200 active:scale-[0.985] hover:scale-[1.01] cursor-pointer select-none bg-gradient-to-r from-[#4F17C5] to-[#2F0A9E] text-white shadow-lg shadow-purple-600/30 ring-1 ring-white/20"
            >
              <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs ml-1 transition-transform duration-200 group-hover:scale-105 active:scale-95">
                <Clock className="w-5 h-5 stroke-[2.4] text-[#4F17C5]" />
              </span>
              <span className="flex-1 text-center font-bold text-white text-lg sm:text-xl tracking-tight pr-12 drop-shadow-xs">
                +5 min
              </span>
            </button>

            {/* Pill 2 (+10 min): Outline Pill */}
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                if (onSnooze) onSnooze(10);
                else setScreen('main');
              }}
              className={`group relative w-full h-[58px] sm:h-[62px] rounded-full p-2 flex items-center justify-between border transition-all duration-150 active:scale-[0.985] cursor-pointer select-none ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/30 hover:bg-purple-950/50 text-purple-200'
                  : 'border-[#D6CEF1] bg-white/70 hover:bg-[#F5F2FC] text-[#4A2EB7]'
              }`}
            >
              <span className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border ml-1 ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/40'
                  : 'border-[#D6CEF1] bg-[#F7F5FC]'
              }`}>
                <Clock className={`w-5 h-5 stroke-[2.2] ${isDark ? 'text-purple-300' : 'text-[#4A2EB7]'}`} />
              </span>
              <span className="flex-1 text-center font-bold text-lg sm:text-xl tracking-tight pr-12">
                +10 min
              </span>
            </button>

            {/* Pill 3 (+15 min): Outline Pill */}
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                if (onSnooze) onSnooze(15);
                else setScreen('main');
              }}
              className={`group relative w-full h-[58px] sm:h-[62px] rounded-full p-2 flex items-center justify-between border transition-all duration-150 active:scale-[0.985] cursor-pointer select-none ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/30 hover:bg-purple-950/50 text-purple-200'
                  : 'border-[#D6CEF1] bg-white/70 hover:bg-[#F5F2FC] text-[#4A2EB7]'
              }`}
            >
              <span className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border ml-1 ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/40'
                  : 'border-[#D6CEF1] bg-[#F7F5FC]'
              }`}>
                <Clock className={`w-5 h-5 stroke-[2.2] ${isDark ? 'text-purple-300' : 'text-[#4A2EB7]'}`} />
              </span>
              <span className="flex-1 text-center font-bold text-lg sm:text-xl tracking-tight pr-12">
                +15 min
              </span>
            </button>

            {/* Pill 4 (Quando eu terminar a tarefa atual): Outline Pill */}
            <button
              type="button"
              aria-label="Quando terminar a tarefa atual"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                if (onSnooze) onSnooze('task_end');
                else setScreen('main');
              }}
              className={`group relative w-full min-h-[58px] sm:min-h-[62px] py-2 px-2 rounded-full flex items-center justify-between border transition-all duration-150 active:scale-[0.985] cursor-pointer select-none ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/30 hover:bg-purple-950/50 text-purple-200'
                  : 'border-[#D6CEF1] bg-white/70 hover:bg-[#F5F2FC] text-[#4A2EB7]'
              }`}
            >
              <span className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border ml-1 ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/40'
                  : 'border-[#D6CEF1] bg-[#F7F5FC]'
              }`}>
                <Clock className={`w-5 h-5 stroke-[2.2] ${isDark ? 'text-purple-300' : 'text-[#4A2EB7]'}`} />
              </span>
              <span className="flex-1 text-center font-bold text-sm sm:text-base leading-tight tracking-tight pr-12">
                <span className="block">Quando eu terminar</span>
                <span className="block">a tarefa atual</span>
              </span>
            </button>

            {/* Bottom Return Link: Plain Text "Voltar" */}
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                setScreen('main');
              }}
              className={`w-full py-2.5 px-4 font-semibold text-sm sm:text-base tracking-wide text-center cursor-pointer opacity-75 hover:opacity-100 hover:underline underline-offset-4 transition-all mt-1 ${
                isDark ? 'text-purple-300 hover:text-white' : 'text-[#6B6684] hover:text-[#110E2E]'
              }`}
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* SCREEN 2: DEDICATED ADHD SUPPORT SCREEN (05_nao_consegui_comecar.png) */}
      {activeScreen === 'difficulty' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-between w-full max-w-md mx-auto p-6 sm:p-8 animate-fade-in overflow-y-auto custom-scrollbar select-none">
          {/* Top Centered Information Stack (Anchored over Halo Center) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center w-full my-auto px-2">
            
            {/* Centered Pill Badge: Lock icon + BLOQUEIO */}
            <div className={`inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black tracking-wider mb-5 sm:mb-6 shadow-xs self-center mx-auto ${
              isDark 
                ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40' 
                : 'bg-white/80 text-[#4A2EB7] border border-[#D6CEF1]'
            }`}>
              <Lock className={`w-3.5 h-3.5 stroke-[2.2] ${isDark ? 'text-purple-300' : 'text-[#4A2EB7]'}`} />
              <span>BLOQUEIO</span>
            </div>

            {/* 2-line Centered Title: "O que está \n dificultando?" */}
            <h1 aria-label="O que está dificultando?" className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.08] text-[#110E2E] dark:text-white text-center mx-auto mb-2.5 sm:mb-3 drop-shadow-xs">
              <span className="block">O que está</span>
              <span className="block">dificultando?</span>
            </h1>

            {/* Task Subtitle: Task Title in Bold Dark Midnight */}
            <p className="text-xl sm:text-2xl font-bold tracking-tight mb-1 text-center mx-auto max-w-full truncate text-[#110E2E] dark:text-white">
              {alarm.title}
            </p>

            {/* Task Metadata: CheckSquare Icon + "Tarefa • 45 min" */}
            <div className={`inline-flex items-center justify-center gap-1.5 text-sm sm:text-base font-semibold text-center mx-auto ${
              isDark ? 'text-purple-300/70' : 'text-[#6B6684]'
            }`}>
              <CheckSquare className="w-4 h-4 stroke-[2.2] opacity-80" />
              <span>
                {alarm.metadata && alarm.metadata.includes('•')
                  ? alarm.metadata
                  : `Tarefa • ${alarm.durationOrTime || alarm.metadata || '45 min'}`}
              </span>
            </div>
          </div>

          {/* 4-Pill Vertical Stack */}
          <div className="w-full flex flex-col gap-3.5 mt-auto pb-2 max-w-md mx-auto">
            {/* Pill 1 ("Não sei por onde começar"): Primary Royal Purple Gradient Pill */}
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                if (onDifficulty) onDifficulty('no-start');
                else setScreen('main');
              }}
              className="group relative w-full h-[58px] sm:h-[62px] rounded-full p-2 flex items-center justify-between transition-all duration-200 active:scale-[0.985] hover:scale-[1.01] cursor-pointer select-none bg-gradient-to-r from-[#4F17C5] to-[#2F0A9E] text-white shadow-lg shadow-purple-600/30 ring-1 ring-white/20"
            >
              <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs ml-1 transition-transform duration-200 group-hover:scale-105 active:scale-95">
                <Compass className="w-5 h-5 stroke-[2.4] text-[#4F17C5]" />
              </span>
              <span className="flex-1 text-center font-bold text-white text-[15px] sm:text-base tracking-tight pr-12 truncate drop-shadow-xs">
                Não sei por onde começar
              </span>
            </button>

            {/* Pill 2 ("Estou terminando outra coisa"): Outline Pill */}
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                if (onDifficulty) onDifficulty('finishing-other');
                else setScreen('main');
              }}
              className={`group relative w-full h-[58px] sm:h-[62px] rounded-full p-2 flex items-center justify-between border transition-all duration-150 active:scale-[0.985] cursor-pointer select-none ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/30 hover:bg-purple-950/50 text-purple-200'
                  : 'border-[#D6CEF1] bg-white/70 hover:bg-[#F5F2FC] text-[#2B2353]'
              }`}
            >
              <span className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border ml-1 ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/40'
                  : 'border-[#D6CEF1] bg-[#F7F5FC]'
              }`}>
                <RotateCcw className={`w-5 h-5 stroke-[2.2] ${isDark ? 'text-purple-300' : 'text-[#4A2EB7]'}`} />
              </span>
              <span className="flex-1 text-center font-bold text-[15px] sm:text-base tracking-tight pr-12 truncate">
                Estou terminando outra coisa
              </span>
            </button>

            {/* Pill 3 ("Estou cansado"): Outline Pill */}
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                if (onDifficulty) onDifficulty('tired');
                else setScreen('main');
              }}
              className={`group relative w-full h-[58px] sm:h-[62px] rounded-full p-2 flex items-center justify-between border transition-all duration-150 active:scale-[0.985] cursor-pointer select-none ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/30 hover:bg-purple-950/50 text-purple-200'
                  : 'border-[#D6CEF1] bg-white/70 hover:bg-[#F5F2FC] text-[#2B2353]'
              }`}
            >
              <span className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border ml-1 ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/40'
                  : 'border-[#D6CEF1] bg-[#F7F5FC]'
              }`}>
                <BatteryLow className={`w-5 h-5 stroke-[2.2] ${isDark ? 'text-purple-300' : 'text-[#4A2EB7]'}`} />
              </span>
              <span className="flex-1 text-center font-bold text-[15px] sm:text-base tracking-tight pr-12 truncate">
                Estou cansado
              </span>
            </button>

            {/* Pill 4 ("Me distraí"): Outline Pill */}
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                if (onDifficulty) onDifficulty('distracted');
                else setScreen('main');
              }}
              className={`group relative w-full h-[58px] sm:h-[62px] rounded-full p-2 flex items-center justify-between border transition-all duration-150 active:scale-[0.985] cursor-pointer select-none ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/30 hover:bg-purple-950/50 text-purple-200'
                  : 'border-[#D6CEF1] bg-white/70 hover:bg-[#F5F2FC] text-[#2B2353]'
              }`}
            >
              <span className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 border ml-1 ${
                isDark
                  ? 'border-purple-800/50 bg-purple-950/40'
                  : 'border-[#D6CEF1] bg-[#F7F5FC]'
              }`}>
                <Sparkles className={`w-5 h-5 stroke-[2.2] ${isDark ? 'text-purple-300' : 'text-[#4A2EB7]'}`} />
              </span>
              <span className="flex-1 text-center font-bold text-[15px] sm:text-base tracking-tight pr-12 truncate">
                Me distraí
              </span>
            </button>

            {/* Bottom Return Link: Plain Text "Voltar" */}
            <button
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                setScreen('main');
              }}
              className={`w-full py-2.5 px-4 font-semibold text-sm sm:text-base tracking-wide text-center cursor-pointer opacity-75 hover:opacity-100 hover:underline underline-offset-4 transition-all mt-1 ${
                isDark ? 'text-purple-300 hover:text-white' : 'text-[#6B6684] hover:text-[#110E2E]'
              }`}
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {activeScreen === 'main' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-between w-full max-w-md mx-auto p-6 sm:p-8 animate-fade-in overflow-hidden">
          
          {/* Centered Top Information Stack (Anchored over Halo Center ~41%) */}
          <div className="flex-1 flex flex-col items-center justify-center text-center w-full my-auto px-2">
            
            {/* Centered Pill Badge */}
            <div className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black tracking-wider mb-5 sm:mb-6 shadow-xs self-center mx-auto ${badgeClass}`}>
              {isWake && <Sun className="w-3.5 h-3.5 text-amber-500" />}
              {isSleep && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              {isMed && <Pill className="w-3.5 h-3.5 text-rose-500" />}
              {isCritical && <Bell className="w-3.5 h-3.5 text-rose-600" />}
              {isTask && !isCritical && <Zap className="w-3.5 h-3.5 text-[#4338CA]" />}
              {!isWake && !isSleep && !isMed && !isCritical && !isTask && (
                <Bell className="w-3.5 h-3.5 text-[#4338CA]" />
              )}
              <span>{badgeText}</span>
            </div>

            {/* ExtraBold/Black Title with Responsive Scaling and Tight Leading */}
            <h1 className={`${getTitleSizeClass(alarm.title)} font-black tracking-tight text-center mx-auto max-w-full break-words mb-2.5 sm:mb-3 drop-shadow-xs`}>
              {alarm.title}
            </h1>

            {/* Proportional Geometric Sans-serif Time/Duration Numerals (NO font-mono!) */}
            {alarm.durationOrTime && (
              <h2 className={`text-4xl sm:text-5xl font-black tracking-tight text-center mx-auto mb-3 sm:mb-4 select-text ${timeColorClass}`}>
                {alarm.durationOrTime}
              </h2>
            )}

            {/* Discreet Centered Metadata with Context Icon */}
            {alarm.metadata && (
              <div className={`inline-flex items-center justify-center gap-1.5 text-xs sm:text-sm font-semibold opacity-75 text-center mx-auto max-w-full ${metadataColorClass}`}>
                {isTask || alarm.metadata.startsWith('Tarefa') ? (
                  <CheckSquare className="w-4 h-4 shrink-0 opacity-80" />
                ) : (
                  <Calendar className="w-4 h-4 shrink-0 opacity-80" />
                )}
                <span className="truncate">{alarm.metadata}</span>
              </div>
            )}

          </div>

          {/* Bottom Action Stack: Symmetrical Centered Column */}
          <div className="w-full flex flex-col items-center gap-3 mt-auto pb-2 sm:pb-4 max-w-md mx-auto">
            {/* 1. Signature Compound Primary CTA Pill */}
            {alarm.visual === 'gamified' && gamifiedProgress < 100 ? (
              <button
                type="button"
                onClick={() => {
                  if (!interactive) return;
                  audio.playClick();
                  const next = gamifiedProgress + 50;
                  setGamifiedProgress(next);
                  if (next >= 100) {
                    setTimeout(() => {
                      if (onPrimaryAction) onPrimaryAction();
                      setGamifiedProgress(0);
                    }, 200);
                  }
                }}
                className="group relative w-full h-16 sm:h-[66px] rounded-full p-2 flex items-center justify-between transition-all duration-200 active:scale-[0.98] hover:scale-[1.01] cursor-pointer select-none"
                style={primaryCtaStyle}
              >
                <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 active:scale-95">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
                </span>
                <span className="flex-1 text-center font-bold text-white text-[16px] sm:text-[17px] tracking-tight pr-12 drop-shadow-xs truncate">
                  Toque 2x para Despertar ({gamifiedProgress / 50}/2)
                </span>
              </button>
            ) : (
              <button 
                type="button"
                onClick={() => {
                  if (!interactive) return;
                  audio.playClick();
                  if (onPrimaryAction) onPrimaryAction();
                }}
                className="group relative w-full h-16 sm:h-[66px] rounded-full p-2 flex items-center justify-between transition-all duration-200 active:scale-[0.98] hover:scale-[1.01] cursor-pointer select-none"
                style={primaryCtaStyle}
              >
                <span className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 active:scale-95">
                  <ArrowRight className={`w-5 h-5 stroke-[2.75] ${primaryIconColor}`} />
                </span>
                <span className="flex-1 text-center font-bold text-white text-[16px] sm:text-[17px] tracking-tight pr-12 drop-shadow-xs truncate">
                  {ctaText}
                </span>
              </button>
            )}

            {/* 2. Secondary Action Button ("+5 min" Outline Pill) */}
            <button 
              type="button"
              onClick={() => {
                if (!interactive) return;
                audio.playClick();
                setScreen('snooze');
              }}
              className={`w-full h-[54px] sm:h-[56px] rounded-full font-bold text-[15px] sm:text-base tracking-wide transition-all duration-150 active:scale-[0.985] flex items-center justify-center gap-2 cursor-pointer select-none ${secondaryBtnClass}`}
              style={secondaryBtnStyle}
            >
              <Clock className={`w-[18px] h-[18px] stroke-[2.2] ${secondaryIconColor}`} />
              <span>{secondaryText}</span>
            </button>

            {/* 3. Tertiary Action Button(s) (Clean Plain Text Link) */}
            {isTask ? (
              <div className="flex flex-col items-center gap-1.5 w-full mt-0.5">
                <button 
                  type="button"
                  onClick={() => {
                    if (!interactive) return;
                    audio.playClick();
                    if (onDismiss) onDismiss();
                  }}
                  className={`w-full py-2 px-4 font-semibold text-sm tracking-wide text-center opacity-80 hover:opacity-100 hover:underline underline-offset-4 transition-all cursor-pointer ${tertiaryBtnClass}`}
                >
                  {tertiaryText}
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    if (!interactive) return;
                    audio.playClick();
                    setScreen('difficulty');
                  }}
                  className={`w-full py-1.5 px-4 font-medium text-xs tracking-wide text-center opacity-65 hover:opacity-95 hover:underline underline-offset-4 transition-all cursor-pointer ${tertiaryBtnClass}`}
                >
                  Não consigo começar
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => {
                  if (!interactive) return;
                  audio.playClick();
                  if (onDismiss) onDismiss();
                }}
                className={`w-full py-2.5 px-4 font-semibold text-sm tracking-wide text-center opacity-75 hover:opacity-100 hover:underline underline-offset-4 transition-all cursor-pointer mt-0.5 ${tertiaryBtnClass}`}
              >
                {tertiaryText}
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
