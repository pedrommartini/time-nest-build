import React, { useState, useEffect } from 'react';
import { 
  X, Check, Trash2, ChevronUp, Clock, BellRing, 
  AlarmClock, Repeat, AlignLeft, Calendar as CalendarIcon
} from 'lucide-react';
import type { Event, Task } from '../utils/time';
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

  // Color mapping
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    brand: { bg: 'bg-brand-500', border: 'border-brand-500', text: 'text-brand-600' },
    blue: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-600' },
    green: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-600' },
    amber: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-600' },
    red: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-600' },
    purple: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-600' },
    gray: { bg: 'bg-gray-500', border: 'border-gray-500', text: 'text-gray-600' },
  };

  const activeColor = colorMap[color] || colorMap.brand;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Handle Drag Bar */}
      <div 
        className="w-[56px] h-[5px] bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-3 mb-1 shrink-0 cursor-pointer"
        onClick={onToggleExpand}
      />

      {/* Header Bar (Collapsed View) */}
      <div className="px-5 py-2 shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Color Indicator Dot */}
          <div className={`w-3.5 h-3.5 rounded-full ${activeColor.bg} shrink-0 shadow-sm`} />

          <div className="flex flex-col min-w-0 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className={`text-[17px] font-bold text-gray-900 dark:text-gray-100 bg-transparent outline-none truncate border-b border-transparent focus:border-brand-400 transition-colors ${
                isCompleted ? 'line-through opacity-60' : ''
              }`}
              placeholder="Título do evento..."
            />

            <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              {isEvent && event ? (
                `${event.start} – ${event.end} (${timeStringToMinutes(event.end) - timeStringToMinutes(event.start)} min)`
              ) : (
                `Tarefa • ${task?.estimatedDuration || 30} min`
              )}
              {item.source === 'google' && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  Google Agenda
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Checkmark Complete Toggle */}
          <button
            onClick={handleToggleComplete}
            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors active:scale-95 ${
              isCompleted
                ? `${activeColor.bg} border-transparent text-white`
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400'
            }`}
            title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
          >
            <Check className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="w-8 h-8 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-400 hover:text-red-600 flex items-center justify-center transition-colors active:scale-95"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Toggle Expand Chevron */}
          <button
            onClick={onToggleExpand}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 flex items-center justify-center transition-transform duration-200"
            title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
          >
            <ChevronUp className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Close Selection Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 flex items-center justify-center transition-colors ml-1"
            title="Fechar detalhes e ver tarefas disponíveis"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Content Body (Notion Calendar Controls) */}
      <div 
        className={`px-6 pb-6 pt-2 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 transition-opacity duration-200 ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Date & Time Settings */}
        <div className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-brand-500" />
              {isEvent && event ? event.date : (task ? 'Hoje' : '')}
            </span>

            {isEvent && event && (
              <span className="text-[13px] font-bold text-brand-600 dark:text-brand-400">
                {event.start} – {event.end}
              </span>
            )}
          </div>

          {/* Quick Duration Controls */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
            <span className="text-[12px] font-medium text-gray-500">Duração:</span>
            <button
              onClick={() => handleDurationAdjust(-15)}
              className="px-2.5 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            >
              -15m
            </button>
            <button
              onClick={() => handleDurationAdjust(15)}
              className="px-2.5 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            >
              +15m
            </button>
            <button
              onClick={() => handleDurationAdjust(30)}
              className="px-2.5 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            >
              +30m
            </button>
            <button
              onClick={() => handleDurationAdjust(60)}
              className="px-2.5 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-[12px] font-semibold border border-gray-200 dark:border-gray-600 hover:bg-gray-100 active:scale-95 transition-all"
            >
              +1h
            </button>
          </div>
        </div>

        {/* Notifications & Alarms */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-brand-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Aviso Antecipado</span>
              <span className="text-[11px] font-medium text-gray-500">Notificar antes do horário</span>
            </div>
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
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <AlarmClock className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Alarme em Tela Cheia</span>
              <span className="text-[11px] font-medium text-gray-500">Despertador estilo alarme</span>
            </div>
          </div>

          <button
            onClick={handleAlarmToggle}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center ${
              alarmEnabled ? 'bg-amber-500 justify-end' : 'bg-gray-300 dark:bg-gray-600 justify-start'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-md" />
          </button>
        </div>

        {/* Recurrence Settings */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-purple-500 shrink-0" />
            <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Repetição</span>
          </div>

          <select
            value={recurrenceRule}
            onChange={(e) => handleRecurrenceChange(e.target.value as any)}
            className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-[12px] font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600 outline-none"
          >
            <option value="NONE">Nenhuma</option>
            <option value="DAILY">Diária</option>
            <option value="WEEKLY">Semanal</option>
            <option value="MONTHLY">Mensal</option>
          </select>
        </div>

        {/* Color Palette Selection */}
        {isEvent && (
          <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800">
            <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">Cor do Bloco</span>
            <div className="flex items-center gap-2">
              {['brand', 'blue', 'green', 'amber', 'purple', 'red'].map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className={`w-6 h-6 rounded-full transition-transform active:scale-95 ${
                    colorMap[c]?.bg || 'bg-gray-400'
                  } ${color === c ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'opacity-80 hover:opacity-100'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Description & Notes */}
        <div className="flex flex-col gap-1.5 bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
            <AlignLeft className="w-4 h-4 text-gray-400" />
            Notas / Descrição
          </span>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            placeholder="Adicionar detalhes ou anotações..."
            rows={3}
            className="w-full bg-white dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 text-[13px] p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
