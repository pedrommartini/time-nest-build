import React, { useState, useEffect } from 'react';
import { PreferencesProvider, usePreferences } from './contexts/PreferencesContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { TasksProvider } from './contexts/TasksContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { ProjectsProvider } from './contexts/ProjectsContext';
import { MedicationProvider } from './contexts/MedicationContext';
import { GamificationProvider } from './contexts/GamificationContext';
import { FocusProvider, useFocus } from './contexts/FocusContext';
import { ProfileProvider, useProfile } from './contexts/ProfileContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ActiveEventPill } from './components/ActiveEventPill';
import { SmartInputOverlay } from './components/SmartInputOverlay';
import { AlarmManagerProvider } from './contexts/AlarmManagerContext';
import { AlarmOverlay } from './components/AlarmOverlay';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '898129156349-qm7fannl6mbgfrhim2ujatddh6tb21sk.apps.googleusercontent.com';

import { TimelineView } from './views/TimelineView';
import { OrganizeView } from './views/OrganizeView';
import { FocusView } from './views/FocusView';
import { ProfileView } from './views/ProfileView';
import { OnboardingView } from './views/OnboardingView';
import { UpdateOverlay } from './components/UpdateOverlay';

import { Clock, User, Plus, List, Target } from 'lucide-react';
import { audio } from './utils/audio';
import { requestNotificationPermissions } from './utils/notifications';

