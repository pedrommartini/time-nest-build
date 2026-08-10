import React, { useState, useEffect } from 'react';
import { X, CalendarDays, Clock } from 'lucide-react';
import { audio } from '../utils/audio';
import { WheelPicker } from './WheelPicker';

interface DateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'date' | 'time';
  initialValue: string;
  onSave: (value: string) => void;
}

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({ isOpen, onClose, type, initialValue, onSave }) => {
  
  // For time
  const [hour, setHour] = useState('15');
  const [minute, setMinute] = useState('00');

  // For date
  const [day, setDay] = useState('01');
  const [month, setMonth] = useState('01');
  const [year, setYear] = useState('2024');

  useEffect(() => {
    if (isOpen) {
      if (type === 'time') {
        const [h, m] = initialValue.split(':');
        setHour(h || '15');
        setMinute(m || '00');
      } else {
        const [y, m, d] = initialValue.split('-');
        setYear(y || String(new Date().getFullYear()));
        setMonth(m || String(new Date().getMonth() + 1).padStart(2, '0'));
        setDay(d || String(new Date().getDate()).padStart(2, '0'));
      }
    }
  }, [isOpen, initialValue, type]);

  if (!isOpen) return null;

  const handleSave = () => {
    audio.playChimeDone();
    if (type === 'time') {
      onSave(`${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`);
    } else {
      onSave(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
  };

  const handleClose = () => {
    audio.playClick();
    onClose();
  };

  const hoursOptions = Array.from({ length: 24 }).map((_, i) => ({ value: String(i).padStart(2, '0'), label: String(i).padStart(2, '0') }));
  const minutesOptions = Array.from({ length: 12 }).map((_, i) => ({ value: String(i * 5).padStart(2, '0'), label: String(i * 5).padStart(2, '0') })); // 5 min intervals

  const daysOptions = Array.from({ length: 31 }).map((_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1).padStart(2, '0') }));
  const monthsOptions = [
    { value: '01', label: 'Jan' }, { value: '02', label: 'Fev' }, { value: '03', label: 'Mar' },
    { value: '04', label: 'Abr' }, { value: '05', label: 'Mai' }, { value: '06', label: 'Jun' },
    { value: '07', label: 'Jul' }, { value: '08', label: 'Ago' }, { value: '09', label: 'Set' },
    { value: '10', label: 'Out' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dez' }
  ];
  const currentYear = new Date().getFullYear();
  const yearsOptions = Array.from({ length: 10 }).map((_, i) => ({ value: String(currentYear + i), label: String(currentYear + i) }));


  return (
    <div className="fixed inset-0 bg-app-bg z-[300] flex flex-col items-center justify-center animate-fade-in p-6">
      
      <button 
        onClick={handleClose} 
        className="absolute top-6 left-6 p-4 rounded-full hover:bg-border-color/50 active:scale-95 transition-all text-text-secondary"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="flex flex-col items-center gap-4 mb-12 mt-12">
        {type === 'time' ? <Clock className="w-16 h-16 text-brand-500 opacity-80" /> : <CalendarDays className="w-16 h-16 text-brand-500 opacity-80" />}
        <h3 className="font-black text-3xl text-text-primary">
          {type === 'time' ? 'Horário' : 'Data'}
        </h3>
      </div>

      <div className="w-full max-w-sm max-h-[300px] flex items-center justify-center gap-2 relative">
        {type === 'time' ? (
          <>
            <div className="w-1/2">
              <WheelPicker options={hoursOptions} value={hour} onChange={(val) => setHour(String(val))} itemHeight={70} />
            </div>
            <span className="text-4xl font-bold text-text-primary mb-2">:</span>
            <div className="w-1/2">
              <WheelPicker options={minutesOptions} value={minute} onChange={(val) => setMinute(String(val))} itemHeight={70} />
            </div>
          </>
        ) : (
          <>
            <div className="w-1/4">
              <WheelPicker options={daysOptions} value={day} onChange={(val) => setDay(String(val))} itemHeight={70} />
            </div>
            <div className="w-2/4">
              <WheelPicker options={monthsOptions} value={month} onChange={(val) => setMonth(String(val))} itemHeight={70} />
            </div>
            <div className="w-1/4">
              <WheelPicker options={yearsOptions} value={year} onChange={(val) => setYear(String(val))} itemHeight={70} />
            </div>
          </>
        )}
      </div>

      <div className="w-full max-w-sm mt-16 flex items-center justify-center px-6 relative z-10">
        <button 
          onClick={handleSave}
          className="w-full bg-brand-600/10 text-brand-600 font-black text-2xl px-6 py-4 rounded-3xl hover:bg-brand-600/20 active:scale-95 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
};
