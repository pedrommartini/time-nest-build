import React, { useRef, useEffect } from 'react';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Type, AArrowUp, AArrowDown } from 'lucide-react';
import { audio } from '../utils/audio';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  leftAction?: React.ReactNode;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, autoFocus, leftAction }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
       if (!editorRef.current.innerHTML || value === '') {
         editorRef.current.innerHTML = value;
       }
    }
  }, [value]);

  useEffect(() => {
    if (autoFocus && editorRef.current) {
      setTimeout(() => editorRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, arg?: string) => {
    audio.playClick();
    document.execCommand(command, false, arg);
    editorRef.current?.focus();
    handleInput();
  };

  const colors = ['#f87171', '#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#e5e7eb'];

  return (
    <div className="flex flex-col h-full w-full bg-app-bg text-text-primary overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-2 py-2 bg-card-bg/80 backdrop-blur border-b border-border-color select-none relative">
        {leftAction && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2">
            {leftAction}
          </div>
        )}
        
        <div className="flex items-center gap-1 bg-app-bg rounded-xl p-1 border border-border-color shadow-sm">
          <button onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }} className="p-2 hover:bg-border-color/40 rounded-xl text-text-secondary transition-colors" title="Negrito">
            <Bold className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }} className="p-2 hover:bg-border-color/40 rounded-xl text-text-secondary transition-colors" title="Itálico">
            <Italic className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-border-color mx-1"></div>
          
          <button onMouseDown={(e) => { e.preventDefault(); execCommand('justifyLeft'); }} className="p-2 hover:bg-border-color/40 rounded-xl text-text-secondary transition-colors" title="Alinhar à esquerda">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); execCommand('justifyCenter'); }} className="p-2 hover:bg-border-color/40 rounded-xl text-text-secondary transition-colors" title="Centralizar">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); execCommand('justifyRight'); }} className="p-2 hover:bg-border-color/40 rounded-xl text-text-secondary transition-colors" title="Alinhar à direita">
            <AlignRight className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border-color mx-1"></div>

          <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '3'); }} className="p-2 hover:bg-border-color/40 rounded-xl text-text-secondary transition-colors flex items-center justify-center" title="Tamanho Normal">
            <span className="text-[12px] font-bold">A</span>
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); execCommand('fontSize', '5'); }} className="p-2 hover:bg-border-color/40 rounded-xl text-text-secondary transition-colors flex items-center justify-center" title="Tamanho Grande">
            <span className="text-[18px] font-bold">A</span>
          </button>
        </div>
        
        <div className="flex items-center gap-1.5 px-2 bg-app-bg rounded-xl p-1.5 border border-border-color shadow-sm">
          {colors.map(c => (
            <button
              key={c}
              onMouseDown={(e) => { e.preventDefault(); execCommand('foreColor', c); }}
              className="w-4 h-4 rounded-full shadow-md hover:scale-110 active:scale-95 transition-transform"
              style={{ backgroundColor: c }}
              title={`Cor: ${c}`}
            />
          ))}
        </div>
      </div>

      {/* Editor Content with Ruled Lines Background */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="flex-1 px-8 py-4 outline-none overflow-y-auto text-[17px] tracking-wide font-medium text-text-primary/90 focus:ring-0 empty:before:content-[attr(data-placeholder)] empty:before:text-text-secondary/40 cursor-text leading-[32px] font-sans"
        data-placeholder={placeholder || 'Comece a escrever...'}
        style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(150, 150, 150, 0.05) 31px, rgba(150, 150, 150, 0.05) 32px)',
          backgroundAttachment: 'local',
          backgroundSize: '100% 32px',
          backgroundPosition: '0 4px' // Push line slightly down relative to the text
        }}
      />
    </div>
  );
};
