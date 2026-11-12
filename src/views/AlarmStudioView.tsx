import React, { useState } from 'react';
import type { ActiveAlarm } from '../contexts/AlarmManagerContext';
import { useAlarmManager } from '../contexts/AlarmManagerContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { AlarmVisualDisplay } from '../components/AlarmVisualDisplay';
import { audio } from '../utils/audio';
import { 
  Smartphone, 
  Maximize2, 
  Minimize2, 
  Volume2, 
  VolumeX, 
  Moon, 
  Sun, 
  Sparkles, 
  Layers, 
  Play, 
  RotateCcw, 
  Eye, 
  Check, 
  Split, 
  Zap, 
  Calendar as CalendarIcon, 
  Pill, 
  AlertTriangle,
  ArrowLeft,
  Sliders,
  Info,
  Clock,
  Lock,
  Bell
} from 'lucide-react';

interface AlarmStudioPreset {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  alarm: ActiveAlarm;
  referenceImage?: string;
  referenceTitle?: string;
  defaultScreen?: 'main' | 'snooze' | 'difficulty';
}

const PRESETS: AlarmStudioPreset[] = [
  // State 00: Base Canonical Reference
  {
    id: '00-base',
    name: '00 · Referência Visual Base',
    category: 'Conceito Oficial',
    icon: Bell,
    referenceImage: '/alarm-references/00_referencia_visual_aprovada.png',
    referenceTitle: '00 · Referência Visual Base Aprovada',
    defaultScreen: 'main',
    alarm: {
      id: 'preset-canonical-00',
      type: 'event',
      intent: 'pre-event',
      title: 'Jantar com Maria',
      durationOrTime: '19:30',
      metadata: 'Evento · Google Agenda',
      badge: 'EM 15 MIN',
      ctaText: 'Vou me preparar agora',
      sound: 'gentle',
      visual: 'minimal',
    }
  },
  // State 01: Tarefa - Começa agora
  {
    id: '01-task-now',
    name: '01 · Tarefa (Começa agora)',
    category: 'Conceito Oficial',
    icon: Zap,
    referenceImage: '/alarm-references/01_alarme_tarefa_comeca_agora.png',
    referenceTitle: '01 · Tarefa Começa Agora',
    defaultScreen: 'main',
    alarm: {
      id: 'preset-canonical-01',
      type: 'task',
      intent: 'task-now',
      title: 'Editar vídeo',
      durationOrTime: '45 min',
      metadata: 'Tarefa · Projeto Trabalho',
      badge: 'AGORA',
      ctaText: 'Começar foco agora',
      sound: 'chime',
      visual: 'minimal',
    }
  },
  // State 02: Pré-evento 15 min
  {
    id: '02-pre-event',
    name: '02 · Pré-evento (15 min antes)',
    category: 'Conceito Oficial',
    icon: CalendarIcon,
    referenceImage: '/alarm-references/02_pre_evento_15min.png',
    referenceTitle: '02 · Pré-Evento (15 min antes)',
    defaultScreen: 'main',
    alarm: {
      id: 'preset-canonical-02',
      type: 'event',
      intent: 'pre-event',
      title: 'Jantar com Maria',
      durationOrTime: '19:30',
      metadata: 'Evento · Google Agenda',
      badge: 'EM 15 MIN',
      ctaText: 'Vou me preparar agora',
      sound: 'gentle',
      visual: 'minimal',
    }
  },
  // State 03: Alarme Crítico - Urgente
  {
    id: '03-critical',
    name: '03 · Alarme Crítico (Urgente)',
    category: 'Conceito Oficial',
    icon: AlertTriangle,
    referenceImage: '/alarm-references/03_alarme_critico.png',
    referenceTitle: '03 · Alarme Crítico (Urgente)',
    defaultScreen: 'main',
    alarm: {
      id: 'preset-canonical-03',
      type: 'event',
      intent: 'critical',
      title: 'Consulta médica',
      durationOrTime: '14:30',
      metadata: 'Evento · Google Agenda',
      badge: 'URGENTE',
      ctaText: 'Estou saindo agora',
      sound: 'radar',
      visual: 'minimal',
    }
  },
  // State 04: Tela de Adiar / Snooze
  {
    id: '04-snooze',
    name: '04 · Tela de Adiar (Snooze)',
    category: 'Conceito Oficial',
    icon: Clock,
    referenceImage: '/alarm-references/04_snooze_adiar.png',
    referenceTitle: '04 · Tela de Adiar / Snooze',
    defaultScreen: 'snooze',
    alarm: {
      id: 'preset-canonical-04',
      type: 'event',
      intent: 'pre-event',
      title: 'Jantar com Maria',
      durationOrTime: '19:30',
      metadata: 'Evento • 19:30',
      badge: 'ADIAR',
      ctaText: 'Vou me preparar agora',
      sound: 'gentle',
      visual: 'minimal',
    }
  },
  // State 05: Tela de Apoio TDAH / Bloqueio
  {
    id: '05-adhd',
    name: '05 · Apoio TDAH (Bloqueio)',
    category: 'Conceito Oficial',
    icon: Lock,
    referenceImage: '/alarm-references/05_nao_consegui_comecar.png',
    referenceTitle: '05 · Apoio TDAH (Bloqueio)',
    defaultScreen: 'difficulty',
    alarm: {
      id: 'preset-canonical-05',
      type: 'task',
      intent: 'task-now',
      title: 'Editar vídeo',
      durationOrTime: '45 min',
      metadata: 'Tarefa • 45 min',
      badge: 'BLOQUEIO',
      ctaText: 'Começar foco agora',
      sound: 'chime',
      visual: 'minimal',
    }
  },
  // Outros Cenários do App
  {
    id: 'medication',
    name: 'Medicamento (Venvanse)',
    category: 'Rotina & Saúde',
    icon: Pill,
    referenceImage: '/alarm-references/00_referencia_visual_aprovada.png',
    referenceTitle: 'Rotina de Saúde',
    defaultScreen: 'main',
    alarm: {
      id: 'preset-med',
      type: 'medication',
      intent: 'task-now',
      title: 'Venvanse 50mg',
      durationOrTime: '08:00',
      metadata: 'Tomar com água após o café da manhã',
      badge: '💊 MEDICAMENTO',
      ctaText: 'Tomar agora',
      sound: 'chime',
      visual: 'minimal',
    }
  },
  {
    id: 'sleep',
    name: 'Hora de Dormir',
    category: 'Rotina & Saúde',
    icon: Moon,
    referenceImage: '/alarm-references/00_referencia_visual_aprovada.png',
    referenceTitle: 'Rotina Noturna',
    defaultScreen: 'main',
    alarm: {
      id: 'preset-sleep',
      type: 'sleep',
      intent: 'pre-event',
      title: 'Hora de desacelerar',
      durationOrTime: '23:00',
      metadata: 'Rotina Noturna • Modo Descanso',
      badge: '🌙 HORA DE DORMIR',
      ctaText: 'Vou me preparar agora',
      sound: 'gentle',
      visual: 'minimal',
    }
  },
  {
    id: 'wake',
    name: 'Hora de Acordar',
    category: 'Rotina & Saúde',
    icon: Sun,
    referenceImage: '/alarm-references/00_referencia_visual_aprovada.png',
    referenceTitle: 'Despertador Matinal',
    defaultScreen: 'main',
    alarm: {
      id: 'preset-wake',
      type: 'wake',
      intent: 'pre-event',
      title: 'Bom dia! Começar o dia',
      durationOrTime: '07:00',
      metadata: 'Despertador TimeNest',
      badge: '☀️ HORA DE ACORDAR',
      ctaText: 'Acordei! Iniciar dia',
      sound: 'chime',
      visual: 'minimal',
    }
  },
  {
    id: 'gamified',
    name: 'Modo Desafio (Gamificado)',
    category: 'Interativo',
    icon: Sparkles,
    referenceImage: '/alarm-references/00_referencia_visual_aprovada.png',
    referenceTitle: 'Desafio Anti-Procrastinação',
    defaultScreen: 'main',
    alarm: {
      id: 'preset-gamified',
      type: 'wake',
      intent: 'task-now',
      title: 'Despertar com Foco',
      durationOrTime: '06:30',
      metadata: 'Desafio Anti-Procrastinação',
      badge: 'DESAFIO',
      ctaText: 'Completar',
      sound: 'radar',
      visual: 'gamified',
    }
  }
];

