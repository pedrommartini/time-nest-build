import React, { useState, useEffect, useRef } from 'react';
import { useTasks } from '../contexts/TasksContext';
import { useCalendar } from '../contexts/CalendarContext';
import { CalendarDays, X, Mic, Check, Sparkles, Bell, BellRing, AlarmClock, AlignLeft, Repeat, ChevronDown, ChevronUp, ArrowLeft, Pencil } from 'lucide-react';
import { DateTimePickerModal } from './DateTimePickerModal';
import { RecurrencePickerModal } from './RecurrencePickerModal';
import { RichTextEditor } from './RichTextEditor';
import { audio } from '../utils/audio';
import { parseNLPInput } from '../utils/nlp';
import { getLocalDateString } from '../utils/time';

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
  const { addEvent } = useCalendar();
  
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

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [isRecurrencePickerOpen, setIsRecurrencePickerOpen] = useState(false);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);

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
        let currentInterim = '';
        let finalTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalTrans) {
          setInput(prev => (prev ? `${prev} ${finalTrans}` : finalTrans).trim());
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
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
      const startTime = parsed.time || deducedTime || '15:00';
      const [h, m] = startTime.split(':').map(Number);
      const endH = (h + 1) % 24;
      const endTime = `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;

      addEvent({
        title: parsed.title || finalInput,
        start: startTime,
        end: endTime,
        date: parsed.date || deducedDate || getLocalDateString(),
        color: 'purple',
        isFixed: true,
        source: 'local',
        description,
        recurrenceRule,
        notificationOffset,
        alarmEnabled
      });
    } else {
      addTask(parsed.title || finalInput, taskDuration, {
        description,
        recurrenceRule,
        notificationOffset,
        alarmEnabled
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

  const toggleVoiceMode = () => {
    audio.playClick();
    setIsVoiceActive(prev => !prev);
  };

  return (
    <div className="fixed inset-0 bg-app-bg/95 backdrop-blur-2xl z-[100] animate-fade-in flex flex-col p-6 pt-12">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            {isVoiceActive ? 'Ditado por Voz' : 'Nova Entrada'}
          </span>
        </div>
        
        <button 
          onClick={handleClose} 
          className="w-10 h-10 bg-card-bg border border-border-color rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform"
        >
          <X className="w-5 h-5 text-text-secondary" />
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
                className="relative z-10 w-20 h-20 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-2xl shadow-brand-500/50 active:scale-90 transition-all"
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
              className="flex-1 py-4 rounded-2xl border border-border-color bg-card-bg text-text-secondary font-bold text-sm hover:bg-border-color/30 transition-colors"
            >
              Usar Teclado
            </button>

            {(input || interimTranscript) && (
              <button 
                onClick={handleSubmit}
                className="flex-1 py-4 rounded-2xl bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
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
          <div className="relative w-full pt-4">
            <input 
              type="text"
              autoFocus
              placeholder="O que você precisa fazer?"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full bg-transparent text-2xl font-bold text-text-primary placeholder:text-text-secondary/40 outline-none pr-12"
            />

            {/* Minimalist Voice Mic Button */}
            <div className={`absolute right-0 top-5 transition-all duration-300 ${input.length > 0 ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}>
              <button
                onClick={toggleVoiceMode}
                title="Escrever por voz"
                className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/50 flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          {input.length > 0 && (
            <div className="animate-slide-up flex flex-col flex-1 mt-6">
              {/* Type Switcher */}
              <div className="flex gap-2 mb-4">
                <button 
                  onClick={() => { audio.playClick(); setDeducedType('task'); }}
                  className={`flex-1 py-3 px-1 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                    deducedType === 'task' 
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm' 
                      : 'border-border-color bg-card-bg opacity-60'
                  }`}
                >
                  <span className={`font-bold text-sm ${deducedType === 'task' ? 'text-brand-600 dark:text-brand-400' : 'text-text-secondary'}`}>Tarefa</span>
                </button>
                <button 
                  onClick={() => { audio.playClick(); setDeducedType('event'); }}
                  className={`flex-1 py-3 px-1 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${
                    deducedType === 'event' 
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-sm' 
                      : 'border-border-color bg-card-bg opacity-60'
                  }`}
                >
                  <span className={`font-bold text-sm ${deducedType === 'event' ? 'text-brand-600 dark:text-brand-400' : 'text-text-secondary'}`}>Evento</span>
                </button>
                <button 
                  onClick={() => { audio.playClick(); setIsRecurrencePickerOpen(true); }}
                  className={`flex-1 py-3 px-2 rounded-2xl border-2 font-bold text-sm text-center outline-none transition-all flex items-center justify-center gap-2 ${
                    recurrenceRule !== 'NONE'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                      : 'border-border-color bg-card-bg text-text-secondary opacity-60'
                  }`}
                >
                  <Repeat className="w-4 h-4" />
                  {recurrenceRule === 'NONE' ? 'Recorrente' : recurrenceRule === 'DAILY' ? 'Diário' : recurrenceRule === 'WEEKLY' ? 'Semanal' : 'Mensal'}
                </button>
              </div>

              {/* Deduced Details Card */}
              <div className="bg-card-bg border border-border-color rounded-3xl p-4 mb-4 flex flex-col justify-center shadow-sm">
                {deducedType === 'task' ? (
                  <div className="flex flex-col gap-6 animate-fade-in w-full">
                    <div className="text-center">
                      <span className="text-4xl font-black text-brand-600 dark:text-brand-400">{taskDuration} <span className="text-xl text-text-secondary font-bold">min</span></span>
                    </div>
                    
                    <input 
                      type="range" 
                      min="5" max="120" step="5"
                      value={taskDuration}
                      onChange={(e) => setTaskDuration(parseInt(e.target.value))}
                      className="w-full accent-brand-500 h-2 bg-border-color rounded-lg appearance-none cursor-pointer mt-2"
                    />
                    <div className="flex justify-between text-xs font-bold text-text-secondary px-1">
                      <span>5m</span>
                      <span>2h</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 animate-fade-in items-center w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="w-6 h-6 text-brand-500 opacity-80" />
                      <span className="text-[10px] text-text-secondary/70 uppercase tracking-widest font-bold">Agendamento</span>
                    </div>
                    
                    <div className="flex w-full gap-4">
                      <div className="flex-1 flex flex-col items-center">
                         <span className="text-[10px] font-bold text-text-secondary mb-1">Horário</span>
                         <button 
                           onClick={() => setIsTimePickerOpen(true)} 
                           className="w-full text-center text-xl font-black text-brand-600 dark:text-brand-400 bg-app-bg border border-border-color rounded-xl p-2 active:scale-95 transition-transform"
                         >
                           {deducedTime}
                         </button>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                         <span className="text-[10px] font-bold text-text-secondary mb-1">Data</span>
                         <button 
                           onClick={() => setIsDatePickerOpen(true)} 
                           className="w-full text-center text-sm font-bold text-text-secondary bg-app-bg border border-border-color rounded-xl p-3 active:scale-95 transition-transform"
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
                  className="flex items-center gap-2 text-text-secondary text-sm w-full p-3 bg-app-bg border border-border-color rounded-xl shadow-inner cursor-pointer hover:border-brand-300 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-brand-500 flex-shrink-0" />
                  <div className={`flex-1 overflow-hidden h-5 ${description ? 'text-text-primary' : 'text-text-secondary/50'}`} dangerouslySetInnerHTML={{ __html: description || 'Adicionar detalhes...' }} />
                </div>
              </div>

              {/* Actions & Alerts */}
              <div className="flex flex-col gap-3 mt-auto pb-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Avisos e Alarmes</span>
                  <div className="flex gap-2 items-center">
                    <div className="relative">
                      <BellRing className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-500 pointer-events-none" />
                      <select
                        value={notificationOffset}
                        onChange={(e) => { audio.playClick(); setNotificationOffset(Number(e.target.value)); }}
                        className="pl-9 pr-3 py-2 text-xs font-bold bg-card-bg border border-border-color rounded-xl appearance-none outline-none shadow-sm text-text-primary"
                      >
                        <option value="0">Na hora</option>
                        <option value="5">5 min antes</option>
                        <option value="15">15 min antes</option>
                        <option value="30">30 min antes</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => { audio.playClick(); setAlarmEnabled(!alarmEnabled); }}
                      className={`p-2.5 rounded-full border transition-colors shadow-sm active:scale-90 ${alarmEnabled ? 'bg-red-50 border-red-500 text-red-600 dark:bg-red-900/30 dark:border-red-400 dark:text-red-400' : 'bg-card-bg border-border-color text-text-secondary'}`}
                    >
                      <AlarmClock className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-[24px] bg-brand-600 text-white font-bold text-lg shadow-xl shadow-brand-500/30 active:scale-95 transition-all"
                >
                  Adicionar {deducedType === 'task' ? 'Tarefa' : 'Evento'}
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
                  className="p-2 mr-2 rounded-full hover:bg-border-color/50 active:scale-95 transition-all text-text-primary"
                  title="Voltar"
                >
                  <ArrowLeft className="w-5 h-5" />
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
          <div className="bg-card-bg w-full max-w-sm rounded-[32px] p-8 shadow-2xl border border-border-color animate-scale-in text-center flex flex-col items-center">
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
                className="flex-1 py-4 rounded-2xl border border-border-color bg-card-bg text-text-secondary font-bold text-sm hover:bg-border-color/30 transition-colors"
              >
                Voltar
              </button>
              <button 
                onClick={confirmDiscard}
                className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/30 active:scale-95 transition-all"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
