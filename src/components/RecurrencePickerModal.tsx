import React, { useState } from 'react';
import { X, Repeat, CalendarSync, CalendarCheck, CalendarRange } from 'lucide-react';
import { audio } from '../utils/audio';
import { WheelPicker } from './WheelPicker';
import { useBackHandler } from '../contexts/NavigationContext';

type RecurrenceType = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface RecurrencePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: RecurrenceType;
  onChange: (val: RecurrenceType) => void;
}

export const RecurrencePickerModal: React.FC<RecurrencePickerModalProps> = ({ isOpen, onClose, value, onChange }) => {
  const [currentValue, setCurrentValue] = useState<RecurrenceType>(value);

  useBackHandler(() => {
    onClose();
    return true;
  }, isOpen, 50);

  if (!isOpen) return null;

  const handleSave = () => {
    audio.playChimeDone();
    onChange(currentValue);
    onClose();
  };

  const handleClose = () => {
    audio.playClick();
    onClose();
  };

  const options = [
    { id: 'NONE', label: 'Não se repete', icon: <X className="w-5 h-5 mr-2" /> },
    { id: 'DAILY', label: 'Diariamente', icon: <CalendarSync className="w-5 h-5 mr-2" /> },
    { id: 'WEEKLY', label: 'Semanalmente', icon: <CalendarCheck className="w-5 h-5 mr-2" /> },
    { id: 'MONTHLY', label: 'Mensalmente', icon: <CalendarRange className="w-5 h-5 mr-2" /> }
  ];

  const wheelOptions = options.map(opt => ({
    value: opt.id,
    label: (
      <div className="flex items-center">
        {opt.icon} {opt.label}
      </div>
    )
  }));

  return (
    <div className="fixed inset-0 bg-app-bg z-[300] flex flex-col items-center justify-center animate-fade-in p-6">
      
      <button 
        onClick={handleClose} 
        className="absolute top-6 left-6 p-4 rounded-full hover:bg-border-color/50 active:scale-95 transition-all text-text-secondary"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="flex flex-col items-center gap-4 mb-12 mt-12">
        <Repeat className="w-16 h-16 text-brand-500 opacity-80" />
        <h3 className="font-black text-3xl text-text-primary">
          Frequência
        </h3>
      </div>

      <div className="w-full max-w-sm max-h-[300px] flex items-center justify-center">
        <WheelPicker 
          options={wheelOptions} 
          value={currentValue} 
          onChange={(val) => setCurrentValue(val as RecurrenceType)} 
          itemHeight={70}
        />
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