const AppContent: React.FC = () => {
  const { t } = usePreferences();
  const { isLocked, unlock } = useProfile();
  const { isActive } = useFocus();
  const { activeTab, setActiveTab, isSmartInputOpen, startWithVoice, openSmartInput, closeSmartInput } = useNavigation();
  
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);
  const [showUpdateOverlay, setShowUpdateOverlay] = useState(false);
  const [latestVersion, setLatestVersion] = useState('');
  
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (window.location.pathname === '/download' || window.location.pathname === '/apkdownload') {
      window.location.href = '/timenest.apk';
    }
    if (!localStorage.getItem('timenest_onboarding_completed')) {
      setShowOnboarding(true);
    }
    // Request notification permissions natively on load if in app context
    requestNotificationPermissions();
  }, []);

  const INSTALLED_VERSION = '2.2.0';

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
              className="w-16 h-16 btn-secondary text-xl !rounded-full text-text-primary flex items-center justify-center !p-0"
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
            className="w-16 h-16 btn-secondary text-xl !rounded-full text-text-primary flex items-center justify-center !p-0"
          >
            0
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setPasscodeInput(prev => prev.slice(0, -1));
            }}
            className="w-16 h-16 btn-tertiary text-xs !rounded-full flex items-center justify-center !p-0"
          >
            DEL
          </button>
        </div>
      </div>
    );
  }

  // --- Main App ---

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg paper-texture overflow-hidden">
      
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'timeline' && <TimelineView />}
        {activeTab === 'tasks' && <OrganizeView />}
        {activeTab === 'focus' && <FocusView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>

      {/* Global Active Focus Banner (if active but not on focus tab) */}
      {isActive && activeTab !== 'focus' && (
        <ActiveEventPill />
      )}

      {/* Bottom Navigation */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[420px] h-[82px] bg-white dark:bg-card-bg shadow-[0_8px_30px_rgba(40,30,70,0.08),0_2px_8px_rgba(40,30,70,0.04)] border border-gray-100 dark:border-border-color rounded-[40px] px-1 z-50 flex items-center justify-between pb-[env(safe-area-inset-bottom)]">
        <div className="w-full h-full grid grid-cols-5 items-center relative">
          
          {/* Timeline Tab */}
          <button
            onClick={() => {
              if (activeTab !== 'timeline') {
                audio.playClick();
                setActiveTab('timeline');
              }
            }}
            className={`flex flex-col items-center justify-center h-full relative transition-transform active:scale-95 ${
              activeTab === 'timeline' ? 'text-[#7C3AED] dark:text-brand-400' : 'text-gray-400 hover:text-gray-600 dark:text-text-secondary'
            }`}
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all duration-200 ${
              activeTab === 'timeline' ? 'w-11 h-11 bg-[#7C3AED] rounded-full shadow-md' : 'w-6 h-6'
            }`}>
              <Clock className={`w-5 h-5 ${activeTab === 'timeline' ? 'text-white stroke-[2.5]' : 'stroke-[2]'}`} />
            </div>
            <span className="text-[11px] font-semibold tracking-tight">{t('timelineTitle')}</span>
            {activeTab === 'timeline' && (
              <span className="absolute bottom-1.5 w-5 h-[3px] bg-[#7C3AED] rounded-full animate-fade-in" />
            )}
          </button>

          {/* Tarefas Tab */}
          <button
            onClick={() => {
              if (activeTab !== 'tasks') {
                audio.playClick();
                setActiveTab('tasks');
              }
            }}
            className={`flex flex-col items-center justify-center h-full relative transition-transform active:scale-95 ${
              activeTab === 'tasks' ? 'text-[#7C3AED] dark:text-brand-400' : 'text-gray-400 hover:text-gray-600 dark:text-text-secondary'
            }`}
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all duration-200 ${
              activeTab === 'tasks' ? 'w-11 h-11 bg-[#7C3AED] rounded-full shadow-md' : 'w-6 h-6'
            }`}>
              <List className={`w-5 h-5 ${activeTab === 'tasks' ? 'text-white stroke-[2.5]' : 'stroke-[2]'}`} />
            </div>
            <span className="text-[11px] font-semibold tracking-tight">{t('tasksTitle')}</span>
            {activeTab === 'tasks' && (
              <span className="absolute bottom-1.5 w-5 h-[3px] bg-[#7C3AED] rounded-full animate-fade-in" />
            )}
          </button>

          {/* Central FAB (+) */}
          <div className="flex items-center justify-center h-full relative">
            <button
              onClick={() => {
                audio.playClick();
                openSmartInput(false);
              }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6937F5] to-[#5427E8] text-white flex items-center justify-center shadow-[0_4px_14px_rgba(105,55,245,0.35)] active:scale-95 transition-transform"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Foco Tab */}
          <button
            onClick={() => {
              if (activeTab !== 'focus') {
                audio.playClick();
                setActiveTab('focus');
              }
            }}
            className={`flex flex-col items-center justify-center h-full relative transition-transform active:scale-95 ${
              activeTab === 'focus' ? 'text-[#7C3AED] dark:text-brand-400' : 'text-gray-400 hover:text-gray-600 dark:text-text-secondary'
            }`}
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all duration-200 ${
              activeTab === 'focus' ? 'w-11 h-11 bg-[#7C3AED] rounded-full shadow-md' : 'w-6 h-6'
            }`}>
              <Target className={`w-5 h-5 ${activeTab === 'focus' ? 'text-white stroke-[2.5]' : 'stroke-[2]'}`} />
            </div>
            <span className="text-[11px] font-semibold tracking-tight">{t('focusTitle')}</span>
            {activeTab === 'focus' && (
              <span className="absolute bottom-1.5 w-5 h-[3px] bg-[#7C3AED] rounded-full animate-fade-in" />
            )}
          </button>

          {/* Perfil Tab */}
          <button
            onClick={() => {
              if (activeTab !== 'profile') {
                audio.playClick();
                setActiveTab('profile');
              }
            }}
            className={`flex flex-col items-center justify-center h-full relative transition-transform active:scale-95 ${
              activeTab === 'profile' ? 'text-[#7C3AED] dark:text-brand-400' : 'text-gray-400 hover:text-gray-600 dark:text-text-secondary'
            }`}
          >
            <div className={`flex items-center justify-center mb-0.5 transition-all duration-200 ${
              activeTab === 'profile' ? 'w-11 h-11 bg-[#7C3AED] rounded-full shadow-md' : 'w-6 h-6'
            }`}>
              <User className={`w-5 h-5 ${activeTab === 'profile' ? 'text-white stroke-[2.5]' : 'stroke-[2]'}`} />
            </div>
            <span className="text-[11px] font-semibold tracking-tight">{t('profileTitle')}</span>
            {activeTab === 'profile' && (
              <span className="absolute bottom-1.5 w-5 h-[3px] bg-[#7C3AED] rounded-full animate-fade-in" />
            )}
          </button>

        </div>
      </div>

      <SmartInputOverlay 
        isOpen={isSmartInputOpen}
        startWithVoice={startWithVoice}
        onClose={closeSmartInput}
      />

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
            <ProjectsProvider>
              <MedicationProvider>
                <GamificationProvider>
                  <TasksProvider>
                <FocusProvider>
                  <ProfileProvider>
                    <NavigationProvider>
                      <AlarmManagerProvider>
                        <div className="w-full h-[100dvh] flex items-center justify-center bg-[#E5DFD3] text-text-primary selection:bg-brand-500/30">
                          <div className="w-full h-full max-w-[500px] bg-app-bg shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative flex flex-col mx-auto overflow-hidden sm:border-x sm:border-border-color">
                            <AppContent />
                            <AlarmOverlay />
                          </div>
                        </div>
                      </AlarmManagerProvider>
                    </NavigationProvider>
                  </ProfileProvider>
                </FocusProvider>
                  </TasksProvider>
                </GamificationProvider>
              </MedicationProvider>
            </ProjectsProvider>
          </CalendarProvider>
        </NotificationProvider>
      </PreferencesProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
