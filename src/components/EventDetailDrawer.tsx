import React, { useState, useEffect } from 'react';
import { 
  X, Check, Trash2, ChevronDown, Clock, BellRing, 
  AlarmClock, AlignLeft, MoreHorizontal, Plus
} from 'lucide-react';
import type { Event, Task } from '../utils/time';
import { useProfile } from '../contexts/ProfileContext';
import { audio } from '../utils/audio';

interface EventDetailDrawerProps {
  event?: Event | null;
  task?: Task | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  onUpdateEvent: (id: string, updates: Partial<Event>) => void;
  onUpdateEventTimes: (id: string, start: string, end: string) => void;
  onDeleteEvent: (id: string) => void;
  onUpdateTask?: (id: string, updates: Partial<Task>) => void;
  onDeleteTask?: (id: string) => void;
}

const timeStringToMinutes = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
};

const minutesToTimeString = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const formatDatePortuguese = (dateStr?: string): string => {
  if (!dateStr) return 'Hoje';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const daysOfWeek = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  
  const dayName = daysOfWeek[date.getDay()];
  const monthName = months[date.getMonth()];
  return `${dayName}, ${d} de ${monthName}`;
};

const formatDurationText = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  if (remMins === 0) return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
  return `${hours}h ${remMins}m`;
};

