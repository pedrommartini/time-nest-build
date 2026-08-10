import React, { useEffect, useState } from 'react';
import { DownloadCloud, Sparkles, RefreshCw, X } from 'lucide-react';
import { audio } from '../utils/audio';

interface UpdateOverlayProps {
  onUpdate: () => void;
  onDismiss: () => void;
  version?: string;
}

export const UpdateOverlay: React.FC<UpdateOverlayProps> = ({ onUpdate, onDismiss, version = '2.0.0' }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to allow enter animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = () => {
    audio.playClick();
    onUpdate();
  };

  const handleDismiss = () => {
    audio.playClick();
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for exit animation
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-6 transition-all duration-300 ${isVisible ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-transparent backdrop-blur-none opacity-0 pointer-events-none'}`}>
      <div className={`w-full max-w-sm bg-app-bg border border-border-color rounded-[32px] shadow-2xl overflow-hidden transition-all duration-400 transform ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        
        {/* Header Graphic */}
        <div className="relative h-40 bg-brand-600 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          <div className="absolute w-64 h-64 bg-brand-400 rounded-full blur-3xl opacity-40 -top-10 -right-10"></div>
          <div className="absolute w-40 h-40 bg-indigo-500 rounded-full blur-3xl opacity-40 -bottom-10 -left-10"></div>
          
          <div className="relative z-10 w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg animate-pulse-slow">
            <RefreshCw className="w-10 h-10 text-white" />
          </div>
          
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white/80 hover:bg-black/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h2 className="text-xl font-bold text-text-primary">Nova Atualização!</h2>
          </div>
          
          <div className="bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-bold px-3 py-1 rounded-full mb-4 border border-brand-200 dark:border-brand-800/50">
            Versão {version} disponível
          </div>

          <p className="text-sm text-text-secondary mb-8 leading-relaxed">
            Uma nova versão do aplicativo está pronta. Atualize agora para ter acesso a novas funcionalidades, melhorias de performance e correções.
          </p>

          <button 
            onClick={handleUpdate}
            className="w-full py-4 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <DownloadCloud className="w-5 h-5" />
            Atualizar Agora
          </button>
          
          <button 
            onClick={handleDismiss}
            className="mt-4 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors px-4 py-2 rounded-lg"
          >
            Lembrar mais tarde
          </button>
        </div>
      </div>
    </div>
  );
};
