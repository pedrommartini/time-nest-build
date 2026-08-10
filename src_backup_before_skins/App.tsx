import React, { useState, useEffect } from 'react';
import { PreferencesProvider, usePreferences } from './contexts/PreferencesContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { TasksProvider } from './contexts/TasksContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { FocusProvider, useFocus } from './contexts/FocusContext';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '898129156349-qm7fannl6mbgfrhim2ujatddh6tb21sk.apps.googleusercontent.com';

import { TimelineView } from './views/TimelineView';
import { TasksView } from './views/TasksView';
import { FocusView } from './views/FocusView';
import { ProfileView } from './views/ProfileView';
import { OnboardingView } from './views/OnboardingView';
import { UpdateOverlay } from './components/UpdateOverlay';

import { ListTodo, Clock, Zap, User } from 'lucide-react';
import { audio } from './utils/audio';

const AppContent: React.FC = () => {
  const { t } = usePreferences();
  const { isLocked, unlock } = useProfile();
  const { isActive, isPaused, timeRemaining } = useFocus();
  const { activeTab, setActiveTab } = useNavigation();
  
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [showUpdateOverlay, setShowUpdateOverlay] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('timenest_onboarding_completed')) {
      setShowOnboarding(true);
    }
  }, []);

  const INSTALLED_VERSION = '2.1.0';

  React.useEffect(() => {
    const checkUpdate = async () => {
      try {
        const res = await fetch('https://time-nest-two.vercel.app/version.json?t=' + Date.now());
        const data = await res.json();
        
        if (data.version && data.version !== INSTALLED_VERSION) {
          const dismissedVersion = localStorage.getItem('timenest_update_dismissed');
          if (dismissedVersion !== data.version) {
            setLatestVersion(data.version);
            setShowUpdateOverlay(true);
          }
        }
      } catch (e) {
        // Ignora erros de rede se estiver offline
      }
    };

    const timer = setTimeout(checkUpdate, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleApplyUpdate = () => {
    localStorage.setItem('timenest_update_dismissed', latestVersion);
    window.location.href = 'https://time-nest-two.vercel.app';
  };

  const handleDismissUpdate = () => {
    localStorage.setItem('timenest_update_dismissed', latestVersion);
    setShowUpdateOverlay(false);
  };

  // --- Onboarding ---
  if (showOnboarding) {
    return <OnboardingView onComplete={() => setShowOnboarding(false)} />;
  }

  // --- Lock Screen ---
  if (isLocked) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-app-bg px-6 animate-fade-in dot-pattern">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-brand-200">
          <Clock className="w-8 h-8 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">TimeNest</h1>
        <p className="text-text-secondary text-sm mb-12">Digite seu PIN para continuar</p>
        
        <div className="flex gap-4 mb-12">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all ${
                passcodeInput.length > i 
                  ? 'bg-brand-500 scale-110' 
                  : 'bg-border-color'
              } ${passcodeError ? 'bg-red-500 animate-pulse' : ''}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => {
                audio.playClick();
                if (passcodeInput.length < 4) {
                  const newVal = passcodeInput + num;
                  setPasscodeInput(newVal);
                  if (newVal.length === 4) {
                    setTimeout(() => {
                      if (!unlock(newVal)) {
                        setPasscodeError(true);
                        setPasscodeInput('');
                        setTimeout(() => setPasscodeError(false), 500);
                      }
                    }, 100);
                  }
                }
              }}
              className="w-16 h-16 rounded-full bg-card-bg border border-border-color text-xl font-bold text-text-primary flex items-center justify-center hover:bg-border-color/30 active:scale-90 transition-all shadow-sm"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => {
              audio.playClick();
              if (passcodeInput.length < 4) {
                const newVal = passcodeInput + '0';
                setPasscodeInput(newVal);
                if (newVal.length === 4) {
                  setTimeout(() => unlock(newVal), 100);
                }
              }
            }}
            className="w-16 h-16 rounded-full bg-card-bg border border-border-color text-xl font-bold text-text-primary flex items-center justify-center hover:bg-border-color/30 active:scale-90 transition-all shadow-sm"
          >
            0
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setPasscodeInput(prev => prev.slice(0, -1));
            }}
            className="w-16 h-16 rounded-full bg-card-bg/50 border border-border-color/50 text-xs font-bold text-text-secondary flex items-center justify-center hover:bg-border-color/30 active:scale-90 transition-all"
          >
            DEL
          </button>
        </div>
      </div>
    );
  }

  // --- Main App ---
  const formatTimeRemaining = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg dot-pattern overflow-hidden">
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'timeline' && <TimelineView />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'focus' && <FocusView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>

      {/* Global Active Focus Banner (if active but not on focus tab) */}
      {isActive && activeTab !== 'focus' && (
        <div 
          onClick={() => { audio.playClick(); setActiveTab('focus'); }}
          className={`
            absolute bottom-[88px] left-4 right-4 p-3 rounded-2xl shadow-lg border cursor-pointer
            flex items-center justify-between z-40 backdrop-blur-md transition-all animate-slide-up
            ${isPaused ? 'bg-yellow-500/90 border-yellow-400 text-white' : 'bg-brand-600/95 border-brand-500 text-white'}
          `}
        >
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-yellow-200' : 'bg-white animate-pulse'}`}></div>
            <span className="font-bold text-sm">Foco em Andamento</span>
          </div>
          <span className="font-mono font-bold">{formatTimeRemaining(timeRemaining)}</span>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="h-[72px] bg-card-bg border-t border-border-color flex items-center justify-around px-2 z-50 shrink-0">
        {[
          { id: 'timeline', icon: Clock, label: t('timelineTitle') },
          { id: 'tasks', icon: ListTodo, label: t('tasksTitle') },
          { id: 'focus', icon: Zap, label: t('focusTitle') },
          { id: 'profile', icon: User, label: t('profileTitle') }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (activeTab !== tab.id) {
                audio.playClick();
                setActiveTab(tab.id as any);
              }
            }}
            className={`
              relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300
              ${activeTab === tab.id ? 'text-brand-600 dark:text-brand-400' : 'text-text-secondary hover:bg-app-bg'}
            `}
          >
            {activeTab === tab.id && (
              <span className="absolute inset-0 bg-brand-50 dark:bg-brand-900/20 rounded-2xl scale-100 animate-fade-in -z-10" />
            )}
            <tab.icon className={`w-5 h-5 mb-1 ${activeTab === tab.id ? 'fill-brand-600/20' : ''} transition-transform ${activeTab === tab.id ? 'scale-110' : 'scale-100'}`} />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Update Overlay */}
      {showUpdateOverlay && (
        <UpdateOverlay 
          version={latestVersion} 
          onUpdate={handleApplyUpdate} 
          onDismiss={handleDismissUpdate} 
        />
      )}
    </div>
  );
};

export const App = () => {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <PreferencesProvider>
        <NotificationProvider>
          <CalendarProvider>
            <TasksProvider>
              <FocusProvider>
                <ProfileProvider>
                  <NavigationProvider>
                    <div className="w-full h-[100dvh] flex items-center justify-center bg-[#0a0a0a] text-text-primary selection:bg-brand-500/30">
                      <div className="w-full h-full max-w-[500px] bg-app-bg shadow-2xl relative flex flex-col mx-auto overflow-hidden sm:border-x sm:border-border-color">
                        <AppContent />
                      </div>
                    </div>
                  </NavigationProvider>
                </ProfileProvider>
              </FocusProvider>
            </TasksProvider>
          </CalendarProvider>
        </NotificationProvider>
      </PreferencesProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
