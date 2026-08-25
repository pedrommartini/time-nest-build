import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useCalendar } from '../contexts/CalendarContext';
import { useProjects } from '../contexts/ProjectsContext';
import { CalendarDays, X, Mic, Check, Sparkles, BellRing, AlarmClock, Repeat, ArrowLeft, Pencil, CheckCircle2, Folder, Briefcase, GraduationCap, Home, ChefHat, Dumbbell, Plane, PersonStanding, Code, Music, Palette, Camera, ShoppingCart, Users, Car, Gamepad2, Heart, Coffee } from 'lucide-react';
import { DateTimePickerModal } from './DateTimePickerModal';
import { RecurrencePickerModal } from './RecurrencePickerModal';
import { RichTextEditor } from './RichTextEditor';
import { audio } from '../utils/audio';
import { parseNLPInput } from '../utils/nlp';
import { getLocalDateString } from '../utils/time';

import { useBackHandler } from '../contexts/NavigationContext';

const iconMap: Record<string, any> = {
  Briefcase, GraduationCap, Home, ChefHat, Dumbbell, Plane, Folder,
  PersonStanding, Code, Music, Palette, Camera, ShoppingCart, Users, Car, Gamepad2, Heart, Coffee
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: string;
  startWithVoice?: boolean;
}