export const EventDetailDrawer: React.FC<EventDetailDrawerProps> = ({
  event,
  task,
  isExpanded,
  onToggleExpand,
  onClose,
  onUpdateEvent,
  onUpdateEventTimes,
  onDeleteEvent,
  onUpdateTask,
  onDeleteTask,
}) => {
  const { profile } = useProfile();
  const item = event || task;
  const isEvent = !!event;

  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [color, setColor] = useState(event?.color || 'brand');
  const [recurrenceRule, setRecurrenceRule] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>(
    item?.recurrenceRule || 'NONE'
  );
  const [notificationOffset, setNotificationOffset] = useState<number>(
    item?.notificationOffset ?? 5
  );
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(
    item?.alarmEnabled ?? false
  );
  const [isAllDay, setIsAllDay] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Sync state when selected item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description || '');
      if (event) setColor(event.color || 'brand');
      setRecurrenceRule(item.recurrenceRule || 'NONE');
      setNotificationOffset(item.notificationOffset ?? 5);
      setAlarmEnabled(item.alarmEnabled ?? false);
    }
  }, [item?.id]);

  if (!item) return null;

  const isCompleted = isEvent ? !!event?.completed : task?.status === 'completed';

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (isEvent && event) {
      onUpdateEvent(event.id, { title: newTitle.trim() || 'Sem Título' });
    } else if (task && onUpdateTask) {
      onUpdateTask(task.id, { title: newTitle.trim() || 'Sem Título' });
    }
  };

  const handleDescriptionChange = (newDesc: string) => {
    setDescription(newDesc);
    if (isEvent && event) {
      onUpdateEvent(event.id, { description: newDesc });
    } else if (task && onUpdateTask) {
      onUpdateTask(task.id, { description: newDesc });
    }
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    if (isEvent && event) {
      onUpdateEvent(event.id, { color: newColor });
    }
  };

  const handleRecurrenceChange = (rule: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
    setRecurrenceRule(rule);
    if (isEvent && event) {
      onUpdateEvent(event.id, { recurrenceRule: rule });
    } else if (task && onUpdateTask) {
      onUpdateTask(task.id, { recurrenceRule: rule });
    }
  };

  const handleNotificationChange = (offset: number) => {
    setNotificationOffset(offset);
    if (isEvent && event) {
      onUpdateEvent(event.id, { notificationOffset: offset });
    } else if (task && onUpdateTask) {
      onUpdateTask(task.id, { notificationOffset: offset });
    }
  };

  const handleAlarmToggle = () => {
    const nextVal = !alarmEnabled;
    setAlarmEnabled(nextVal);
    if (isEvent && event) {
      onUpdateEvent(event.id, { alarmEnabled: nextVal });
    } else if (task && onUpdateTask) {
      onUpdateTask(task.id, { alarmEnabled: nextVal });
    }
  };

  const handleDurationAdjust = (diffMinutes: number) => {
    if (isEvent && event) {
      const startMins = timeStringToMinutes(event.start);
      const currentEndMins = timeStringToMinutes(event.end);
      let newEndMins = currentEndMins + diffMinutes;
      if (newEndMins <= startMins + 15) newEndMins = startMins + 15;
      if (newEndMins > 24 * 60) newEndMins = 24 * 60;
      onUpdateEventTimes(event.id, event.start, minutesToTimeString(newEndMins));
    } else if (task && onUpdateTask) {
      const newDur = Math.max(15, (task.estimatedDuration || 30) + diffMinutes);
      onUpdateTask(task.id, { estimatedDuration: newDur });
    }
  };

  const handleToggleComplete = () => {
    audio.playClick();
    if (isEvent && event) {
      onUpdateEvent(event.id, { completed: !event.completed });
    } else if (task && onUpdateTask) {
      onUpdateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
    }
  };

  const handleDelete = () => {
    audio.playClick();
    if (isEvent && event) {
      onDeleteEvent(event.id);
    } else if (task && onDeleteTask) {
      onDeleteTask(task.id);
    }
    onClose();
  };

  const colorMap: Record<string, { bg: string; text: string }> = {
    brand: { bg: 'bg-brand-500', text: 'text-brand-600' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600' },
    green: { bg: 'bg-green-500', text: 'text-green-600' },
    amber: { bg: 'bg-amber-500', text: 'text-amber-600' },
    red: { bg: 'bg-red-500', text: 'text-red-600' },
    purple: { bg: 'bg-purple-500', text: 'text-purple-600' },
  };

  const durationMinutes = isEvent && event 
    ? (timeStringToMinutes(event.end) - timeStringToMinutes(event.start)) 
    : (task?.estimatedDuration || 30);

  return (
    <div className="flex flex-col h-full w-full select-none pb-[95px]">
      {/* Handle Drag Pill Bar */}
      <div 
        className="w-[44px] h-[4px] bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mt-2.5 mb-1 shrink-0 cursor-pointer"
        onClick={onToggleExpand}
      />

      {/* Top Action Bar (Notion Calendar Header: Left Type Pill, Right Menu + Close) */}
      <div className="px-5 pt-1 pb-1 shrink-0 flex items-center justify-between">
        {/* Type Badge Pill */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 text-[13px] font-bold transition-colors shadow-2xs"
          >
            <span>{isEvent ? 'Evento' : 'Tarefa'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {item.source === 'google' && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
              Google Agenda
            </span>
          )}
        </div>

        {/* Right Controls: Menu (...) & Close (X) */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors active:scale-95"
            title="Opções"
          >
            <MoreHorizontal className="w-4.5 h-4.5" />
          </button>

          {/* Options Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-10 top-0 w-44 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  handleToggleComplete();
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-[13px] font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-green-500" />
                {isCompleted ? 'Marcar pendente' : 'Marcar concluído'}
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-[13px] font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </div>
          )}

          {/* Close Selection Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center transition-colors active:scale-95"
            title="Fechar detalhes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Title Section */}
      <div className="px-5 pt-2 pb-1 shrink-0 flex flex-col">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className={`text-[23px] font-extrabold text-gray-900 dark:text-gray-100 bg-transparent outline-none truncate border-b border-transparent focus:border-brand-500 transition-colors ${
            isCompleted ? 'line-through opacity-50' : ''
          }`}
          placeholder="Nome do evento..."
        />
      </div>

      {/* Time & Date Property Block (Click to toggle expand) */}
      <div className="px-5 py-1 shrink-0 flex flex-col gap-0.5 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900 dark:text-gray-100">
            {isEvent && event ? (
              <>
                <span>{event.start}</span>
                <span className="text-gray-400 font-normal">→</span>
                <span>{event.end}</span>
                <span className="text-[13px] font-medium text-gray-400 dark:text-gray-500 ml-1">
                  {formatDurationText(durationMinutes)}
                </span>
              </>
            ) : (
              <span>Duração: {task?.estimatedDuration || 30} min</span>
            )}
          </div>
        </div>

        {/* Date Row */}
        <div className="pl-6.5 text-[13px] font-medium text-gray-500 dark:text-gray-400">
          {formatDatePortuguese(isEvent ? event?.date : undefined)}
        </div>
      </div>

      {/* Notion-style Quick Sub-bar: Dia todo | Repetir | Cor */}
      <div className="px-5 pt-2 pb-2 shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setIsAllDay(!isAllDay)}
          className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-colors ${
            isAllDay 
              ? 'bg-brand-500 text-white' 
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          Dia todo
        </button>

        <select
          value={recurrenceRule}
          onChange={(e) => handleRecurrenceChange(e.target.value as any)}
          className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[12px] font-semibold px-3 py-1 rounded-full outline-none border-none cursor-pointer"
        >
          <option value="NONE">Repetir</option>
          <option value="DAILY">Todos os dias</option>
          <option value="WEEKLY">Toda semana</option>
          <option value="MONTHLY">Todo mês</option>
        </select>

        {isEvent && (
          <div className="flex items-center gap-1 pl-1">
            {['brand', 'blue', 'green', 'purple', 'amber', 'red'].map((c) => (
              <button
                key={c}
                onClick={() => handleColorChange(c)}
                className={`w-4 h-4 rounded-full transition-transform ${colorMap[c]?.bg} ${color === c ? 'ring-2 ring-brand-500 scale-110' : 'opacity-70'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thin Divider Line */}
      <div className="mx-5 my-1 border-b border-gray-100 dark:border-gray-800/80 shrink-0" />

      {/* Expanded Details Section (Notion Calendar Android Layout) */}
      <div 
        className={`px-5 pb-6 pt-2 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 transition-opacity duration-200 ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* User Profile & Participants Section (Replaces bare email) */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {/* Circular Profile Avatar */}
            {profile.avatar ? (
              <img 
                src={profile.avatar} 
                alt={profile.name} 
                className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-2xs" 
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-brand-500 text-white font-bold flex items-center justify-center text-[15px] shadow-2xs">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'V'}
              </div>
            )}

            <div className="flex flex-col">
              <span className="text-[14px] font-bold text-gray-900 dark:text-gray-100">
                {profile.name}
              </span>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {item.source === 'google' ? 'pedrommartini@hotmail.com' : 'Organizador(a)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-200/60 dark:bg-gray-700/60 px-2.5 py-1 rounded-full">
              Ocupado
            </span>

            {/* Add Participant Button (+) Placeholder */}
            <button
              onClick={() => {
                audio.playClick();
                alert('Em breve: Convidar novos participantes para o evento!');
              }}
              className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/80 hover:bg-brand-200 text-brand-600 dark:text-brand-300 font-bold flex items-center justify-center text-lg active:scale-95 transition-all shadow-2xs"
              title="Adicionar participante (+)"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>

        {/* Notes & Description Textarea */}
        <div className="flex flex-col gap-1.5 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
          <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <AlignLeft className="w-4 h-4 text-gray-400" />
            Descrição
          </span>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Adicionar descrição ou notas..."
            rows={2}
            className="w-full bg-white dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 text-[13px] p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 outline-none resize-none"
          />
        </div>

        {/* AT THE VERY END: Reminders, Alarms & Quick Duration */}
        <div className="flex flex-col gap-3 pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
          <span className="text-[12px] font-bold text-gray-400 uppercase tracking-wider px-1">
            Lembretes & Alarmes
          </span>

          {/* Notice Antecedence Selector (Reminders) */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">Lembrete prévio</span>
            </div>

            <select
              value={notificationOffset}
              onChange={(e) => handleNotificationChange(Number(e.target.value))}
              className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-[12px] font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 outline-none"
            >
              <option value={0}>No horário</option>
              <option value={5}>5 min antes</option>
              <option value={15}>15 min antes</option>
              <option value={30}>30 min antes</option>
              <option value={60}>1 hora antes</option>
            </select>
          </div>

          {/* Fullscreen Alarm Toggle */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <AlarmClock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">Alarme em tela cheia</span>
            </div>

            <button
              onClick={handleAlarmToggle}
              className={`w-10 h-5.5 rounded-full transition-colors p-0.5 flex items-center ${
                alarmEnabled ? 'bg-amber-500 justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
              }`}
            >
              <div className="w-4.5 h-4.5 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          {/* Quick Duration Adjust Buttons */}
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
            <span className="text-[13px] font-medium text-gray-600 dark:text-gray-300">Ajustar duração:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleDurationAdjust(-15)}
                className="px-2.5 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
              >
                -15m
              </button>
              <button
                onClick={() => handleDurationAdjust(15)}
                className="px-2.5 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
              >
                +15m
              </button>
              <button
                onClick={() => handleDurationAdjust(30)}
                className="px-2.5 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
              >
                +30m
              </button>
              <button
                onClick={() => handleDurationAdjust(60)}
                className="px-2.5 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
              >
                +1h
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
