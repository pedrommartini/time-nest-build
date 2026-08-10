// Profile and Settings View for TimeNest

import React, { useState } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useCalendar } from '../contexts/CalendarContext';
import { useTasks } from '../contexts/TasksContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useFocus } from '../contexts/FocusContext';
import { useMedication } from '../contexts/MedicationContext';
import { useGamification } from '../contexts/GamificationContext';
import { audio } from '../utils/audio';
import { runTests } from '../utils/tests';
import type { TestResult as UTResult } from '../utils/tests';
import type { ThemeType, ColorBlindMode } from '../contexts/PreferencesContext';
import { AVAILABLE_SKINS } from '../utils/skins';
import { 
  User, Calendar as CalendarIcon, Settings, Bell, ChevronRight, ArrowLeft,
  Shield, Info, Moon, Palette, Check,
  Plus, Volume2, Globe, Crown, Cloud, Download, LogOut,
  Flame, Clock, Star, X, Pill, Trash2, Trophy, Coins
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { profile, setProfile, achievements, security, setSecurity, wipeAllData } = useProfile();
  const { 
    theme, setTheme, skin, setSkin, isLowStimulation, setIsLowStimulation, 
    colorBlindMode, setColorBlindMode, fontFamily, setFontFamily, uiScale, setUiScale, 
    sleepStart, setSleepStart, sleepEnd, setSleepEnd, 
    globalAlarmsEnabled, setGlobalAlarmsEnabled, t 
  } = usePreferences();
  const { googleSync, connectGoogle, disconnectGoogle } = useCalendar();
  const { resetLearning } = useTasks();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const { stats } = useFocus();
  const { medications, addMedication, deleteMedication } = useMedication();
  const { nests, level } = useGamification();

  const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<UTResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  const [newMedName, setNewMedName] = useState('');
  const [newMedTime, setNewMedTime] = useState('08:00');

  const handleRunTests = () => {
    setIsRunningTests(true);
    audio.playClick();
    setTimeout(() => {
      const res = runTests();
      setTestResults(res);
      setIsRunningTests(false);
      audio.playChimeDone();
    }, 600);
  };
  
  // States for sub-screen controls

  const renderSubScreenHeader = (title: string) => (
    <div className="flex items-center gap-3 mb-6">
      <button 
        onClick={() => { audio.playClick(); setActiveSubScreen(null); }}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-card-bg border border-border-color hover:bg-border-color/30 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-text-primary" />
      </button>
      <h2 className="text-xl font-bold text-text-primary">{title}</h2>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-app-bg animate-fade-in relative">
      
      {/* Main Profile View */}
      <div className={`flex-1 overflow-y-auto pb-[110px] custom-scrollbar transition-transform duration-300 ${activeSubScreen ? '-translate-x-full absolute opacity-0' : 'translate-x-0'}`}>
        
        {/* Header Profile Info */}
        <div className="px-5 pt-12 pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-1 tracking-tight">Perfil</h1>
            <p className="text-[11px] text-text-secondary leading-snug max-w-[180px]">Gerencie sua conta, integrações e preferências.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { audio.playClick(); setActiveSubScreen('notifications'); }} className="w-10 h-10 rounded-full border border-border-color bg-card-bg flex items-center justify-center relative hover:bg-border-color/30 transition-colors shadow-sm">
              <Bell className="w-5 h-5 text-text-primary" />
              {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card-bg"></span>}
            </button>
            <button onClick={() => { audio.playClick(); setActiveSubScreen('appearance'); }} className="w-10 h-10 rounded-full border border-border-color bg-card-bg flex items-center justify-center hover:bg-border-color/30 transition-colors shadow-sm">
              <Settings className="w-5 h-5 text-text-primary" />
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="px-5 mb-6">
          <div className="rounded-3xl p-5 border border-brand-200/50 dark:border-brand-800/30 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-card-bg shadow-sm relative overflow-hidden group cursor-pointer hover:border-brand-300 transition-colors">
            {/* Soft decorative blur */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-200/40 dark:bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-[60px] h-[60px] rounded-full border-[3px] border-white dark:border-border-color shadow-sm overflow-hidden bg-brand-100 flex items-center justify-center shrink-0">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-brand-500" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-text-primary text-base">{googleSync.isConnected ? profile.name : 'Visitante'}</h2>
                  <p className="text-[10px] text-text-secondary mb-1.5">{googleSync.isConnected ? (profile.email || 'usuario@email.com') : 'Modo Local'}</p>
                  <div className="flex gap-2 mt-1.5">
                    <div className="inline-flex items-center gap-1 bg-brand-100/60 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full text-[9px] font-bold">
                      <Crown className="w-3 h-3" />
                      Plano Pro
                    </div>
                    <div className="inline-flex items-center gap-1 bg-yellow-100/60 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full text-[9px] font-bold">
                      <Trophy className="w-3 h-3" />
                      Lvl {level}
                    </div>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-brand-500 transition-colors" />
            </div>

            {/* Stats Row */}
            <div className="flex justify-between items-center relative z-10 px-2">
              <div className="flex flex-col items-center text-center">
                <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mb-1">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-text-primary text-sm">{nests}</span>
                <span className="text-[8px] text-text-secondary leading-tight whitespace-nowrap">Nests</span>
              </div>
              
              <div className="w-px h-8 bg-border-color/50"></div>

              <div className="flex flex-col items-center text-center">
                <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-1">
                  <Flame className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-text-primary text-sm">12</span>
                <span className="text-[8px] text-text-secondary leading-tight whitespace-nowrap">Dias em sequência</span>
              </div>

              <div className="w-px h-8 bg-border-color/50"></div>

              <div className="flex flex-col items-center text-center">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 flex items-center justify-center mb-1">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-text-primary text-sm">{Math.floor(stats.focusMinutesToday / 60) || 48}h</span>
                <span className="text-[8px] text-text-secondary leading-tight whitespace-nowrap">Tempo focado</span>
              </div>

              <div className="w-px h-8 bg-border-color/50"></div>

              <div className="flex flex-col items-center text-center">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                  <Star className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-text-primary text-sm">{achievements.filter(a => a.unlockedAt).length || 7}</span>
                <span className="text-[8px] text-text-secondary leading-tight whitespace-nowrap">Conquistas</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-8 flex flex-col gap-6">
          
          {/* Integrações */}
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3">Integrações</h3>
            <div className="card-standard !rounded-3xl p-1">
              <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                    <CalendarIcon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-text-primary">Google Agenda</h4>
                    {googleSync.isConnected ? (
                      <>
                        <p className="text-[10px] text-green-600 font-medium">Conectado • {googleSync.email || profile.email || 'usuario@gmail.com'}</p>
                        <p className="text-[9px] text-text-secondary">Sincronizado agora há 2 min</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-text-secondary">Desconectado</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {googleSync.isConnected ? (
                    <>
                      <button 
                        onClick={() => { audio.playClick(); disconnectGoogle(); }} 
                        className="px-3 py-1.5 rounded-full border border-red-200 text-red-500 text-[10px] font-bold hover:bg-red-50 transition-colors"
                      >
                        Desconectar
                      </button>
                      <button 
                        onClick={() => { audio.playClick(); disconnectGoogle(); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 hover:text-red-500 text-text-secondary transition-colors"
                        title="Remover conta"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={async () => {
                        audio.playClick();
                        setIsSyncing(true);
                        const user = await connectGoogle();
                        if (user) {
                          const newProfile = { ...profile };
                          if (user.displayName || user.name) newProfile.name = user.displayName || user.name;
                          if (user.email) newProfile.email = user.email;
                          if (user.imageUrl || user.photoUrl) newProfile.avatar = user.imageUrl || user.photoUrl;
                          setProfile(newProfile);
                        }
                        setIsSyncing(false);
                      }} 
                      disabled={isSyncing}
                      className="px-3 py-1.5 rounded-full btn-primary text-[10px] font-bold hover:brightness-105 transition-all disabled:opacity-50"
                    >
                      {isSyncing ? 'Conectando...' : 'Conectar'}
                    </button>
                  )}
                </div>
              </div>
              <div className="border-t border-border-color p-3">
                <button className="w-full py-2 flex items-center justify-center gap-2 text-brand-600 text-[11px] font-bold hover:bg-brand-50/50 rounded-xl transition-colors">
                  <Plus className="w-4 h-4" />
                  Conectar outro serviço
                </button>
              </div>
            </div>
          </div>

          {/* Preferências */}
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3">Preferências</h3>
            <div className="card-standard !rounded-3xl p-1 flex flex-col">
              
              <button onClick={() => { audio.playClick(); setActiveSubScreen('appearance'); }} className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Palette className="w-4 h-4" /></div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Aparência e Skins</p>
                    <p className="text-[10px] text-text-secondary">{theme === 'light' ? 'Tema claro' : 'Tema escuro'}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button onClick={() => { audio.playClick(); setActiveSubScreen('notifications'); }} className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center"><Bell className="w-4 h-4" /></div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Notificações</p>
                    <p className="text-[10px] text-text-secondary">Configurar lembretes e alertas</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
              
              <button onClick={() => { audio.playClick(); setActiveSubScreen('sleep'); }} className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Moon className="w-4 h-4" /></div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Ideal de Sono</p>
                    <p className="text-[10px] text-text-secondary">Limites de horário</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button onClick={() => { audio.playClick(); setActiveSubScreen('medications'); }} className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><Pill className="w-4 h-4" /></div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Horário de Medicamentos</p>
                    <p className="text-[10px] text-text-secondary">Lembretes personalizados ({medications.length} ativos)</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button onClick={() => { audio.playClick(); setActiveSubScreen('intelligence'); }} className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center"><Settings className="w-4 h-4" /></div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Inteligência do app</p>
                    <p className="text-[10px] text-text-secondary">Ajustes de sugestões e aprendizado</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <div className="p-3 flex items-center justify-between border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Volume2 className="w-4 h-4" /></div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Sons</p>
                    <p className="text-[10px] text-text-secondary">Ativar sons do aplicativo</p>
                  </div>
                </div>
                <div className="w-10 h-6 rounded-full bg-brand-500 p-1 flex items-center cursor-pointer">
                  <div className="w-4 h-4 rounded-full bg-white transform translate-x-4"></div>
                </div>
              </div>

              <button onClick={() => { audio.playClick(); setActiveSubScreen('security'); }} className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><Shield className="w-4 h-4" /></div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Privacidade</p>
                    <p className="text-[10px] text-text-secondary">Seus dados e segurança</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Globe className="w-4 h-4" /></div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Idioma</p>
                    <p className="text-[10px] text-text-secondary">Português (Brasil)</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

            </div>
          </div>

          {/* Conta */}
          <div>
            <h3 className="text-sm font-bold text-text-primary mb-3">Conta</h3>
            <div className="card-standard !rounded-3xl p-1 flex flex-col">
              
              <button className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <Crown className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-text-primary">Plano e assinatura</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-600 text-[9px] font-bold">Pro</span>
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                </div>
              </button>

              <button className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <Cloud className="w-4 h-4 text-text-secondary" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Backup e sincronização</p>
                    <p className="text-[9px] text-text-secondary">Último backup: hoje às 08:30</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-text-secondary" />
                  <span className="text-xs font-bold text-text-primary">Exportar dados</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button onClick={() => {
                if (confirm('Tem certeza que deseja sair da conta e DELETAR todos os dados locais?')) {
                  wipeAllData();
                }
              }} className="p-3 flex items-center justify-between hover:bg-red-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold text-red-500">Sair da conta</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

            </div>
          </div>

          <div className="flex items-center justify-center gap-1 mt-2">
            <span className="text-[9px] text-text-secondary">Versão 1.0.0</span>
            <span className="text-[9px]">💜</span>
          </div>

        </div>
      </div>

      {/* Sub Screens Layer */}
      {activeSubScreen && (
        <div className="absolute inset-0 bg-app-bg z-30 animate-slide-up flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pt-8 pb-20">
            
            {/* SUB: APPEARANCE & SKINS */}
            {activeSubScreen === 'appearance' && (
              <>
                {renderSubScreenHeader('Aparência e Skins')}
                <div className="flex flex-col gap-6">
                  
                  {/* TEMA */}
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase mb-2 block">Tema do Aplicativo</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['light', 'dark', 'system'] as ThemeType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => { audio.playClick(); setTheme(t); }}
                          className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                            theme === t ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/10 dark:text-brand-400' : 'border-border-color bg-card-bg text-text-primary hover:border-brand-300'
                          }`}
                        >
                          {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Sistema'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TIPOGRAFIA */}
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase mb-2 block">Tipografia (Fonte Base)</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Outfit', 'Plus Jakarta Sans', 'Poppins'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => { audio.playClick(); setFontFamily(f); }}
                          className={`py-3 px-1 rounded-xl border text-[11px] leading-tight font-bold transition-all text-center ${
                            fontFamily === f ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/10 dark:text-brand-400' : 'border-border-color bg-card-bg text-text-primary hover:border-brand-300'
                          }`}
                          style={{ fontFamily: `"${f}", sans-serif` }}
                        >
                          {f.replace('Plus Jakarta Sans', 'Jakarta')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SKINS */}
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase mb-2 block">Skins (Cores e Texturas)</span>
                    <div className="grid grid-cols-1 gap-3.5">
                      {AVAILABLE_SKINS.map((s) => {
                        const isSelected = skin === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => { audio.playClick(); setSkin(s.id); }}
                            className={`group text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-3 relative overflow-hidden ${
                              isSelected
                                ? 'border-brand-500 bg-card-bg shadow-md ring-2 ring-brand-500/20'
                                : 'border-border-color bg-card-bg hover:border-brand-300 hover:bg-app-bg/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-xl shadow-inner border border-white/20 shrink-0 flex items-center justify-center"
                                  style={{ background: s.previewGradient }}
                                >
                                  {isSelected && <Check className="w-5 h-5 text-white drop-shadow-md" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-sm text-text-primary">{s.name}</h4>
                                    {s.badgeText && (
                                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-brand-500 text-white tracking-wider">
                                        {s.badgeText}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 block mt-0.5">{s.tagline}</span>
                                </div>
                              </div>
                              <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-border-color bg-app-bg'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                            <p className="text-[11px] text-text-secondary leading-relaxed pl-1">{s.description}</p>
                            <div className="flex items-center gap-1.5 pt-1">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary mr-1">Paleta:</span>
                              <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: s.colors.primary }} />
                              <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: s.colors.primarySoft }} />
                              <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: s.colors.bgPrimary }} />
                              <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: s.colors.accent }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ACESSIBILIDADE */}
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase mb-2 block">Acessibilidade / TDAH</span>
                    <button
                      onClick={() => { audio.playClick(); setIsLowStimulation(!isLowStimulation); }}
                      className={`w-full p-4 rounded-2xl border text-left transition-all ${
                        isLowStimulation ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/10' : 'border-border-color bg-card-bg'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-sm font-semibold ${isLowStimulation ? 'text-brand-600 dark:text-brand-400' : 'text-text-primary'}`}>Modo Baixa Estimulação</span>
                        <div className={`w-10 h-6 rounded-full transition-colors flex items-center p-1 ${isLowStimulation ? 'bg-brand-500' : 'bg-border-color'}`}>
                          <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isLowStimulation ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                      </div>
                      <p className="text-[10px] text-text-secondary pr-8">Remove animações, sombras fortes, gradientes e usa cores em tons pastéis sólidos para reduzir a carga cognitiva visual.</p>
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase mb-2 block">Filtros de Daltonismo</span>
                    <div className="grid grid-cols-2 gap-2">
                      {(['none', 'protanopia', 'deuteranopia', 'tritanopia'] as ColorBlindMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={() => { audio.playClick(); setColorBlindMode(mode); }}
                          className={`py-3 px-2 rounded-xl border text-[11px] font-bold transition-all ${
                            colorBlindMode === mode ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/10 dark:text-brand-400' : 'border-border-color bg-card-bg text-text-primary hover:border-brand-300'
                          }`}
                        >
                          {mode === 'none' ? 'Desativado' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase mb-2 block">Tamanho da Fonte (Zoom)</span>
                    <div className="flex items-center gap-4 bg-card-bg border border-border-color p-4 rounded-2xl">
                      <span className="text-xs text-text-secondary font-bold">A-</span>
                      <input 
                        type="range" 
                        min="80" max="150" step="10"
                        value={uiScale}
                        onChange={(e) => setUiScale(parseInt(e.target.value))}
                        className="flex-1 accent-brand-500 h-1.5 bg-border-color rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-lg text-text-secondary font-bold">A+</span>
                    </div>
                    <p className="text-center mt-2 text-[10px] text-brand-600 dark:text-brand-400 font-bold">{uiScale}%</p>
                  </div>

                </div>
              </>
            )}

            {/* SUB: SLEEP */}
            {activeSubScreen === 'sleep' && (
              <>
                {renderSubScreenHeader('Ideal de Sono')}
                <div className="flex flex-col gap-6">
                  <div className="bg-card-bg p-5 rounded-3xl border border-border-color flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 flex items-center justify-center"><Moon className="w-5 h-5" /></div>
                      <div>
                        <h3 className="font-bold text-text-primary text-sm">Período de Sono</h3>
                        <p className="text-[10px] text-text-secondary">Defina suas horas ideais de dormir e acordar.</p>
                      </div>
                    </div>

                    <div className="h-[1px] bg-border-color w-full my-1"></div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-primary">Hora de Dormir</span>
                        <input 
                          type="time" 
                          value={sleepStart}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSleepStart(e.target.value);
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-app-bg border border-border-color text-sm text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text-primary">Hora de Acordar</span>
                        <input 
                          type="time" 
                          value={sleepEnd}
                          onChange={(e) => {
                            if (e.target.value) {
                              setSleepEnd(e.target.value);
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-app-bg border border-border-color text-sm text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-brand-50/10 dark:bg-brand-950/5 border border-brand-200/40 dark:border-brand-900/10 p-4 rounded-2xl">
                    <p className="text-[11px] text-text-secondary leading-normal">
                      <strong>Por que isso importa?</strong> O TimeNest calcula seus intervalos de foco disponíveis automaticamente nos horários em que você está acordado. Definir seu período de sono garante que nenhuma sugestão de tarefa seja feita enquanto você deveria estar dormindo.
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* SUB: MEDICATIONS */}
            {activeSubScreen === 'medications' && (
              <>
                {renderSubScreenHeader('Horário de Medicamentos')}
                <div className="flex flex-col gap-6">
                  
                  <div className="card-standard p-5">
                    <h3 className="font-bold text-sm mb-4 text-text-primary">Adicionar Medicamento</h3>
                    <div className="flex flex-col gap-3">
                      <input 
                        type="text" 
                        placeholder="Nome do remédio"
                        value={newMedName}
                        onChange={(e) => setNewMedName(e.target.value)}
                        className="px-4 py-3 rounded-xl bg-app-bg border border-border-color text-sm text-text-primary w-full focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      />
                      <div className="flex gap-3">
                        <input 
                          type="time" 
                          value={newMedTime}
                          onChange={(e) => setNewMedTime(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-xl bg-app-bg border border-border-color text-sm text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                        <button 
                          onClick={async () => {
                            if (newMedName.trim()) {
                              await addMedication(newMedName.trim(), newMedTime);
                              setNewMedName('');
                            }
                          }}
                          className="flex-1 btn-primary text-xs"
                        >
                          Salvar Alarme
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm mb-3 px-1 text-text-secondary uppercase">Meus Lembretes</h3>
                    {medications.length === 0 ? (
                      <p className="text-xs text-text-secondary text-center py-6">Nenhum medicamento adicionado.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {medications.map(med => (
                          <div key={med.id} className="card-standard p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                                <Pill className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-bold text-text-primary text-sm">{med.name}</h4>
                                <p className="text-[10px] text-brand-600 font-bold">Todos os dias às {med.time}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => deleteMedication(med.id)}
                              className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* SUB: INTELLIGENCE */}
            {activeSubScreen === 'intelligence' && (
              <>
                {renderSubScreenHeader(t('profileIntelligence'))}
                <div className="flex flex-col gap-4">
                  <div className="bg-brand-50/20 dark:bg-brand-950/10 border border-brand-200 dark:border-brand-900/40 rounded-2xl p-4 flex gap-3">
                    <Info className="w-5 h-5 text-brand-600 dark:text-brand-400 self-start" />
                    <p className="text-[11px] text-text-secondary leading-normal">
                      A inteligência do app utiliza regras locais e seu histórico para melhorar sugestões e estimativas. Nenhum chatbot ou API paga é utilizado neste protótipo.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="flex items-center justify-between p-3 bg-app-bg rounded-2xl border border-border-color text-xs">
                      <span className="font-semibold text-text-primary">Sugestões Inteligentes nos Intervalos</span>
                      <input type="checkbox" defaultChecked className="accent-brand-500 w-4.5 h-4.5" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-app-bg rounded-2xl border border-border-color text-xs">
                      <span className="font-semibold text-text-primary">Aprender Duração Real (Feedback Loop)</span>
                      <input type="checkbox" defaultChecked className="accent-brand-500 w-4.5 h-4.5" />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-app-bg rounded-2xl border border-border-color text-xs">
                      <span className="font-semibold text-text-primary">Detectar Tarefas Repetidas</span>
                      <input type="checkbox" defaultChecked className="accent-brand-500 w-4.5 h-4.5" />
                    </label>
                  </div>

                  {/* Visual Test Suite Dashboard */}
                  <div className="border-t border-border-color pt-4 flex flex-col gap-3">
                    <span className="text-[10px] font-bold text-text-secondary uppercase">Validação do Sistema (Testes de Unidade)</span>
                    <button 
                      type="button"
                      onClick={handleRunTests}
                      disabled={isRunningTests}
                      className="w-full py-2.5 btn-secondary text-xs flex items-center justify-center gap-2"
                    >
                      {isRunningTests ? (
                        <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                      ) : null}
                      <span>Executar Testes do Protótipo</span>
                    </button>

                    {testResults && (
                      <div className="bg-app-bg rounded-2xl p-3 border border-border-color max-h-[160px] overflow-y-auto custom-scrollbar flex flex-col gap-1.5">
                        {testResults.map((tr, index) => (
                          <div key={index} className="flex justify-between items-center py-1 border-b border-border-color/20 last:border-b-0 text-[10px]">
                            <div className="text-left min-w-0 pr-2">
                              <span className="text-[8px] text-text-secondary uppercase block font-bold tracking-wider">{tr.category}</span>
                              <span className="font-semibold text-text-primary truncate block">{tr.name}</span>
                              {tr.errorMessage && <span className="text-[8px] text-red-500 block leading-tight">{tr.errorMessage}</span>}
                            </div>
                            <span className={`font-bold px-1.5 py-0.5 rounded-full ${
                              tr.success ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300' : 'bg-red-100 text-red-800'
                            }`}>
                              {tr.success ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => { resetLearning(); audio.playChimeDone(); alert('Histórico de aprendizado redefinido!'); }}
                    className="w-full py-2.5 btn-destructive text-xs mt-2"
                  >
                    Redefinir Aprendizado de Duração
                  </button>
                </div>
              </>
            )}

            {/* SUB: SECURITY & DATA */}
            {activeSubScreen === 'security' && (
              <>
                {renderSubScreenHeader(t('profileSecurity'))}
                <div className="flex flex-col gap-6">
                  
                  <div>
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">Bloqueio do Aplicativo</h3>
                    <div className="bg-card-bg rounded-2xl border border-border-color p-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-sm font-semibold text-text-primary">Exigir Senha Numérica (PIN)</span>
                        <input 
                          type="checkbox" 
                          checked={security.passcodeEnabled}
                          onChange={(e) => {
                            audio.playClick();
                            if (e.target.checked) {
                              const pin = prompt('Digite um PIN de 4 dígitos:');
                              if (pin && /^\d{4}$/.test(pin)) {
                                setSecurity({ ...security, passcodeEnabled: true, passcode: pin });
                              } else {
                                alert('PIN inválido. Use 4 números.');
                              }
                            } else {
                              setSecurity({ ...security, passcodeEnabled: false, passcode: null });
                            }
                          }}
                          className="accent-brand-500 w-4 h-4" 
                        />
                      </div>
                      
                      <div className={`transition-all overflow-hidden ${security.passcodeEnabled ? 'h-auto opacity-100' : 'h-0 opacity-0'}`}>
                        <div className="h-[1px] w-full bg-border-color my-3"></div>
                        <label className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={security.requireOnWake}
                            onChange={(e) => setSecurity({ ...security, requireOnWake: e.target.checked })}
                            className="accent-brand-500 w-4 h-4" 
                          />
                          <span className="text-xs text-text-primary">Bloquear ao sair/minimizar o app</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2 text-red-500">Zona de Perigo</h3>
                    <div className="bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-2xl p-4 flex flex-col gap-3">
                      <p className="text-xs text-text-secondary">O TimeNest armazena todos os seus dados localmente no navegador por questões de privacidade. Limpar os dados é uma ação irreversível se você não tiver feito backup.</p>
                      
                      <button 
                        onClick={() => {
                          if (confirm('Isto fará a tela de boas-vindas aparecer novamente no próximo recarregamento. Deseja continuar?')) {
                            localStorage.removeItem('timenest_onboarding_completed');
                            window.location.reload();
                          }
                        }}
                        className="py-2.5 btn-secondary text-xs mt-2"
                      >
                        Re-exibir Tela de Onboarding
                      </button>
                      
                      <button 
                        onClick={() => {
                          if (confirm('Tem certeza que deseja DELETAR todos os dados locais do aplicativo? Esta ação é irreversível.')) {
                            wipeAllData();
                          }
                        }}
                        className="py-2.5 btn-destructive text-xs"
                      >
                        Apagar Tudo (Wipe Data)
                      </button>
                    </div>
                  </div>

                </div>
              </>
            )}
            
            {/* Notifications Subscreen is simpler, just placeholder logic for now */}
            {activeSubScreen === 'notifications' && (
              <>
                {renderSubScreenHeader('Notificações')}
                <div className="flex flex-col gap-3">
                  
                  <div className="p-4 bg-card-bg border border-border-color rounded-2xl flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-text-primary">Alarmes em Tela Cheia</p>
                      <p className="text-[10px] text-text-secondary max-w-[200px]">Ativar alarme automático para eventos e tarefas com horário fixo</p>
                    </div>
                    <div 
                      onClick={() => { audio.playClick(); setGlobalAlarmsEnabled(!globalAlarmsEnabled); }}
                      className={`w-10 h-6 rounded-full p-1 flex items-center cursor-pointer shrink-0 transition-colors ${globalAlarmsEnabled ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${globalAlarmsEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mb-2 mt-4">
                    <span className="text-xs text-text-secondary">{notifications.length} notificações</span>
                    {notifications.length > 0 && (
                      <button onClick={clearAll} className="text-[10px] font-bold text-brand-600">Limpar Tudo</button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                      <Bell className="w-12 h-12 text-text-secondary mb-3" />
                      <p className="text-sm font-semibold text-text-primary">Tudo limpo!</p>
                      <p className="text-xs text-text-secondary">Nenhuma notificação nova.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 rounded-2xl border ${n.read ? 'bg-app-bg border-border-color opacity-70' : 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-sm font-bold ${n.read ? 'text-text-primary' : 'text-brand-700 dark:text-brand-300'}`}>{n.title}</h4>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5"></span>}
                        </div>
                        <p className="text-xs text-text-secondary mb-2 leading-relaxed">{n.message}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-text-secondary uppercase tracking-wider">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          {!n.read && (
                            <button onClick={() => markAsRead(n.id)} className="text-[10px] font-bold text-brand-600">Marcar como lida</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
