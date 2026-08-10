// Profile and Settings View for TimeNest

import React, { useState } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { usePreferences } from '../contexts/PreferencesContext';
import { useCalendar } from '../contexts/CalendarContext';
import { useTasks } from '../contexts/TasksContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useFocus } from '../contexts/FocusContext';
import { audio } from '../utils/audio';
import { runTests } from '../utils/tests';
import type { TestResult as UTResult } from '../utils/tests';
import type { ThemeType, ColorBlindMode } from '../contexts/PreferencesContext';
import { 
  User, Calendar as CalendarIcon, Settings, Bell, ChevronRight, ArrowLeft,
  Shield, Eye, RefreshCw, Info, Moon
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { profile, setProfile, achievements, security, setSecurity, wipeAllData } = useProfile();
  const { 
    theme, setTheme, isLowStimulation, setIsLowStimulation, 
    colorBlindMode, setColorBlindMode, uiScale, setUiScale, 
    isTestEnvironment, setIsTestEnvironment, 
    sleepStart, setSleepStart, sleepEnd, setSleepEnd, t 
  } = usePreferences();
  const { googleSync, connectGoogle, disconnectGoogle, syncGoogleNow } = useCalendar();
  const { resetLearning } = useTasks();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const { stats } = useFocus();

  const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<UTResult[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

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
    <div className="h-full flex flex-col bg-app-bg animate-fade-in relative pb-20">
      
      {/* Main Profile View */}
      <div className={`flex-1 overflow-y-auto custom-scrollbar transition-transform duration-300 ${activeSubScreen ? '-translate-x-full absolute opacity-0' : 'translate-x-0'}`}>
        {/* Header Profile Info */}
        <div className="px-5 pt-8 pb-6 border-b border-border-color bg-card-bg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center border-2 border-brand-200 dark:border-brand-800/50 shadow-inner overflow-hidden">
                {profile.avatar && googleSync.isConnected ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-brand-500" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  {googleSync.isConnected ? profile.name : 'Usuário Não Conectado'}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {googleSync.isConnected 
                    ? `Membro desde ${new Date(profile.joinedAt).getFullYear()}`
                    : 'Modo Local'}
                </p>
              </div>
            </div>
            
            {/* Ambiente Switcher Button */}
            <button
              onClick={() => {
                audio.playClick();
                setIsTestEnvironment(!isTestEnvironment);
              }}
              className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                isTestEnvironment 
                  ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:bg-yellow-950/20 dark:text-yellow-400 animate-pulse' 
                  : 'bg-card-bg text-text-secondary border-border-color hover:bg-border-color/30'
              }`}
            >
              {isTestEnvironment ? 'Modo Teste' : 'Modo Real'}
            </button>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-app-bg p-3 rounded-2xl border border-border-color flex flex-col">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Foco Hoje</span>
              <span className="text-lg font-bold text-brand-600 dark:text-brand-400">{stats.focusMinutesToday} <span className="text-xs font-normal text-text-secondary">min</span></span>
            </div>
            <div className="bg-app-bg p-3 rounded-2xl border border-border-color flex flex-col">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider mb-1">Conquistas</span>
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-500">{achievements.filter(a => a.unlockedAt).length} <span className="text-xs font-normal text-text-secondary">/ {achievements.length}</span></span>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="px-5 py-6 flex flex-col gap-6">
          
          {/* Section: General */}
          <div>
            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-3 px-1">Configurações Gerais</h3>
            <div className="bg-card-bg rounded-3xl border border-border-color overflow-hidden flex flex-col">
              
              <button onClick={() => { audio.playClick(); setActiveSubScreen('appearance'); }} className="flex items-center justify-between p-4 border-b border-border-color hover:bg-app-bg/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 flex items-center justify-center"><Eye className="w-4 h-4" /></div>
                  <span className="font-semibold text-text-primary text-sm">Aparência e Acessibilidade</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>

              <button onClick={() => { audio.playClick(); setActiveSubScreen('sleep'); }} className="flex items-center justify-between p-4 border-b border-border-color hover:bg-app-bg/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 flex items-center justify-center"><Moon className="w-4 h-4" /></div>
                  <span className="font-semibold text-text-primary text-sm">Sono</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">{sleepStart} - {sleepEnd}</span>
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                </div>
              </button>

              {!isTestEnvironment && (
                <button onClick={() => { audio.playClick(); setActiveSubScreen('calendar'); }} className="flex items-center justify-between p-4 border-b border-border-color hover:bg-app-bg/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 flex items-center justify-center"><CalendarIcon className="w-4 h-4" /></div>
                    <span className="font-semibold text-text-primary text-sm">Integrações (Google Agenda)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {googleSync.isConnected && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                    <ChevronRight className="w-4 h-4 text-text-secondary" />
                  </div>
                </button>
              )}

              <button onClick={() => { audio.playClick(); setActiveSubScreen('notifications'); }} className="flex items-center justify-between p-4 border-b border-border-color hover:bg-app-bg/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400 flex items-center justify-center"><Bell className="w-4 h-4" /></div>
                  <span className="font-semibold text-text-primary text-sm">Notificações ({unreadCount})</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
              
              <button onClick={() => { audio.playClick(); setActiveSubScreen('intelligence'); }} className="flex items-center justify-between p-4 hover:bg-app-bg/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400 flex items-center justify-center"><Settings className="w-4 h-4" /></div>
                  <span className="font-semibold text-text-primary text-sm">{t('profileIntelligence')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>

          {/* Section: Advanced */}
          <div>
            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-3 px-1">Avançado</h3>
            <div className="bg-card-bg rounded-3xl border border-border-color overflow-hidden flex flex-col">
              
              <button onClick={() => { audio.playClick(); setActiveSubScreen('security'); }} className="flex items-center justify-between p-4 border-b border-border-color hover:bg-app-bg/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400 flex items-center justify-center"><Shield className="w-4 h-4" /></div>
                  <span className="font-semibold text-text-primary text-sm">{t('profileSecurity')}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-secondary" />
              </button>
              
              <div className="p-4 bg-app-bg">
                <p className="text-center text-[10px] text-text-secondary">TimeNest Prototype v0.1.0<br/>Processamento Local & Offline-first</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sub Screens Layer */}
      {activeSubScreen && (
        <div className="absolute inset-0 bg-app-bg z-30 animate-slide-up flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 pt-8 pb-20">
            
            {/* SUB: APPEARANCE */}
            {activeSubScreen === 'appearance' && (
              <>
                {renderSubScreenHeader('Aparência e Acessibilidade')}
                <div className="flex flex-col gap-6">
                  
                  <div>
                    <span className="text-[10px] font-bold text-text-secondary uppercase mb-2 block">Tema do Aplicativo</span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['light', 'dark', 'system'] as ThemeType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => { audio.playClick(); setTheme(t); }}
                          className={`py-3 rounded-xl border text-xs font-bold transition-all ${
                            theme === t ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/10 dark:text-brand-400' : 'border-border-color bg-card-bg text-text-primary'
                          }`}
                        >
                          {t === 'light' ? 'Claro' : t === 'dark' ? 'Escuro' : 'Sistema'}
                        </button>
                      ))}
                    </div>
                  </div>

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
                            colorBlindMode === mode ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/10 dark:text-brand-400' : 'border-border-color bg-card-bg text-text-primary'
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

            {/* SUB: CALENDAR / INTEGRATIONS */}
            {activeSubScreen === 'calendar' && (
              <>
                {renderSubScreenHeader('Google Agenda')}
                <div className="flex flex-col gap-5">
                  <div className="bg-card-bg p-5 rounded-3xl border border-border-color text-center flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-4 border border-blue-100">
                      <CalendarIcon className="w-8 h-8" />
                    </div>
                    
                    {googleSync.isConnected ? (
                      <>
                        <h3 className="font-bold text-text-primary mb-1">Conectado ao Google Agenda</h3>
                        <p className="text-xs text-text-secondary mb-6">Eventos sincronizados na sua Linha do Tempo.</p>
                        
                        <button 
                          onClick={async () => {
                            setIsSyncing(true);
                            await syncGoogleNow();
                            setIsSyncing(false);
                          }}
                          disabled={isSyncing}
                          className="w-full py-3.5 mb-3 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-2xl text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                          {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                        </button>
                        
                        <button 
                          onClick={disconnectGoogle}
                          className="w-full py-3.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-2xl text-xs font-bold transition-colors"
                        >
                          Desconectar
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex flex-col gap-5 text-left">
                        <div className="text-center mb-2">
                          <h3 className="font-bold text-text-primary mb-1">Importar Google Agenda</h3>
                          <p className="text-xs text-text-secondary px-2">Sincronize seus eventos reais e conecte seu perfil do Google.</p>
                        </div>

                        {/* Google Auth Account Login */}
                        <button 
                          onClick={async () => {
                            setIsSyncing(true);
                            const user = await connectGoogle();
                            if (user) {
                              const newProfile = { ...profile };
                              if (user.displayName || user.name) newProfile.name = user.displayName || user.name;
                              if (user.imageUrl || user.photoUrl) newProfile.avatar = user.imageUrl || user.photoUrl;
                              setProfile(newProfile);
                            }
                            setIsSyncing(false);
                          }}
                          disabled={isSyncing}
                          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-colors flex items-center justify-center shadow-md shadow-blue-500/30 disabled:opacity-50"
                        >
                          {isSyncing ? 'Conectando...' : 'Conectar via Conta Google'}
                        </button>
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
                      className="w-full py-2 bg-brand-50 hover:bg-brand-105 hover:text-brand-700 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 text-xs font-bold rounded-full active:scale-95 transition-all flex items-center justify-center gap-2"
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
                    className="w-full py-2.5 bg-card-bg border border-red-200 text-red-600 hover:bg-red-500/5 text-xs font-bold rounded-full active:scale-95 transition-all mt-2"
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
                        className="py-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl hover:bg-blue-200 transition-colors mt-2"
                      >
                        Re-exibir Tela de Onboarding
                      </button>
                      
                      <button 
                        onClick={() => {
                          if (confirm('Tem certeza que deseja DELETAR todos os dados locais do aplicativo? Esta ação é irreversível.')) {
                            wipeAllData();
                          }
                        }}
                        className="py-2.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-xs rounded-xl hover:bg-red-200 transition-colors"
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
                  <div className="flex justify-between items-center mb-2">
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