interface AlarmStudioViewProps {
  onClose?: () => void;
}

export const AlarmStudioView: React.FC<AlarmStudioViewProps> = ({ onClose }) => {
  const { triggerAlarmImmediate } = useAlarmManager();
  const { theme: appTheme, isLowStimulation: appLowStim } = usePreferences();

  // State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('00-base');
  const [currentAlarm, setCurrentAlarm] = useState<ActiveAlarm>(PRESETS[0].alarm);
  const [screen, setScreen] = useState<'main' | 'snooze' | 'difficulty'>('main');
  const [theme, setTheme] = useState<'light' | 'dark'>(appTheme === 'dark' ? 'dark' : 'light');
  const [isLowStimulation, setIsLowStimulation] = useState<boolean>(appLowStim);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [deviceModel, setDeviceModel] = useState<'iphone' | 'android' | 'compact'>('iphone');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'customize' | 'screens' | 'reference'>('presets');
  const [lastActionLog, setLastActionLog] = useState<string>('');

  const activePreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];

  // Dynamic reference image synchronization based on active screen and preset
  const activeReference = React.useMemo(() => {
    if (screen === 'snooze') {
      return {
        src: '/alarm-references/04_snooze_adiar.png',
        code: '04_snooze_adiar.png',
        title: '04 · Tela de Adiar / Snooze',
        label: 'Referência Aprovada — Adiar',
      };
    }
    if (screen === 'difficulty') {
      return {
        src: '/alarm-references/05_nao_consegui_comecar.png',
        code: '05_nao_consegui_comecar.png',
        title: '05 · Apoio TDAH (Bloqueio)',
        label: 'Referência Aprovada — Apoio TDAH',
      };
    }
    return {
      src: activePreset.referenceImage || '/alarm-references/00_referencia_visual_aprovada.png',
      code: activePreset.referenceImage?.split('/').pop() || '00_referencia_visual_aprovada.png',
      title: activePreset.referenceTitle || activePreset.name,
      label: activePreset.id.startsWith('0') ? activePreset.name.split('·')[0].trim() : 'Referência Oficial',
    };
  }, [screen, activePreset]);

  // Change preset
  const handleSelectPreset = (preset: AlarmStudioPreset) => {
    setSelectedPresetId(preset.id);
    setCurrentAlarm({ ...preset.alarm });
    setScreen(preset.defaultScreen || 'main');
    logAction(`Cenário alterado para: ${preset.name}`);
  };

  const logAction = (msg: string) => {
    setLastActionLog(msg);
  };

  // Trigger sound if enabled
  const handlePreviewSound = (soundType: any, isCritical = false) => {
    audio.playAlarm(soundType, isCritical);
    setTimeout(() => audio.stopAlarm(), 3000);
  };

  // Dimensions based on device model
  const deviceDimensions = {
    iphone: { width: '380px', height: '780px', radius: 'rounded-[48px]' },
    android: { width: '400px', height: '820px', radius: 'rounded-[38px]' },
    compact: { width: '340px', height: '700px', radius: 'rounded-[32px]' },
  }[deviceModel];

  // Fullscreen escape handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className="fixed inset-0 z-[200] bg-[#0E0C15] text-[#ECE8F5] flex flex-col font-sans select-none overflow-hidden">
      
      {/* Top Studio Bar */}
      <header className="h-14 border-b border-white/10 bg-[#151221] px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-md z-30">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={() => { audio.playClick(); onClose(); }}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar ao App</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand-500 to-purple-400 flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white">TimeNest Alarm Studio</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  Web Tester
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Theme switcher */}
          <button
            onClick={() => {
              audio.playClick();
              setTheme(t => (t === 'light' ? 'dark' : 'light'));
            }}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/5"
            title="Alternar entre visual Claro e Escuro"
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-purple-300" /> : <Sun className="w-3.5 h-3.5 text-amber-300" />}
            <span className="hidden md:inline">{theme === 'dark' ? 'Tema Escuro' : 'Tema Claro'}</span>
          </button>

          {/* Low Stimulation */}
          <button
            onClick={() => {
              audio.playClick();
              setIsLowStimulation(v => !v);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              isLowStimulation 
                ? 'bg-purple-950/70 border-purple-500/50 text-purple-200' 
                : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/70'
            }`}
            title="Ativar/desativar modo baixo estímulo (sem halos animados)"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Baixo Estímulo</span>
          </button>

          {/* Sound Preview toggle */}
          <button
            onClick={() => {
              audio.playClick();
              setSoundEnabled(s => !s);
            }}
            className={`p-1.5 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              soundEnabled 
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300' 
                : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/70'
            }`}
            title="Ativar som ao interagir com alarme"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{soundEnabled ? 'Som Ativo' : 'Mudo'}</span>
          </button>

          {/* Split Screen / Side-by-Side Comparison Toggle */}
          <button
            onClick={() => {
              audio.playClick();
              setShowComparison(c => !c);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showComparison 
                ? 'bg-brand-950/80 border-brand-500/60 text-brand-300 shadow-[0_0_12px_rgba(110,78,255,0.25)]' 
                : 'bg-white/5 hover:bg-white/10 border-white/5 text-white/70'
            }`}
            title="Alternar Comparação Lado a Lado com Arte Conceitual Aprovada"
          >
            <Split className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lado a Lado</span>
          </button>

          {/* Test in Real App */}
          <button
            onClick={() => {
              audio.playClick();
              triggerAlarmImmediate(currentAlarm);
              logAction('Alarme real disparado na aplicação!');
            }}
            className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_2px_10px_rgba(110,78,255,0.3)] cursor-pointer active:scale-95"
            title="Dispara o alarme real na aplicação com o overlay ativo"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Disparar no App</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={() => {
              audio.playClick();
              setIsFullscreen(f => !f);
            }}
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-white/5"
            title="Alternar tela cheia"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Controls & Tabs (hidden when in fullscreen) */}
        {!isFullscreen && (
          <aside className="w-80 md:w-96 bg-[#120F1D] border-r border-white/10 flex flex-col shrink-0 z-20 overflow-hidden shadow-xl">
            
            {/* Tabs Header */}
            <div className="flex border-b border-white/10 bg-[#0E0C16] p-1 gap-1 shrink-0">
              <button
                onClick={() => { audio.playClick(); setActiveTab('presets'); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'presets' ? 'bg-brand-600 text-white shadow-xs' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cenários</span>
              </button>

              <button
                onClick={() => { audio.playClick(); setActiveTab('screens'); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'screens' ? 'bg-brand-600 text-white shadow-xs' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Telas</span>
              </button>

              <button
                onClick={() => { audio.playClick(); setActiveTab('customize'); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'customize' ? 'bg-brand-600 text-white shadow-xs' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>

              <button
                onClick={() => { audio.playClick(); setActiveTab('reference'); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'reference' ? 'bg-brand-600 text-white shadow-xs' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>Specs</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
              
              {/* TAB 1: PRESETS */}
              {activeTab === 'presets' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Cenários Canônicos (00-05)</span>
                    <span className="text-[10px] text-brand-400 font-bold">6 Aprovados</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {PRESETS.slice(0, 6).map((preset) => {
                      const Icon = preset.icon;
                      const isSelected = preset.id === selectedPresetId;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            audio.playClick();
                            handleSelectPreset(preset);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-600/20 border-brand-500 text-white ring-1 ring-brand-500/50 shadow-md' 
                              : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/10'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/60'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 uppercase">
                                {preset.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/60 mt-0.5 truncate">
                              "{preset.alarm.title}" • {preset.alarm.durationOrTime}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-brand-300 border border-white/5">
                                {preset.alarm.badge}
                              </span>
                              <span className="text-[9px] text-white/40 truncate">
                                CTA: {preset.alarm.ctaText}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Outros Cenários do App</span>
                    <span className="text-[10px] text-white/40 font-bold">{PRESETS.length - 6} presets</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {PRESETS.slice(6).map((preset) => {
                      const Icon = preset.icon;
                      const isSelected = preset.id === selectedPresetId;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => {
                            audio.playClick();
                            handleSelectPreset(preset);
                          }}
                          className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                            isSelected 
                              ? 'bg-brand-600/20 border-brand-500 text-white ring-1 ring-brand-500/50 shadow-md' 
                              : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/10'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/60'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-white truncate">{preset.name}</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/60 uppercase">
                                {preset.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/60 mt-0.5 truncate">
                              "{preset.alarm.title}" • {preset.alarm.durationOrTime}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-brand-300 border border-white/5">
                                {preset.alarm.badge}
                              </span>
                              <span className="text-[9px] text-white/40 truncate">
                                CTA: {preset.alarm.ctaText}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: SCREENS */}
              {activeTab === 'screens' && (
                <div className="flex flex-col gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Telas do Fluxo de Alarme</span>
                    <p className="text-[11px] text-white/60 mt-1">
                      O alarme no TimeNest é composto por 3 telas modais que evitam sobrecarga cognitiva.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { audio.playClick(); setScreen('main'); }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        screen === 'main'
                          ? 'bg-brand-600/20 border-brand-500 text-white ring-1 ring-brand-500/50'
                          : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full ${screen === 'main' ? 'bg-brand-400' : 'bg-white/20'}`} />
                        <div>
                          <p className="text-xs font-bold text-white">1. Tela Principal (Alarme)</p>
                          <p className="text-[10px] text-white/60">Halos pulsantes, badge, título e CTAs</p>
                        </div>
                      </div>
                      {screen === 'main' && <Check className="w-4 h-4 text-brand-400" />}
                    </button>

                    <button
                      onClick={() => { audio.playClick(); setScreen('snooze'); }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        screen === 'snooze'
                          ? 'bg-brand-600/20 border-brand-500 text-white ring-1 ring-brand-500/50'
                          : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full ${screen === 'snooze' ? 'bg-brand-400' : 'bg-white/20'}`} />
                        <div>
                          <p className="text-xs font-bold text-white">2. Tela de Adiar (Snooze)</p>
                          <p className="text-[10px] text-white/60">+5 min, +10 min, fim da tarefa</p>
                        </div>
                      </div>
                      {screen === 'snooze' && <Check className="w-4 h-4 text-brand-400" />}
                    </button>

                    <button
                      onClick={() => { audio.playClick(); setScreen('difficulty'); }}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        screen === 'difficulty'
                          ? 'bg-brand-600/20 border-brand-500 text-white ring-1 ring-brand-500/50'
                          : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-3 h-3 rounded-full ${screen === 'difficulty' ? 'bg-brand-400' : 'bg-white/20'}`} />
                        <div>
                          <p className="text-xs font-bold text-white">3. Apoio TDAH (Não consigo começar)</p>
                          <p className="text-[10px] text-white/60">Opções com micro-passos e descompressão</p>
                        </div>
                      </div>
                      {screen === 'difficulty' && <Check className="w-4 h-4 text-brand-400" />}
                    </button>
                  </div>

                  {/* Audio Sounds Test */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Testar Sons do Sistema</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'chime', label: 'Chime Padrão' },
                        { id: 'gentle', label: 'Gentle (Suave)' },
                        { id: 'radar', label: 'Radar (Urgência)' },
                        { id: 'rain', label: 'Chuva' },
                        { id: 'forest', label: 'Floresta' },
                        { id: 'waves', label: 'Ondas' },
                      ].map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            audio.playClick();
                            handlePreviewSound(s.id);
                          }}
                          className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] font-bold text-white/80 hover:text-white flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <span>{s.label}</span>
                          <Volume2 className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CUSTOMIZE */}
              {activeTab === 'customize' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Editor em Tempo Real</span>
                    <button
                      onClick={() => {
                        audio.playClick();
                        setCurrentAlarm({ ...activePreset.alarm });
                      }}
                      className="text-[10px] text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restaurar Preset</span>
                    </button>
                  </div>

                  {/* Title */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-white/70">Título do Alarme</label>
                    <input
                      type="text"
                      value={currentAlarm.title}
                      onChange={(e) => setCurrentAlarm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Duration or Time */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-white/70">Horário ou Duração</label>
                    <input
                      type="text"
                      value={currentAlarm.durationOrTime || ''}
                      onChange={(e) => setCurrentAlarm(prev => ({ ...prev, durationOrTime: e.target.value }))}
                      placeholder="Ex: 19:30 ou 45 min"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-brand-500 font-mono"
                    />
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-white/70">Metadado Discreto</label>
                    <input
                      type="text"
                      value={currentAlarm.metadata || ''}
                      onChange={(e) => setCurrentAlarm(prev => ({ ...prev, metadata: e.target.value }))}
                      placeholder="Ex: Evento · Google Agenda"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Badge Text */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-white/70">Badge Superior</label>
                    <input
                      type="text"
                      value={currentAlarm.badge || ''}
                      onChange={(e) => setCurrentAlarm(prev => ({ ...prev, badge: e.target.value }))}
                      placeholder="Ex: AGORA, URGENTE, EM 15 MIN"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-brand-500 font-mono uppercase"
                    />
                  </div>

                  {/* CTA Text */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-white/70">Texto do Botão Principal (CTA)</label>
                    <input
                      type="text"
                      value={currentAlarm.ctaText || ''}
                      onChange={(e) => setCurrentAlarm(prev => ({ ...prev, ctaText: e.target.value }))}
                      placeholder="Ex: Começar foco agora"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Type / Intent */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-white/70">Tipo de Alarme</label>
                      <select
                        value={currentAlarm.type}
                        onChange={(e) => setCurrentAlarm(prev => ({ ...prev, type: e.target.value as any }))}
                        className="w-full px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                      >
                        <option value="event" className="bg-[#120F1D]">Evento</option>
                        <option value="task" className="bg-[#120F1D]">Tarefa</option>
                        <option value="medication" className="bg-[#120F1D]">Medicamento</option>
                        <option value="sleep" className="bg-[#120F1D]">Sono</option>
                        <option value="wake" className="bg-[#120F1D]">Acordar</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-white/70">Nível / Intent</label>
                      <select
                        value={currentAlarm.intent}
                        onChange={(e) => setCurrentAlarm(prev => ({ ...prev, intent: e.target.value as any }))}
                        className="w-full px-2.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-brand-500"
                      >
                        <option value="pre-event" className="bg-[#120F1D]">Pré-Evento</option>
                        <option value="task-now" className="bg-[#120F1D]">Começa Agora</option>
                        <option value="critical" className="bg-[#120F1D]">Crítico / Urgente</option>
                      </select>
                    </div>
                  </div>

                  {/* Visual Style: Minimal vs Gamified */}
                  <div className="flex flex-col gap-1 pt-1">
                    <label className="text-[11px] font-bold text-white/70">Modo de Desativação</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentAlarm(prev => ({ ...prev, visual: 'minimal' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          currentAlarm.visual === 'minimal'
                            ? 'bg-brand-600/30 border-brand-500 text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        Padrão (1 toque)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentAlarm(prev => ({ ...prev, visual: 'gamified' }))}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                          currentAlarm.visual === 'gamified'
                            ? 'bg-brand-600/30 border-brand-500 text-white'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        Desafio (2 toques)
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: REFERENCE & SPECS */}
              {activeTab === 'reference' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Diretrizes do TimeNest</span>
                    <button
                      onClick={() => setShowComparison(v => !v)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                        showComparison 
                          ? 'bg-brand-600 border-brand-400 text-white' 
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <Split className="w-3 h-3" />
                      <span>{showComparison ? 'Ocultar Split' : 'Comparar Lado a Lado'}</span>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 text-xs flex flex-col gap-2 leading-relaxed">
                    <div className="flex items-center gap-1.5 text-brand-300 font-bold">
                      <Info className="w-4 h-4" />
                      <span>Princípios de UX Aprovados</span>
                    </div>
                    <ul className="list-disc list-inside text-white/75 flex flex-col gap-1 text-[11px]">
                      <li><strong className="text-white">Tela cheia sem ruído:</strong> Sem navbar, timeline ou poluição visual.</li>
                      <li><strong className="text-white">Hierarquia imediata:</strong> Título grande + horário em destaque.</li>
                      <li><strong className="text-white">Ação contextual:</strong> Em vez de "Parar Alarme", usa "Vou me preparar agora", "Começar foco agora".</li>
                      <li><strong className="text-white">Halos suaves em lavanda:</strong> Movimento respiratório relaxante que não induz pânico.</li>
                      <li><strong className="text-white">Vermelho restrito:</strong> Apenas em alarmes marcados como "Crítico/Urgente".</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white/50">Imagens Aprovadas de Referência</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { title: 'Visão Geral', file: '00_referencia_visual_aprovada.png' },
                        { title: 'Tarefa Agora', file: '01_alarme_tarefa_comeca_agora.png' },
                        { title: 'Pré-Evento 15m', file: '02_pre_evento_15min.png' },
                        { title: 'Crítico / Urgente', file: '03_alarme_critico.png' },
                        { title: 'Tela Adiar', file: '04_snooze_adiar.png' },
                        { title: 'Apoio TDAH', file: '05_nao_consegui_comecar.png' },
                      ].map(img => (
                        <a
                          key={img.file}
                          href={`/alarm-references/${img.file}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-bold text-white/80 hover:text-white flex flex-col gap-1 cursor-pointer transition-colors"
                        >
                          <img 
                            src={`/alarm-references/${img.file}`} 
                            alt={img.title} 
                            className="w-full h-20 object-cover rounded-lg border border-white/10" 
                          />
                          <span className="truncate">{img.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Info Bar of Sidebar */}
            <div className="p-3 border-t border-white/10 bg-[#0E0C16] text-[10px] text-white/50 flex items-center justify-between">
              <span>{lastActionLog || 'Pronto para testar'}</span>
              <span className="font-mono text-brand-400">TimeNest v3.1</span>
            </div>
          </aside>
        )}

        {/* Center Workbench Canvas */}
        <main className="flex-1 bg-[#0A0910] relative flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto overflow-x-hidden">
          
          {/* Subtle Grid Background Pattern */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Model Switcher Bar (only when not fullscreen) */}
          {!isFullscreen && (
            <div className="mb-4 z-10 flex items-center gap-2 bg-[#181528]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Moldura:</span>
              <button
                onClick={() => { audio.playClick(); setDeviceModel('iphone'); }}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  deviceModel === 'iphone' ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                iPhone 15
              </button>
              <button
                onClick={() => { audio.playClick(); setDeviceModel('android'); }}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  deviceModel === 'android' ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                Galaxy S24
              </button>
              <button
                onClick={() => { audio.playClick(); setDeviceModel('compact'); }}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  deviceModel === 'compact' ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                Compacto
              </button>
            </div>
          )}

          {/* Container: Single Phone or Split Comparison */}
          <div className={`relative z-10 flex items-center justify-center gap-8 ${
            isFullscreen ? 'w-full h-full' : 'max-w-full'
          }`}>
            
            {/* The Live Interactive Phone Mockup */}
            <div
              className={`transition-all duration-300 relative flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-4 border-[#2D293E] overflow-hidden ${
                isFullscreen 
                  ? 'w-full h-full rounded-none border-none' 
                  : `${deviceDimensions.radius}`
              }`}
              style={{
                width: isFullscreen ? '100%' : deviceDimensions.width,
                height: isFullscreen ? '100%' : deviceDimensions.height,
              }}
            >
              
              {/* Phone Dynamic Island / Notch (mockup only) */}
              {!isFullscreen && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[600] w-24 h-5 bg-black rounded-full flex items-center justify-center pointer-events-none shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#111] mr-3" />
                  <div className="w-2 h-2 rounded-full bg-[#182035]" />
                </div>
              )}

              {/* Status Bar simulation (mockup only) */}
              {!isFullscreen && (
                <div className="absolute top-2 left-0 right-0 z-[550] px-7 flex items-center justify-between text-[11px] font-bold text-white/50 pointer-events-none">
                  <span>{currentAlarm.durationOrTime?.includes(':') ? currentAlarm.durationOrTime : '09:41'}</span>
                  <div className="flex items-center gap-1.5 opacity-70">
                    <span className="text-[10px]">5G</span>
                    <div className="w-5 h-2.5 border border-white/60 rounded-xs p-0.5 flex items-center">
                      <div className="w-full h-full bg-white/80 rounded-xs" />
                    </div>
                  </div>
                </div>
              )}

              {/* Home Indicator Bar at Bottom (mockup only) */}
              {!isFullscreen && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[550] w-32 h-1 bg-white/30 rounded-full pointer-events-none" />
              )}

              {/* Live TimeNest Alarm Renderer */}
              <div className="relative w-full h-full overflow-hidden">
                <AlarmVisualDisplay
                  alarm={currentAlarm}
                  theme={theme}
                  isLowStimulation={isLowStimulation}
                  screen={screen}
                  onScreenChange={(s) => {
                    setScreen(s);
                    logAction(`Navegou para tela: ${s}`);
                  }}
                  onPrimaryAction={() => {
                    logAction(`Ação principal executada: "${currentAlarm.ctaText}"`);
                    if (soundEnabled) audio.playChimeDone();
                  }}
                  onSnooze={(minutes) => {
                    logAction(`Alarme adiado em: ${minutes === 'task_end' ? 'Fim da tarefa' : `${minutes} min`}`);
                    setScreen('main');
                  }}
                  onDifficulty={(reason) => {
                    logAction(`Apoio selecionado: ${reason}`);
                    setScreen('main');
                  }}
                  onDismiss={() => {
                    logAction('Alarme dispensado!');
                  }}
                  containerMode="embedded"
                  interactive={true}
                />
              </div>

            </div>

            {/* Split Comparison View with Approved Spec (if enabled) */}
            {showComparison && !isFullscreen && activeReference && (
              <div
                className={`transition-all duration-300 relative flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.85)] border-4 border-brand-500/40 overflow-hidden ${deviceDimensions.radius} bg-black`}
                style={{
                  width: deviceDimensions.width,
                  height: deviceDimensions.height,
                }}
              >
                <div className="absolute top-2 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                  <div className="px-2.5 py-1 rounded bg-brand-500/90 text-white text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow-xs">
                    {activeReference.label}
                  </div>
                  <div className="px-2 py-0.5 rounded bg-black/60 text-white/80 text-[10px] font-mono backdrop-blur-md">
                    {activeReference.code}
                  </div>
                </div>
                <img
                  src={activeReference.src}
                  alt={activeReference.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

          </div>

          {/* Floating Screen Action Bar when in Fullscreen */}
          {isFullscreen && (
            <div className="fixed top-4 right-4 z-[650] flex items-center gap-2 bg-black/70 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl">
              <span className="text-[11px] font-bold text-white/70 px-2">Modo Tela Cheia Real</span>
              
              <button
                onClick={() => setScreen(s => s === 'main' ? 'snooze' : (s === 'snooze' ? 'difficulty' : 'main'))}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Próxima Tela ({screen})
              </button>

              <button
                onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer"
              >
                {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
              </button>

              <button
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Sair (ESC)</span>
              </button>
            </div>
          )}

        </main>

      </div>

    </div>
  );
};
