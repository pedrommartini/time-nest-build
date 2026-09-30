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
import { useAlarmManager } from '../contexts/AlarmManagerContext';
import { useSync } from '../contexts/SyncContext';
import { useBackHandler } from '../contexts/NavigationContext';
import { audio } from '../utils/audio';
import { runTests } from '../utils/tests';
import type { TestResult as UTResult } from '../utils/tests';
import type { ThemeType, ColorBlindMode } from '../contexts/PreferencesContext';
import { AVAILABLE_SKINS } from '../utils/skins';
import { 
  User, Calendar as CalendarIcon, Settings, Bell, BellOff, ChevronRight, ArrowLeft,
  Shield, Info, Moon, Palette, Check,
  Plus, Volume2, Globe, Crown, Cloud, Download, LogOut,
  Flame, Clock, Star, X, Pill, Trash2, Trophy, Coins, Sparkles, AlertCircle,
  Sun, CheckCircle2, Zap, ArrowUpDown
} from 'lucide-react';
import { 
  cleanUsernameInput, 
  validateUsernameFormat, 
  isUsernameAvailable, 
  generateUsernameSuggestions, 
  reserveUsername 
} from '../utils/username';

export const ProfileView: React.FC = () => {
  const { profile, setProfile, achievements, security, setSecurity, wipeAllData } = useProfile();
  const { 
    theme, setTheme, skin, setSkin, isLowStimulation, setIsLowStimulation, 
    colorBlindMode, setColorBlindMode, fontFamily, setFontFamily, uiScale, setUiScale, 
    sleepStart, setSleepStart, sleepEnd, setSleepEnd, 
    sleepAlarmEnabled, setSleepAlarmEnabled,
    sleep5MinAlarmEnabled, setSleep5MinAlarmEnabled,
    wakeAlarmEnabled, setWakeAlarmEnabled,
    alarmSound, setAlarmSound,
    alarmVisual, setAlarmVisual,
    globalAlarmsEnabled, setGlobalAlarmsEnabled, t 
  } = usePreferences();
  const { googleSync, connectGoogle, disconnectGoogle } = useCalendar();
  const { 
    resetLearning, 
    isSyncingTasks, 
    lastTasksSync, 
    syncGoogleTasksNow, 
    pushAllLocalTasksToGoogle, 
    tasks 
  } = useTasks();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const { stats } = useFocus();
  const { medications, addMedication, toggleMedicationAlarm, deleteMedication } = useMedication();
  const { nests, level } = useGamification();
  const { testAlarm, permissionStatus, requestNotificationPermission, snoozedAlarmsCount } = useAlarmManager();
  const { isOffline, syncState, lastSyncedAt, pendingOfflineCount, syncNow } = useSync();

  const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);

  // Close subscreen when Android back button is pressed
  useBackHandler(() => {
    if (activeSubScreen) {
      audio.playClick();
      setActiveSubScreen(null);
      return true;
    }
    return false;
  }, !!activeSubScreen, 15);

  const [isTestingAlarm, setIsTestingAlarm] = useState<boolean>(false);
  const [testResults, setTestResults] = useState<UTResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  const [newMedName, setNewMedName] = useState('');
  const [newMedTime, setNewMedTime] = useState('08:00');
  const [newMedAlarmEnabled, setNewMedAlarmEnabled] = useState(true);

  const effectiveName = (profile.name === 'Google Agenda Conectada' || !profile.name || profile.name === 'Visitante')
    ? 'Pedro Miranda Martini'
    : profile.name;
  const effectiveEmail = (googleSync.email && googleSync.email !== 'usuario.google@gmail.com')
    ? googleSync.email
    : (profile.email && profile.email !== 'usuario.google@gmail.com' && profile.email !== 'visitante@email.com' ? profile.email : 'pedrovski8tube@gmail.com');
  const effectiveAvatar = profile.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&auto=format&fit=crop&q=80';

  const effectiveUsername = (profile.username === 'pedrovski8tube' || !profile.username || profile.username === 'visitante')
    ? 'pedrovski8'
    : profile.username;

  const userPoints = 386;
  const leaderboardList = [
    { username: 'pedro_vanguard', points: 520 },
    { username: 'lucas_timeflow', points: 475 },
    { username: 'clarissa_zen', points: 410 },
    { username: effectiveUsername, points: userPoints },
    { username: 'alex_cyber', points: 350 },
    { username: 'marina_focus', points: 310 },
    { username: 'tiago_dev', points: 285 },
    { username: 'renata_med', points: 240 },
  ];

  // Edit Profile States
  const [editName, setEditName] = useState(effectiveName);
  const [editUsername, setEditUsername] = useState(effectiveUsername);
  const [editAvatar, setEditAvatar] = useState(effectiveAvatar);
  const [editUsernameError, setEditUsernameError] = useState<string | null>(null);
  const [editUsernameValid, setEditUsernameValid] = useState<boolean>(true);

  const handleOpenEditProfile = () => {
    setEditName(effectiveName);
    const currClean = cleanUsernameInput(effectiveUsername);
    setEditUsername(currClean);
    setEditAvatar(effectiveAvatar);
    setEditUsernameError(null);
    setEditUsernameValid(true);
    setActiveSubScreen('edit-profile');
  };

  const handleEditUsernameChange = (val: string) => {
    const cleaned = cleanUsernameInput(val);
    setEditUsername(cleaned);
    
    if (!cleaned) {
      setEditUsernameValid(false);
      setEditUsernameError('O username não pode ficar vazio.');
      return;
    }
    const format = validateUsernameFormat(cleaned);
    if (!format.isValid) {
      setEditUsernameValid(false);
      setEditUsernameError(format.error);
      return;
    }
    const avail = isUsernameAvailable(cleaned, profile.id);
    if (!avail.available) {
      setEditUsernameValid(false);
      setEditUsernameError(avail.reason || 'Username indisponível.');
      return;
    }
    setEditUsernameValid(true);
    setEditUsernameError(null);
  };

  const handleSaveProfile = () => {
    if (!editUsernameValid || !editName.trim()) return;
    const cleanedUser = cleanUsernameInput(editUsername);
    const reserved = reserveUsername(cleanedUser, profile.id, profile.username);
    if (!reserved) {
      setEditUsernameValid(false);
      setEditUsernameError('Não foi possível reservar este username.');
      return;
    }
    setProfile({
      ...profile,
      name: editName.trim(),
      username: cleanedUser,
      avatar: editAvatar
    });
    audio.playChimeDone();
    setActiveSubScreen(null);
  };

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
  
  const calculateSleepDuration = (start: string, end: string) => {
    if (!start || !end) return '';
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    let totalMin = (eH * 60 + eM) - (sH * 60 + sM);
    if (totalMin < 0) totalMin += 24 * 60;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (m === 0) return `${h} horas de sono`;
    return `${h}h ${m}min de sono`;
  };

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
            <button onClick={() => { audio.playClick(); setActiveSubScreen('alarms'); }} className="w-10 h-10 rounded-full border border-border-color bg-card-bg flex items-center justify-center relative hover:bg-border-color/30 transition-colors shadow-sm">
              <Bell className="w-5 h-5 text-text-primary" />
              {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card-bg"></span>}
            </button>
            <button onClick={() => { audio.playClick(); setActiveSubScreen('appearance'); }} className="w-10 h-10 rounded-full border border-border-color bg-card-bg flex items-center justify-center hover:bg-border-color/30 transition-colors shadow-sm">
              <Settings className="w-5 h-5 text-text-primary" />
            </button>
          </div>
        </div>

        {/* User Card - Linha de cima (Perfil) e Linha de baixo (Leaderboard) */}
        <div className="px-5 mb-6 flex flex-col gap-3">
          {/* Card Superior: Perfil do Usuário (Clique para editar perfil) */}
          <div 
            onClick={() => { audio.playClick(); handleOpenEditProfile(); }}
            className="rounded-3xl p-5 border border-brand-200/50 dark:border-brand-800/30 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-card-bg shadow-sm relative overflow-hidden group cursor-pointer hover:border-brand-300 transition-colors"
          >
            {/* Soft decorative blur */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-200/40 dark:bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-[60px] h-[60px] rounded-full border-[3px] border-white dark:border-border-color shadow-sm overflow-hidden bg-brand-100 flex items-center justify-center shrink-0">
                  {effectiveAvatar ? (
                    <img src={effectiveAvatar} alt={effectiveName} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-brand-500" />
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-text-primary text-base">{effectiveName}</h2>
                  <p className="text-[11px] font-mono font-bold text-brand-600 dark:text-brand-400">@{effectiveUsername}</p>
                  <p className="text-[10px] text-text-secondary mb-1.5">{googleSync.isConnected ? effectiveEmail : 'Modo Local'}</p>
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
          </div>

          {/* Card Inferior: Estatísticas e Atalho para o Leaderboard (Clique para abrir Leaderboard) */}
          <div
            onClick={() => { audio.playClick(); setActiveSubScreen('leaderboard'); }}
            className="rounded-2xl p-4 border border-border-color/80 bg-card-bg shadow-xs relative overflow-hidden group cursor-pointer hover:border-brand-400 dark:hover:border-brand-600 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                Pontuação & Leaderboard
              </span>
              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Ver ranking <ChevronRight className="w-3 h-3" />
              </span>
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
                        <p className="text-[10px] text-green-600 font-medium">Conectado • {effectiveEmail}</p>
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
                        try {
                          const user = await connectGoogle();
                          if (user) {
                            const newProfile = { ...profile };
                            if (user.displayName || user.name) newProfile.name = user.displayName || user.name;
                            if (user.email) newProfile.email = user.email;
                            if (user.imageUrl || user.photoUrl) newProfile.avatar = user.imageUrl || user.photoUrl;
                            setProfile(newProfile);
                          }
                        } catch (err: any) {
                          console.error('Connection error:', err);
                          const code = err?.code || err?.error || err?.status || 'ERRO_GOOGLE';
                          const msg = err?.message || err?.errorMessage || (typeof err === 'string' ? err : JSON.stringify(err));
                          alert(`[Diagnóstico Google Agenda]\nCódigo: ${code}\nDetalhes: ${msg}`);
                        } finally {
                          setIsSyncing(false);
                        }
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

              <button onClick={() => { audio.playClick(); setActiveSubScreen('alarms'); }} className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 dark:bg-pink-950/40 flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Alarmes e Rotinas</p>
                    <p className="text-[10px] text-text-secondary">Sono, medicamentos e notificações</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                    {medications.filter(m => m.alarmEnabled).length} remédios • {sleepStart}
                  </span>
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                </div>
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

              <button onClick={() => { audio.playClick(); setActiveSubScreen('backup'); }} className="p-3 flex items-center justify-between hover:bg-app-bg/50 transition-colors border-b border-border-color/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <Cloud className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-text-primary">Backup e sincronização</p>
                    <p className="text-[9px] text-text-secondary">
                      {isOffline 
                        ? 'Modo Offline' 
                        : lastSyncedAt 
                          ? `Sincronizado: ${new Date(lastSyncedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` 
                          : 'Sincronização em tempo real'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isOffline ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 text-[9px] font-bold">Offline</span>
                  ) : syncState === 'syncing' ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-[9px] font-bold animate-pulse">Sincronizando...</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 text-[9px] font-bold">Nuvem Ativa</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                </div>
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
            <span className="text-[9px] text-text-secondary">Versão 3.1.0</span>
            <span className="text-[9px]">💜</span>
          </div>

        </div>
      </div>

      {/* Sub Screens Layer */}
      {activeSubScreen && (
        <div className="absolute inset-0 bg-app-bg z-30 animate-slide-up flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pt-8 pb-20">
            
            {/* SUB: EDIT PROFILE */}
            {activeSubScreen === 'edit-profile' && (
              <>
                {renderSubScreenHeader('Editar Perfil')}
                <div className="flex flex-col gap-5 max-w-sm mx-auto">
                  
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center justify-center mb-2">
                    <div className="w-20 h-20 rounded-full border-4 border-brand-500/20 shadow-md overflow-hidden bg-brand-100 flex items-center justify-center mb-2 relative">
                      {editAvatar ? (
                        <img src={editAvatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-brand-500" />
                      )}
                    </div>
                    <span className="text-[10px] text-text-secondary">Perfil do Usuário</span>
                  </div>

                  {/* Nome de Exibição */}
                  <div className="card-standard p-4 rounded-2xl">
                    <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Nome de Exibição</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full bg-app-bg text-text-primary px-3 py-2 rounded-xl border border-border-color text-xs focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Username Exclusivo */}
                  <div className="card-standard p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-text-secondary uppercase">Username (@username)</label>
                      <span className="text-[9px] text-text-secondary font-mono">{editUsername.length}/20</span>
                    </div>
                    
                    <div className={`relative flex items-center bg-app-bg rounded-xl border transition-colors px-3 py-2 ${
                      editUsernameError ? 'border-red-500 bg-red-50/10' : editUsernameValid && editUsername ? 'border-green-500 bg-green-50/10' : 'border-border-color focus-within:border-brand-500'
                    }`}>
                      <span className="text-brand-500 font-bold text-xs mr-1">@</span>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => handleEditUsernameChange(e.target.value)}
                        placeholder="seu_username"
                        className="w-full bg-transparent text-text-primary font-mono text-xs focus:outline-none"
                        maxLength={20}
                      />
                      {editUsernameValid && editUsername && (
                        <Check className="w-4 h-4 text-green-500 ml-1 shrink-0" />
                      )}
                      {editUsernameError && (
                        <AlertCircle className="w-4 h-4 text-red-500 ml-1 shrink-0" />
                      )}
                    </div>

                    {editUsernameError && (
                      <p className="text-[10px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                        {editUsernameError}
                      </p>
                    )}
                    {editUsernameValid && editUsername && (
                      <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mt-1.5">
                        ✓ Username reservado exclusivamente para você!
                      </p>
                    )}

                    {/* Auto suggestions */}
                    <div className="mt-3 pt-3 border-t border-border-color/50">
                      <span className="text-[10px] font-bold text-text-secondary mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Sugestões baseadas no seu nome:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {generateUsernameSuggestions(editName || profile.email || 'user', profile.id).map(sugg => (
                          <button
                            key={sugg}
                            type="button"
                            onClick={() => handleEditUsernameChange(sugg)}
                            className={`text-[9px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                              editUsername === cleanUsernameInput(sugg)
                                ? 'bg-brand-500 text-white border-brand-500'
                                : 'bg-app-bg text-text-secondary border-border-color hover:border-brand-400 hover:text-brand-500'
                            }`}
                          >
                            {sugg}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveProfile}
                    disabled={!editUsernameValid || !editName.trim()}
                    className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-bold shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:pointer-events-none mt-2"
                  >
                    <Check className="w-4 h-4" />
                    Salvar Alterações
                  </button>

                </div>
              </>
            )}

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
                          audio.playClick();
                          window.dispatchEvent(new CustomEvent('open_manual_onboarding'));
                        }}
                        className="py-2.5 btn-secondary text-xs mt-2"
                      >
                        Rever Onboarding Completo
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
            
            {/* SUB: ALARMES E ROTINAS (UNIFICADO: SONO + MEDICAMENTOS + NOTIFICAÇÕES) */}
            {activeSubScreen === 'alarms' && (
              <>
                {renderSubScreenHeader('Alarmes e Rotinas')}
                <div className="flex flex-col gap-5">
                  
                  {/* Master Switch */}
                  <div className="p-4 bg-card-bg border border-border-color rounded-2xl flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 pr-3">
                        <p className="text-sm font-bold text-text-primary">Alarmes em Tela Cheia para Tarefas & Eventos</p>
                        <p className="text-[10px] text-text-secondary leading-snug mt-0.5">
                          Ativa automaticamente o disparo em tela cheia com som, vibração e tela ativa para todos os eventos e tarefas agendados do dia.
                        </p>
                        <span className="inline-block mt-1 text-[9px] font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md">
                          ✓ Liga o alarme automaticamente para todas as tarefas e eventos
                        </span>
                      </div>
                      <div 
                        onClick={() => { audio.playClick(); setGlobalAlarmsEnabled(!globalAlarmsEnabled); }}
                        className={`w-10 h-6 rounded-full p-1 flex items-center cursor-pointer shrink-0 transition-colors ${globalAlarmsEnabled ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${globalAlarmsEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                      </div>
                    </div>
                  </div>

                  {/* Web Notifications Permission Status Banner */}
                  <div className="p-4 bg-card-bg border border-border-color rounded-2xl flex flex-col gap-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${permissionStatus === 'granted' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'}`}>
                          <Bell className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-text-primary">Notificações no Navegador / Web</p>
                          <p className="text-[10px] text-text-secondary">
                            {permissionStatus === 'granted' 
                              ? 'Ativadas — os alarmes tocarão mesmo em segundo plano.' 
                              : 'Permita as notificações para receber alarmes fora da aba.'}
                          </p>
                        </div>
                      </div>
                      {permissionStatus === 'granted' ? (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <button
                          onClick={async () => {
                            audio.playClick();
                            await requestNotificationPermission();
                          }}
                          className="px-3 py-1.5 rounded-full btn-primary text-[10px] font-bold shadow-xs hover:brightness-105"
                        >
                          Ativar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resumo de Alarmes Ativos Hoje */}
                  <div className="p-4 bg-gradient-to-br from-brand-50/40 via-card-bg to-card-bg dark:from-brand-950/20 border border-border-color rounded-2xl flex flex-col gap-2 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Status Diário de Alarmes</span>
                      {snoozedAlarmsCount > 0 && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {snoozedAlarmsCount} adiado(s)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 rounded-xl bg-app-bg border border-border-color/40">
                        <span className="block text-xs font-black text-text-primary">{sleepAlarmEnabled ? sleepStart : 'Off'}</span>
                        <span className="text-[8px] text-text-secondary font-bold uppercase">Hora de Dormir</span>
                      </div>
                      <div className="p-2 rounded-xl bg-app-bg border border-border-color/40">
                        <span className="block text-xs font-black text-text-primary">{wakeAlarmEnabled ? sleepEnd : 'Off'}</span>
                        <span className="text-[8px] text-text-secondary font-bold uppercase">Despertador</span>
                      </div>
                      <div className="p-2 rounded-xl bg-app-bg border border-border-color/40">
                        <span className="block text-xs font-black text-text-primary">{medications.filter(m => m.alarmEnabled !== false).length}</span>
                        <span className="text-[8px] text-text-secondary font-bold uppercase">Remédios</span>
                      </div>
                    </div>
                  </div>

                  {/* Hub de Teste e Simulação de Alarmes */}
                  <div className="p-4 bg-card-bg border border-border-color rounded-2xl flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                        <span>Central de Testes de Alarme</span>
                      </h4>
                      <span className="text-[9px] text-text-secondary font-semibold">Web & Mobile</span>
                    </div>

                    <p className="text-[10px] text-text-secondary leading-tight">
                      Toque para testar instantaneamente qualquer uma das telas de alarme aprovadas:
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => { audio.playClick(); testAlarm('task', 0); }}
                        className="py-2.5 px-3 rounded-xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300 text-xs font-bold flex items-center gap-2 hover:brightness-105 transition-all text-left"
                      >
                        <Zap className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <div>
                          <p className="leading-none">🎯 Tarefa</p>
                          <span className="text-[8px] font-normal opacity-75">Começar foco agora</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { audio.playClick(); testAlarm('event', 0); }}
                        className="py-2.5 px-3 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 text-purple-800 dark:text-purple-300 text-xs font-bold flex items-center gap-2 hover:brightness-105 transition-all text-left"
                      >
                        <CalendarIcon className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <div>
                          <p className="leading-none">📅 Evento</p>
                          <span className="text-[8px] font-normal opacity-75">Em 15 min / Preparar</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { audio.playClick(); testAlarm('wake', 0); }}
                        className="py-2.5 px-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2 hover:brightness-105 transition-all text-left"
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <div>
                          <p className="leading-none">☀️ Despertador</p>
                          <span className="text-[8px] font-normal opacity-75">Hora de acordar</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { audio.playClick(); testAlarm('sleep', 0); }}
                        className="py-2.5 px-3 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300 text-xs font-bold flex items-center gap-2 hover:brightness-105 transition-all text-left"
                      >
                        <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <div>
                          <p className="leading-none">🌙 Sono</p>
                          <span className="text-[8px] font-normal opacity-75">Hora de dormir</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { audio.playClick(); testAlarm('medication', 0); }}
                        className="py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 hover:brightness-105 transition-all text-left"
                      >
                        <Pill className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <div>
                          <p className="leading-none">💊 Remédio</p>
                          <span className="text-[8px] font-normal opacity-75">Tomar medicamento</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          if (!isTestingAlarm) {
                            audio.playClick();
                            setIsTestingAlarm(true);
                            testAlarm('test', 10);
                            setTimeout(() => setIsTestingAlarm(false), 10000);
                          }
                        }}
                        disabled={isTestingAlarm}
                        className="py-2.5 px-3 rounded-xl border border-brand-200 dark:border-brand-900/40 bg-brand-50/50 dark:bg-brand-950/20 text-brand-800 dark:text-brand-300 text-xs font-bold flex items-center gap-2 hover:brightness-105 transition-all text-left disabled:opacity-50"
                      >
                        {isTestingAlarm ? (
                          <div className="w-3.5 h-3.5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        )}
                        <div>
                          <p className="leading-none">{isTestingAlarm ? 'Em 10s...' : '⏱️ Timer 10s'}</p>
                          <span className="text-[8px] font-normal opacity-75">Teste com atraso</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* SEÇÃO 1: ROTINA DE SONO */}
                  <div className="bg-card-bg p-5 rounded-3xl border border-border-color flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 flex items-center justify-center">
                          <Moon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary text-sm">Rotina de Sono</h3>
                          <p className="text-[10px] text-text-secondary">Defina suas horas de dormir e acordar.</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {calculateSleepDuration(sleepStart, sleepEnd)}
                      </span>
                    </div>

                    <div className="h-[1px] bg-border-color w-full"></div>

                    <div className="flex flex-col gap-3.5">
                      {/* Hora de Dormir */}
                      <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-app-bg/60 border border-border-color/60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Moon className="w-4 h-4 text-indigo-500" />
                            <span className="text-xs font-semibold text-text-primary">Hora de Dormir</span>
                          </div>
                          <input 
                            type="time" 
                            value={sleepStart}
                            onChange={(e) => {
                              if (e.target.value) setSleepStart(e.target.value);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-card-bg border border-border-color text-xs text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border-color/30 mt-1">
                          <span className="text-[10px] text-text-secondary">Alarme de hora de dormir</span>
                          <button
                            type="button"
                            onClick={() => { audio.playClick(); setSleepAlarmEnabled(!sleepAlarmEnabled); }}
                            className={`w-8 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                              sleepAlarmEnabled ? 'bg-indigo-600 justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                          </button>
                        </div>

                        {sleepAlarmEnabled && (
                          <div className="flex items-center justify-between pt-2 border-t border-border-color/20">
                            <span className="text-[10px] text-text-secondary">Tocar 5 min antes para preparação</span>
                            <button
                              type="button"
                              onClick={() => { audio.playClick(); setSleep5MinAlarmEnabled(!sleep5MinAlarmEnabled); }}
                              className={`w-8 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                                sleep5MinAlarmEnabled ? 'bg-indigo-400 justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'
                              }`}
                            >
                              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Hora de Acordar */}
                      <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-app-bg/60 border border-border-color/60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-semibold text-text-primary">Hora de Acordar</span>
                          </div>
                          <input 
                            type="time" 
                            value={sleepEnd}
                            onChange={(e) => {
                              if (e.target.value) setSleepEnd(e.target.value);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-card-bg border border-border-color text-xs text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border-color/30 mt-1">
                          <span className="text-[10px] text-text-secondary">Despertador matinal no horário</span>
                          <button
                            type="button"
                            onClick={() => { audio.playClick(); setWakeAlarmEnabled(!wakeAlarmEnabled); }}
                            className={`w-8 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                              wakeAlarmEnabled ? 'bg-amber-500 justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SEÇÃO 2: HORÁRIO DE MEDICAMENTOS */}
                  <div className="card-standard p-5 rounded-3xl border border-border-color flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 flex items-center justify-center">
                        <Pill className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary text-sm">Medicamentos & Lembretes</h3>
                        <p className="text-[10px] text-text-secondary">Adicione seus remédios e horários de dose diária.</p>
                      </div>
                    </div>

                    <div className="h-[1px] bg-border-color w-full"></div>

                    {/* Form Adicionar */}
                    <div className="flex flex-col gap-2.5 p-3 rounded-2xl bg-app-bg/60 border border-border-color/60">
                      <input 
                        type="text" 
                        placeholder="Nome do remédio (ex: Vitamina D, Ritalina)"
                        value={newMedName}
                        onChange={(e) => setNewMedName(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-card-bg border border-border-color text-xs text-text-primary w-full focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-[11px] font-bold text-text-primary">Alarme ativo</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNewMedAlarmEnabled(!newMedAlarmEnabled)}
                          className={`w-8 h-5 rounded-full transition-colors p-0.5 flex items-center ${
                            newMedAlarmEnabled ? 'bg-rose-500 justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input 
                          type="time" 
                          value={newMedTime}
                          onChange={(e) => setNewMedTime(e.target.value)}
                          className="w-28 px-3 py-2 rounded-xl bg-card-bg border border-border-color text-xs text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                        />
                        <button 
                          onClick={async () => {
                            if (newMedName.trim()) {
                              await addMedication(newMedName.trim(), newMedTime, newMedAlarmEnabled);
                              setNewMedName('');
                            }
                          }}
                          disabled={!newMedName.trim()}
                          className="flex-1 btn-primary text-xs py-2 disabled:opacity-50"
                        >
                          Adicionar Remédio
                        </button>
                      </div>
                    </div>

                    {/* Lista de Medicamentos */}
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Remédios Cadastrados ({medications.length})</span>
                      {medications.length === 0 ? (
                        <p className="text-xs text-text-secondary text-center py-4 bg-app-bg/30 rounded-2xl border border-dashed border-border-color">
                          Nenhum medicamento adicionado ainda.
                        </p>
                      ) : (
                        medications.map(med => (
                          <div key={med.id} className="p-3 bg-app-bg rounded-2xl border border-border-color flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                med.alarmEnabled ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/40' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'
                              }`}>
                                <Pill className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-bold text-text-primary text-xs">{med.name}</h4>
                                <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">Todos os dias às {med.time}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => toggleMedicationAlarm(med.id)}
                                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold ${
                                  med.alarmEnabled
                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                                    : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 border border-transparent'
                                }`}
                              >
                                {med.alarmEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                                <span>{med.alarmEnabled ? 'Ligado' : 'Desligado'}</span>
                              </button>
                              <button 
                                onClick={() => deleteMedication(med.id)}
                                className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* SEÇÃO 3: ESTILO & PERSONALIZAÇÃO DO ALARME */}
                  <div className="flex flex-col gap-4 bg-card-bg p-5 border border-border-color rounded-3xl shadow-xs">
                    <h3 className="font-bold text-sm text-text-primary">Estilo do Alarme</h3>
                    
                    <div>
                      <span className="text-[10px] font-bold text-text-secondary uppercase mb-2 block">Som do Toque (Toque para ouvir)</span>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          { key: 'chime', label: '🔔 Sino Melódico' },
                          { key: 'radar', label: '📡 Radar (Claro)' },
                          { key: 'gentle', label: '🎵 Suave Kalimba' },
                          { key: 'rain', label: '🌧️ Chuva Relax' },
                          { key: 'forest', label: '🌲 Floresta' },
                          { key: 'waves', label: '🌊 Ondas Oceano' },
                          { key: 'cafe', label: '☕ Café Aconchegante' }
                        ] as const).map(item => (
                          <button
                            key={item.key}
                            onClick={() => { 
                              audio.playClick(); 
                              setAlarmSound(item.key);
                              audio.previewSound(item.key);
                            }}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                              alarmSound === item.key ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/10 dark:text-brand-400 ring-1 ring-brand-500/30' : 'border-border-color bg-app-bg text-text-primary hover:border-brand-300'
                            }`}
                          >
                            <span>{item.label}</span>
                            {alarmSound === item.key && <Check className="w-3 h-3 text-brand-600 dark:text-brand-400" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-1">
                      <span className="text-[10px] font-bold text-text-secondary uppercase mb-2 block">Estilo Visual</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => { audio.playClick(); setAlarmVisual('minimal'); }}
                          className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all ${
                            alarmVisual === 'minimal' ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/10 dark:text-brand-400' : 'border-border-color bg-app-bg text-text-primary hover:border-brand-300'
                          }`}
                        >
                          Minimalista (Calmo)
                        </button>
                        <button
                          onClick={() => { audio.playClick(); setAlarmVisual('gamified'); }}
                          className={`py-2 px-1 text-center rounded-xl border text-xs font-bold transition-all ${
                            alarmVisual === 'gamified' ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/10 dark:text-brand-400' : 'border-border-color bg-app-bg text-text-primary hover:border-brand-300'
                          }`}
                        >
                          Interativo (Despertar)
                        </button>
                      </div>
                      {alarmVisual === 'gamified' && (
                        <p className="text-[10px] text-brand-600 dark:text-brand-400 mt-2">
                          Requer completar um desafio para desligar, ideal para focar ou acordar de vez.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* SEÇÃO 4: HISTÓRICO DE NOTIFICAÇÕES */}
                  <div className="bg-card-bg p-5 rounded-3xl border border-border-color flex flex-col gap-3 shadow-xs">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-sm text-text-primary">Notificações Recentes</h3>
                      {notifications.length > 0 && (
                        <button onClick={clearAll} className="text-[10px] font-bold text-brand-600">Limpar Tudo</button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="py-6 flex flex-col items-center justify-center text-center opacity-50">
                        <Bell className="w-8 h-8 text-text-secondary mb-2" />
                        <p className="text-xs font-semibold text-text-primary">Nenhuma notificação pendente.</p>
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 rounded-2xl border ${n.read ? 'bg-app-bg border-border-color opacity-70' : 'bg-brand-50/50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800'}`}>
                          <div className="flex justify-between items-start mb-1">
                            <h4 className={`text-xs font-bold ${n.read ? 'text-text-primary' : 'text-brand-700 dark:text-brand-300'}`}>{n.title}</h4>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1"></span>}
                          </div>
                          <p className="text-[11px] text-text-secondary mb-2 leading-relaxed">{n.message}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-text-secondary uppercase tracking-wider">{new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            {!n.read && (
                              <button onClick={() => markAsRead(n.id)} className="text-[9px] font-bold text-brand-600">Marcar como lida</button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              </>
            )}

            {/* SUB: BACKUP & SINCRONIZAÇÃO */}
            {activeSubScreen === 'backup' && (
              <>
                {renderSubScreenHeader('Backup e Sincronização')}
                <div className="flex flex-col gap-4 max-w-sm mx-auto">
                  
                  {/* Card Status da Nuvem */}
                  <div className="card-standard p-4 rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                          <Cloud className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-text-primary">Nuvem Time Nest</h4>
                          <p className="text-[10px] text-text-secondary">{profile.email || 'Conta Local'}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isOffline 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' 
                          : syncState === 'syncing' 
                            ? 'bg-blue-100 text-blue-700 animate-pulse' 
                            : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                      }`}>
                        {isOffline ? 'Offline' : syncState === 'syncing' ? 'Sincronizando' : 'Ativo'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-border-color/50 flex flex-col gap-1 text-[10px] text-text-secondary">
                      <div className="flex justify-between">
                        <span>Último backup:</span>
                        <span className="font-medium text-text-primary">
                          {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Pendente'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fila offline pendente:</span>
                        <span className="font-medium text-text-primary">{pendingOfflineCount} itens</span>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        audio.playClick();
                        await syncNow();
                        audio.playChimeDone();
                      }}
                      disabled={isOffline || syncState === 'syncing'}
                      className="w-full py-2.5 mt-2 rounded-xl btn-primary text-xs font-bold flex items-center justify-center gap-2 hover:brightness-105 transition-all disabled:opacity-50"
                    >
                      {syncState === 'syncing' ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Sincronizar Agora
                        </>
                      )}
                    </button>
                  </div>

                  {/* Card Google Integrations */}
                  <div className="card-standard p-4 rounded-2xl flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-text-primary uppercase tracking-wider">Integrações Google (Nuvem)</h4>
                      {googleSync.isConnected && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Nuvem Ativa
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-app-bg border border-border-color/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CalendarIcon className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs font-bold text-text-primary">Google Agenda & Google Tasks</p>
                            <p className="text-[10px] text-text-secondary">
                              {googleSync.isConnected ? (googleSync.email || 'Conectado') : 'Não conectado'}
                            </p>
                          </div>
                        </div>
                        {googleSync.isConnected ? (
                          <button 
                            onClick={() => { audio.playClick(); disconnectGoogle(); }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
                          >
                            Desconectar
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              audio.playClick();
                              await connectGoogle();
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
                          >
                            Conectar
                          </button>
                        )}
                      </div>

                      {googleSync.isConnected && (
                        <div className="pt-2 mt-1 border-t border-border-color/40 flex flex-col gap-2">
                          <div className="flex items-center justify-between text-[10px] text-text-secondary">
                            <span>Sincronização de Tarefas (Google Tasks):</span>
                            <span className="font-semibold text-text-primary">
                              {tasks.filter(t => t.source === 'google' || t.id.startsWith('google-')).length} de {tasks.length} na nuvem
                            </span>
                          </div>

                          {lastTasksSync && (
                            <p className="text-[9px] text-text-secondary italic">
                              Última sincronização: {new Date(lastTasksSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={async () => {
                                audio.playClick();
                                await syncGoogleTasksNow();
                              }}
                              disabled={isSyncingTasks}
                              className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/30 hover:bg-brand-100 flex items-center justify-center gap-1 transition-colors"
                            >
                              <ArrowUpDown className={`w-3 h-3 ${isSyncingTasks ? 'animate-spin' : ''}`} />
                              {isSyncingTasks ? 'Sincronizando tarefas...' : 'Sincronizar Tarefas Agora'}
                            </button>

                            {tasks.some(t => !t.id.startsWith('google-') && t.source !== 'google') && (
                              <button
                                onClick={async () => {
                                  audio.playClick();
                                  await pushAllLocalTasksToGoogle();
                                }}
                                disabled={isSyncingTasks}
                                className="py-1.5 px-2.5 rounded-lg text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                              >
                                Subir locais ({tasks.filter(t => !t.id.startsWith('google-') && t.source !== 'google').length})
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* SUB: LEADERBOARD (RANKING & PONTUAÇÃO DO USUÁRIO) */}
            {activeSubScreen === 'leaderboard' && (
              <>
                {renderSubScreenHeader('LEADERBOARD')}
                <div className="flex flex-col gap-4 max-w-sm mx-auto">
                  
                  {/* Card 1: PONTUAÇÃO DO USUÁRIO */}
                  <div className="p-5 bg-gradient-to-br from-card-bg via-card-bg to-brand-50/20 dark:to-brand-950/20 border-2 border-border-color rounded-3xl shadow-sm flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-border-color/60 pb-3">
                      <div>
                        <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">Status Individual</span>
                        <h3 className="text-base font-black text-text-primary uppercase tracking-wide">Pontuação do Usuário</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-brand-600 dark:text-brand-400 font-mono">
                          {userPoints}
                        </span>
                        <span className="block text-[9px] text-text-secondary font-bold uppercase">pontos</span>
                      </div>
                    </div>

                    {/* Resumo em 4 colunas como no perfil */}
                    <div className="grid grid-cols-4 gap-2 text-center py-1">
                      <div className="p-2 rounded-xl bg-app-bg border border-border-color/50 flex flex-col items-center">
                        <Coins className="w-4 h-4 text-yellow-500 mb-1" />
                        <span className="font-bold text-text-primary text-xs">{nests}</span>
                        <span className="text-[7.5px] text-text-secondary uppercase font-semibold">Nests</span>
                      </div>
                      <div className="p-2 rounded-xl bg-app-bg border border-border-color/50 flex flex-col items-center">
                        <Flame className="w-4 h-4 text-orange-500 mb-1" />
                        <span className="font-bold text-text-primary text-xs">12</span>
                        <span className="text-[7.5px] text-text-secondary uppercase font-semibold">Dias Seq.</span>
                      </div>
                      <div className="p-2 rounded-xl bg-app-bg border border-border-color/50 flex flex-col items-center">
                        <Clock className="w-4 h-4 text-green-500 mb-1" />
                        <span className="font-bold text-text-primary text-xs">{Math.floor(stats.focusMinutesToday / 60) || 48}h</span>
                        <span className="text-[7.5px] text-text-secondary uppercase font-semibold">Foco</span>
                      </div>
                      <div className="p-2 rounded-xl bg-app-bg border border-border-color/50 flex flex-col items-center">
                        <Star className="w-4 h-4 text-blue-500 mb-1" />
                        <span className="font-bold text-text-primary text-xs">{achievements.filter(a => a.unlockedAt).length || 7}</span>
                        <span className="text-[7.5px] text-text-secondary uppercase font-semibold">Conquistas</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-[11px]">
                      <span className="font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        Posição Atual: #4 no Ranking
                      </span>
                      <span className="text-text-secondary font-mono font-medium">Top 5% Global</span>
                    </div>
                  </div>

                  {/* Card 2: RANKING GERAL DOS USUÁRIOS */}
                  <div className="p-5 bg-card-bg border-2 border-border-color rounded-3xl shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1 pb-2 border-b border-border-color/60">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Usuário</span>
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Pontos</span>
                    </div>

                    {/* Lista com todos os usernames */}
                    <div className="flex flex-col gap-2">
                      {leaderboardList.map((item, idx) => {
                        const isCurrent = item.username === effectiveUsername;
                        return (
                          <div 
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                              isCurrent 
                                ? 'border-brand-500 bg-brand-500/10 shadow-xs ring-1 ring-brand-500/30' 
                                : 'border-border-color/60 bg-app-bg/50 hover:bg-app-bg'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-6 text-center text-xs font-bold ${
                                idx === 0 ? 'text-yellow-500 text-sm' : idx === 1 ? 'text-slate-400 text-sm' : idx === 2 ? 'text-amber-700 text-sm' : 'text-text-secondary'
                              }`}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-brand-600 dark:text-brand-400 font-extrabold' : 'text-text-primary'}`}>
                                  @{item.username}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">
                                    Você
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="font-mono font-black text-xs text-text-primary">
                              {item.points}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* continua.... exatamente como no wireframe */}
                    <div className="text-center py-4 text-xs font-bold text-text-secondary tracking-widest uppercase">
                      continua....
                    </div>
                  </div>

                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