export const SmartInputOverlay: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  initialValue = '',
  startWithVoice = false 
}) => {
  const { addTask } = useTasks();
  const { addEvent, events } = useCalendar();
  const { projects } = useProjects();
  
  
  const [input, setInput] = useState(initialValue);
  const [isVoiceActive, setIsVoiceActive] = useState(startWithVoice);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const [deducedType, setDeducedType] = useState<'task' | 'event'>('task');
  const [deducedTime, setDeducedTime] = useState<string>('15:00');
  const [deducedDate, setDeducedDate] = useState<string>(getLocalDateString());
  const [taskDuration, setTaskDuration] = useState<number>(30);
  
  const [description, setDescription] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
  const [notificationOffset, setNotificationOffset] = useState<number>(5); // 5 minutes default
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isRecurrencePickerOpen, setIsRecurrencePickerOpen] = useState(false);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [pendingEventData, setPendingEventData] = useState<any>(null);

  const isAnyPickerOpen = isDatePickerOpen || isTimePickerOpen || isRecurrencePickerOpen;
  const isAnyModalOpen = isConfirmDiscardOpen || isConflictDialogOpen;

  // Handle pickers back button
  useBackHandler(() => {
    setIsDatePickerOpen(false);
    setIsTimePickerOpen(false);
    setIsRecurrencePickerOpen(false);
    return true;
  }, isAnyPickerOpen, 40);

  // Handle discard/conflict dialogs back button
  useBackHandler(() => {
    setIsConfirmDiscardOpen(false);
    setIsConflictDialogOpen(false);
    return true;
  }, isAnyModalOpen, 30);

  // Handle main overlay back button
  useBackHandler(() => {
    if (input.trim().length > 0) {
      setIsConfirmDiscardOpen(true);
      return true;
    }
    onClose();
    return true;
  }, isOpen && !isAnyPickerOpen && !isAnyModalOpen, 20);

  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let currentInterim = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript + ' ';
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        setInput(finalTrans.trim());
        setInterimTranscript(currentInterim.trim());
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsVoiceActive(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, [isOpen]);

  // Handle Voice Mode start/stop
  useEffect(() => {
    if (!isOpen) return;

    const startListening = async () => {
      if (isVoiceActive) {
        // Solcita permissão de áudio explicitamente para abrir o pop-up nativo do sistema
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (err) {
          console.warn('Microphone permission prompt failed or denied:', err);
        }

        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
            audio.playClick();
          } catch (e) {
            // Já iniciado ou ocupado
          }
        }
      } else {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
        }
      }
    };

    startListening();
  }, [isVoiceActive, isOpen]);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setInput(initialValue);
      setIsVoiceActive(startWithVoice);
      setInterimTranscript('');
      setSelectedProjectId(null);
    } else {
      setIsVoiceActive(false);
    }
  }, [isOpen, initialValue, startWithVoice]);

  // NLP Parsing effect
  useEffect(() => {
    if (!isOpen || !input.trim()) return;

    const parsed = parseNLPInput(input);
    if (parsed.type === 'event' || parsed.time) {
      setDeducedType('event');
      setDeducedTime(parsed.time || '15:00');
      setDeducedDate(parsed.date || getLocalDateString());
    } else {
      setDeducedType('task');
      if (parsed.date) setDeducedDate(parsed.date);
    }
    
    if (parsed.recurrenceRule && parsed.recurrenceRule !== 'NONE') {
      setRecurrenceRule(parsed.recurrenceRule);
    }
  }, [input, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (input.trim() || description.trim()) {
      setIsConfirmDiscardOpen(true);
    } else {
      onClose();
    }
  };

  const confirmDiscard = () => {
    setIsConfirmDiscardOpen(false);
    onClose();
  };

  const handleSubmit = () => {
    const finalInput = (input + ' ' + interimTranscript).trim();
    if (!finalInput) return;

    const parsed = parseNLPInput(finalInput);

    if (deducedType === 'event') {
      const startTime = deducedTime;
      const [h, m] = startTime.split(':').map(Number);
      const endH = (h + 1) % 24;
      const endTime = `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;

      // Calculate minutes for conflict check
      const startMins = h * 60 + (m || 0);
      const endMins = endH * 60 + (m || 0);

      const hasConflict = events.some(e => {
        if (e.date !== deducedDate) return false;
        const [eSH, eSM] = e.start.split(':').map(Number);
        const [eEH, eEM] = e.end.split(':').map(Number);
        const eStartMins = eSH * 60 + eSM;
        const eEndMins = eEH * 60 + eEM;
        return (startMins < eEndMins && endMins > eStartMins);
      });

      const newEventData = {
        title: parsed.title || finalInput,
        start: startTime,
        end: endTime,
        date: deducedDate,
        color: 'purple',
        isFixed: true,
        source: 'local' as const,
        description,
        recurrenceRule,
        notificationOffset,
        alarmEnabled,
        projectId: selectedProjectId || undefined
      };

      if (hasConflict) {
        setPendingEventData(newEventData);
        setIsConflictDialogOpen(true);
        return;
      }

      addEvent(newEventData);
    } else {
      addTask(parsed.title || finalInput, taskDuration, {
        description,
        recurrenceRule,
        notificationOffset,
        alarmEnabled,
        projectId: selectedProjectId || undefined
      });
    }

    audio.playChimeDone();
    setInput('');
    setInterimTranscript('');
    setDescription('');
    setIsDescriptionExpanded(false);
    setRecurrenceRule('NONE');
    setNotificationOffset(5);
    setAlarmEnabled(false);
    setIsVoiceActive(false);
    onClose();
  };

  const confirmEventWithConflict = () => {
    if (pendingEventData) {
      addEvent(pendingEventData);
      setPendingEventData(null);
      setIsConflictDialogOpen(false);
      
      audio.playChimeDone();
      setInput('');
      setDescription('');
      onClose();
    }
  };

  const toggleVoiceMode = () => {
    audio.playClick();
    setIsVoiceActive(prev => !prev);
  };

  return (
    <div className="fixed inset-0 bg-app-bg/95 backdrop-blur-2xl z-[100] animate-fade-in flex flex-col p-6 pt-12">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2 text-brand-500">
          <Sparkles className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
            {isVoiceActive ? 'Ditado por Voz' : 'Nova Entrada'}
          </span>
        </div>
        
        <button 
          onClick={handleClose} 
          className="w-10 h-10 bg-card-bg border border-border-color rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          <X className="w-5 h-5 text-brand-500" />
        </button>
      </div>

      {/* Voice Transcription Mode vs Text Mode Screen */}
      {isVoiceActive ? (
        <div className="flex-1 flex flex-col items-center justify-between py-8 animate-fade-in">
          <div />

          {/* Real-time Visualizer & Speech Indicator */}
          <div className="flex flex-col items-center gap-6 my-auto text-center px-4">
            <div className="relative flex items-center justify-center">
              {/* Outer Pulsing Waves */}
              <div className="absolute w-36 h-36 rounded-full bg-brand-500/20 animate-ping"></div>
              <div className="absolute w-28 h-28 rounded-full bg-brand-500/30 animate-pulse"></div>
              
              {/* Main Mic Button */}
              <button 
                onClick={toggleVoiceMode}
                className="relative z-10 w-20 h-20 btn-primary flex items-center justify-center"
              >
                <Mic className="w-9 h-9" />
              </button>
            </div>

            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest animate-pulse">
              Fale agora... transcrição em tempo real
            </span>

            {/* Live Real-time Text Output */}
            <div className="min-h-[100px] max-w-md w-full p-4 rounded-3xl bg-card-bg/80 border border-border-color/60 backdrop-blur-md flex items-center justify-center shadow-inner">
              <p className="text-xl font-bold text-text-primary text-center leading-relaxed">
                {input} {interimTranscript && <span className="text-brand-500 opacity-70">{interimTranscript}</span>}
                {!input && !interimTranscript && (
                  <span className="text-text-secondary/40 text-base font-normal">Ex: "Reunião hoje às 20h43"</span>
                )}
              </p>
            </div>
          </div>

          {/* Voice Action Controls */}
          <div className="w-full flex gap-4 max-w-sm">
            <button 
              onClick={toggleVoiceMode}
              className="flex-1 py-4 btn-secondary text-sm"
            >
              Usar Teclado
            </button>

            {(input || interimTranscript) && (
              <button 
                onClick={() => {
                  const fullText = `${input} ${interimTranscript}`.trim();
                  if (fullText) setInput(fullText);
                  setInterimTranscript('');
                  setIsVoiceActive(false);
                  audio.playClick();
                }}
                className="flex-1 py-4 btn-primary text-sm flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Concluir
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Text Mode Screen */
        <div className="flex-1 flex flex-col justify-between animate-fade-in">
          <div className="relative w-full pt-2 mb-8">
            <div className="relative inline-block w-full">
              <input 
                type="text"
                autoFocus
                placeholder="O que você precisa fazer?"
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full bg-transparent text-[36px] leading-tight font-handwritten text-text-primary placeholder:text-text-secondary/30 outline-none pr-12 font-medium tracking-wide"
              />
              <svg className="absolute -bottom-2 left-0 w-[100%] h-4 text-brand-500/70 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 12">
                <defs>
                  <clipPath id="draw-clip">
                    <rect 
                      x="0" y="0" height="12" 
                      style={{ 
                        width: (input || '').length > 0 ? '100%' : '0%',
                        transition: 'width 0.7s cubic-bezier(0.22, 1, 0.36, 1)'
                      }} 
                    />
                  </clipPath>
                </defs>
                <path 
                  d="M 0 7 C 20 4, 40 8, 60 5 C 80 2, 90 4, 100 4 C 80 5, 60 9, 40 9 C 20 9, 10 9, 0 10 Z" 
                  fill="currentColor"
                  clipPath="url(#draw-clip)"
                />
              </svg>
            </div>

            {/* Minimalist Voice Mic Button */}
            <div className={`absolute right-0 top-3 transition-all duration-300 ${(input || '').length > 0 ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}>
              <button
                onClick={toggleVoiceMode}
                title="Escrever por voz"
                className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/50 flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {(input || '').length > 0 && (
            <div className="animate-slide-up flex flex-col flex-1 mt-6">
              {/* Type Switcher */}
              <div className="flex gap-2 mb-6">
                <button 
                  onClick={() => { audio.playClick(); setDeducedType('task'); }}
                  className={`flex-1 py-3 px-2 rounded-2xl border transition-all flex items-center justify-center gap-2 ${
                    deducedType === 'task' 
                      ? 'border-brand-200 bg-brand-50/70 dark:bg-brand-900/30 shadow-sm text-brand-600 dark:text-brand-400' 
                      : 'border-border-color bg-card-bg/50 opacity-80 text-text-secondary'
                  }`}
                >
                  {deducedType === 'task' && <CheckCircle2 className="w-4 h-4" />}
                  <span className="font-bold text-sm tracking-wide">Tarefa</span>
                </button>
                <button 
                  onClick={() => { audio.playClick(); setDeducedType('event'); }}
                  className={`flex-1 py-3 px-2 rounded-2xl border transition-all flex items-center justify-center gap-2 ${
                    deducedType === 'event' 
                      ? 'border-brand-200 bg-brand-50/70 dark:bg-brand-900/30 shadow-sm text-brand-600 dark:text-brand-400' 
                      : 'border-border-color bg-card-bg/50 opacity-80 text-text-secondary'
                  }`}
                >
                  <CalendarDays className="w-4 h-4" />
                  <span className="font-bold text-sm tracking-wide">Evento</span>
                </button>
                <button 
                  onClick={() => { audio.playClick(); setIsRecurrencePickerOpen(true); }}
                  className={`flex-1 py-3 px-2 rounded-2xl border font-bold text-sm text-center outline-none transition-all flex items-center justify-center gap-2 ${
                    recurrenceRule !== 'NONE'
                      ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                      : 'border-border-color bg-card-bg/50 text-text-secondary opacity-80'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                  {recurrenceRule === 'NONE' ? 'Recorrente' : recurrenceRule === 'DAILY' ? 'Diário' : recurrenceRule === 'WEEKLY' ? 'Semanal' : 'Mensal'}
                </button>
              </div>

              {/* Deduced Details Card */}
              <div className="card-standard p-6 mb-6 flex flex-col justify-center">
                {deducedType === 'task' ? (
                  <div className="flex flex-col gap-6 animate-fade-in w-full">
                    <div className="text-center flex justify-center items-baseline gap-2">
                      <span className="text-[64px] leading-none font-bold text-brand-500">{taskDuration}</span>
                      <span className="text-xl text-text-secondary font-bold">min</span>
                    </div>
                    
                    <div className="px-2 w-full">
                      <input 
                        type="range" 
                        min="5" max="120" step="5"
                        value={taskDuration}
                        onChange={(e) => setTaskDuration(parseInt(e.target.value))}
                        className="w-full accent-brand-500 h-3 bg-border-color dark:bg-brand-900/40 rounded-full appearance-none cursor-pointer mt-2"
                      />
                      <div className="flex justify-between text-sm font-bold text-text-secondary px-1 mt-3">
                        <span>5m</span>
                        <span>2h</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 animate-fade-in items-center w-full">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-brand-500 opacity-80" />
                      <span className="text-[11px] text-text-secondary uppercase tracking-widest font-bold">Agendamento</span>
                    </div>
                    
                    <div className="flex w-full gap-4">
                      <div className="flex-1 flex flex-col items-center">
                         <span className="text-xs font-bold text-text-secondary mb-2">Horário</span>
                         <button 
                           onClick={() => setIsTimePickerOpen(true)} 
                           className="w-full text-center text-3xl font-black text-brand-600 dark:text-brand-400 bg-app-bg border border-border-color rounded-2xl p-4 active:scale-95 transition-transform"
                         >
                           {deducedTime}
                         </button>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                         <span className="text-xs font-bold text-text-secondary mb-2">Data</span>
                         <button 
                           onClick={() => setIsDatePickerOpen(true)} 
                           className="w-full text-center text-lg font-bold text-text-secondary bg-app-bg border border-border-color rounded-2xl p-5 active:scale-95 transition-transform"
                         >
                           {deducedDate}
                         </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description Input Section */}
              <div className="mb-4">
                <div 
                  onClick={() => { audio.playClick(); setIsDescriptionExpanded(true); }}
                  className="flex items-center gap-3 text-text-secondary text-sm w-full p-4 bg-card-bg border border-border-color rounded-2xl shadow-sm cursor-pointer hover:border-brand-200 transition-colors"
                >
                  <Pencil className="w-5 h-5 text-brand-500 flex-shrink-0" />
                  <div className={`flex-1 overflow-hidden h-6 font-handwritten text-xl ${description ? 'text-text-primary' : 'text-text-secondary/70'}`} dangerouslySetInnerHTML={{ __html: description || 'Adicionar detalhes...' }} />
                </div>
              </div>

              {/* Actions & Alerts */}
              <div className="flex flex-col gap-6 mt-auto pb-4 pt-4">
                
                {/* Projetos */}
                <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar">
                  <button 
                    onClick={() => { audio.playClick(); setSelectedProjectId(null); }}
                    className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                      !selectedProjectId 
                        ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-400' 
                        : 'bg-card-bg border-border-color text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    Sem Projeto
                  </button>
                  {projects.map(p => {
                    const Icon = iconMap[p.icon] || Folder;
                    return (
                      <button 
                        key={p.id}
                        onClick={() => { audio.playClick(); setSelectedProjectId(p.id); }}
                        className={`shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-colors flex items-center gap-1.5 ${
                          selectedProjectId === p.id 
                            ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-900/30 dark:border-brand-700 dark:text-brand-400' 
                            : 'bg-card-bg border-border-color text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        {p.title}
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-text-primary uppercase tracking-widest">Avisos e Alarmes</span>
                  <div className="flex gap-2 items-center">
                    <button 
                      onClick={() => { audio.playClick(); setNotificationOffset(notificationOffset === 0 ? 5 : notificationOffset === 5 ? 15 : notificationOffset === 15 ? 30 : 0); }}
                      className="px-4 py-2.5 rounded-xl border border-brand-100 bg-brand-50 dark:bg-brand-900/30 text-text-primary text-xs font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-transform"
                    >
                      <BellRing className="w-4 h-4 text-brand-500" />
                      {notificationOffset === 0 ? 'Na hora' : `${notificationOffset} min antes`}
                    </button>
                    <button 
                      onClick={() => { audio.playClick(); setAlarmEnabled(!alarmEnabled); }}
                      className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all shadow-sm active:scale-90 ${alarmEnabled ? 'bg-brand-100 border-brand-200 text-brand-600 dark:bg-brand-900/50 dark:border-brand-800' : 'bg-card-bg border-border-color text-text-secondary'}`}
                    >
                      <AlarmClock className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-[28px] btn-primary text-xl tracking-wide font-medium flex items-center justify-center gap-3 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  Adicionar {deducedType === 'task' ? 'Tarefa' : 'Evento'}
                  {deducedType === 'task' && <Sparkles className="w-5 h-5 opacity-80" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Screen Description Editor Modal */}
      {isDescriptionExpanded && (
        <div className="fixed inset-0 bg-app-bg z-[200] flex flex-col animate-slide-up">
          <div className="flex-1 overflow-hidden">
            <RichTextEditor 
              value={description}
              onChange={setDescription}
              placeholder="Digite todos os detalhes aqui..."
              autoFocus
              leftAction={
                <button 
                  onClick={() => setIsDescriptionExpanded(false)}
                  className="w-10 h-10 rounded-xl bg-app-bg border border-border-color flex items-center justify-center hover:bg-border-color/50 active:scale-95 transition-all text-text-primary shadow-sm"
                  title="Voltar"
                >
                  <ArrowLeft className="w-5 h-5 text-brand-500" />
                </button>
              }
            />
          </div>
        </div>
      )}

      {/* Date & Time Pickers */}
      <DateTimePickerModal 
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        type="date"
        initialValue={deducedDate}
        onSave={(val) => { setDeducedDate(val); setIsDatePickerOpen(false); }}
      />

      <DateTimePickerModal 
        isOpen={isTimePickerOpen}
        onClose={() => setIsTimePickerOpen(false)}
        type="time"
        initialValue={deducedTime}
        onSave={(val) => { setDeducedTime(val); setIsTimePickerOpen(false); }}
      />

      {/* Recurrence Picker */}
      <RecurrencePickerModal 
        isOpen={isRecurrencePickerOpen}
        onClose={() => setIsRecurrencePickerOpen(false)}
        value={recurrenceRule as any}
        onChange={(val) => setRecurrenceRule(val)}
      />

      {/* Styled Confirm Discard Dialog */}
      {isConfirmDiscardOpen && (
        <div className="fixed inset-0 bg-app-bg/60 backdrop-blur-sm z-[400] flex items-center justify-center p-6 animate-fade-in">
          <div className="modal-standard w-full max-w-sm p-8 animate-scale-in text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center mb-6">
              <X className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Descartar edição?</h3>
            <p className="text-text-secondary text-sm mb-8 leading-relaxed">
              Você tem informações preenchidas. Se fechar agora, você perderá sua entrada atual.
            </p>
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setIsConfirmDiscardOpen(false)}
                className="flex-1 py-4 btn-secondary text-sm"
              >
                Voltar
              </button>
              <button 
                onClick={confirmDiscard}
                className="flex-1 py-4 btn-destructive text-sm"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Dialog */}
      {isConflictDialogOpen && (
        <div className="fixed inset-0 bg-app-bg/60 backdrop-blur-sm z-[400] flex items-center justify-center p-6 animate-fade-in">
          <div className="modal-standard w-full max-w-sm p-8 animate-scale-in text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-500 flex items-center justify-center mb-6">
              <CalendarDays className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">Conflito de Horário</h3>
            <p className="text-text-secondary text-sm mb-8 leading-relaxed">
              Já existe um evento agendado para este horário. Tem certeza de que deseja criar este evento e sobrepor os horários?
            </p>
            <div className="flex gap-4 w-full">
              <button 
                onClick={() => setIsConflictDialogOpen(false)}
                className="flex-1 py-4 btn-secondary text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmEventWithConflict}
                className="flex-1 py-4 bg-orange-500 text-white rounded-full font-bold shadow-sm active:scale-95 transition-transform text-sm"
              >
                Sim, Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
