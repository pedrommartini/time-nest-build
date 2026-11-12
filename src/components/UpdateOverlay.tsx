import React, { useEffect, useState } from 'react';
import { DownloadCloud, Sparkles, RefreshCw, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { audio } from '../utils/audio';
import type { VersionInfo } from '../version';

interface UpdateOverlayProps {
  onUpdate: () => void | Promise<void>;
  onDismiss: () => void;
  version?: string;
  versionInfo?: VersionInfo | null;
}

export const UpdateOverlay: React.FC<UpdateOverlayProps> = ({ 
  onUpdate, 
  onDismiss, 
  version = '3.2.0',
  versionInfo
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const displayVersion = versionInfo?.version || version;
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = async () => {
    audio.playClick();
    setIsUpdating(true);
    try {
      await onUpdate();
    } catch {
      setIsUpdating(false);
    }
  };

  const handleDismiss = () => {
    audio.playClick();
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black/50 backdrop-blur-sm opacity-100' : 'bg-transparent backdrop-blur-none opacity-0 pointer-events-none'}`}>
      <div className={`w-full max-w-sm modal-standard overflow-hidden transition-all duration-400 transform ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-8 opacity-0'}`}>
        
        {/* Header Graphic */}
        <div className="relative h-36 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
          <div className="absolute w-48 h-48 bg-brand-400 rounded-full blur-3xl opacity-30 -top-8 -right-8"></div>
          <div className="absolute w-36 h-36 bg-purple-500 rounded-full blur-2xl opacity-30 -bottom-8 -left-8"></div>
          
          <div className="relative z-10 w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
            <RefreshCw className={`w-8 h-8 text-white ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          
          {!versionInfo?.forceUpdate && (
            <button 
              onClick={handleDismiss}
              disabled={isUpdating}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white/80 hover:bg-black/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-text-primary">
              {versionInfo?.title || 'Nova Atualização Disponível!'}
            </h2>
          </div>
          
          <div className="bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-xs font-bold px-3 py-1 rounded-full mb-3 border border-brand-200 dark:border-brand-800/50 flex items-center gap-1.5">
            <span>Versão {displayVersion}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          {/* Release Notes */}
          {versionInfo?.notes && versionInfo.notes.length > 0 ? (
            <div className="w-full text-left bg-gray-50 dark:bg-card-bg/60 p-3 rounded-xl border border-border-color mb-4 max-h-36 overflow-y-auto custom-scrollbar">
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block mb-1.5">
                O que há de novo:
              </span>
              <ul className="space-y-1.5">
                {versionInfo.notes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-text-secondary leading-snug">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-text-secondary mb-5 leading-relaxed">
              Uma nova versão do TimeNest está pronta. Atualize agora com 1 clique para receber melhorias de estabilidade, novas funções e correções.
            </p>
          )}

          {/* Action Button */}
          <button 
            onClick={handleUpdate}
            disabled={isUpdating}
            className="w-full py-3.5 btn-primary text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 active:scale-[0.98] transition-transform"
          >
            {isUpdating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Atualizando aplicativo...</span>
              </>
            ) : (
              <>
                <DownloadCloud className="w-4 h-4" />
                <span>{isNative ? 'Baixar & Atualizar (1 Clique)' : 'Atualizar Web Agora (1 Clique)'}</span>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </>
            )}
          </button>

          {!isNative && (
            <a 
              href="/timenest.apk"
              download="timenest.apk"
              className="mt-3 text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1.5 font-medium"
            >
              <DownloadCloud className="w-3.5 h-3.5" />
              <span>Baixar arquivo APK Android (v{displayVersion})</span>
            </a>
          )}
          
          {!versionInfo?.forceUpdate && (
            <button 
              onClick={handleDismiss}
              disabled={isUpdating}
              className="mt-3 px-3 py-1.5 btn-tertiary text-xs text-text-secondary hover:text-text-primary"
            >
              Lembrar mais tarde
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
