// Profile, Achievements, and Security Context for TimeNest

import React, { createContext, useContext, useState, useEffect } from 'react';
import { audio } from '../utils/audio';

export interface UserProfile {
  name: string;
  avatar: string; // URL or base64
  joinedAt: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: string | null;
  icon: string;
}

interface SecuritySettings {
  passcodeEnabled: boolean;
  passcode: string | null;
  requireOnWake: boolean;
}

interface ProfileContextType {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  achievements: Achievement[];
  security: SecuritySettings;
  setSecurity: (s: SecuritySettings) => void;
  isLocked: boolean;
  unlock: (code: string) => boolean;
  lockNow: () => void;
  wipeAllData: () => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const defaultAchievements: Achievement[] = [
  { id: 'first_task', title: 'Primeiro Voo', description: 'Completou a primeira tarefa.', unlockedAt: null, icon: '🌟' },
  { id: 'focus_master', title: 'Mestre do Foco', description: 'Acumulou 10 horas de foco profundo.', unlockedAt: null, icon: '🔥' },
  { id: 'streak_3', title: 'Consistência', description: 'Completou rotinas por 3 dias seguidos.', unlockedAt: null, icon: '📅' },
];

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Visitante',
    avatar: '',
    joinedAt: new Date().toISOString()
  });
  
  const [achievements, _setAchievements] = useState<Achievement[]>(defaultAchievements);
  
  const [security, setSecurity] = useState<SecuritySettings>({
    passcodeEnabled: false,
    passcode: null,
    requireOnWake: false
  });
  
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Load
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('timenest_profile');
      if (savedProfile) setProfile(JSON.parse(savedProfile));
      
      const savedSec = localStorage.getItem('timenest_security');
      if (savedSec) {
        const parsed = JSON.parse(savedSec);
        setSecurity(parsed);
        if (parsed.passcodeEnabled && parsed.requireOnWake) {
          setIsLocked(true);
        }
      }
      
      const savedAchiev = localStorage.getItem('timenest_achievements');
      if (savedAchiev) _setAchievements(JSON.parse(savedAchiev));
    } catch(e) {}
  }, []);

  // Save
  useEffect(() => {
    localStorage.setItem('timenest_profile', JSON.stringify(profile));
  }, [profile]);
  
  useEffect(() => {
    localStorage.setItem('timenest_security', JSON.stringify(security));
  }, [security]);
  
  useEffect(() => {
    localStorage.setItem('timenest_achievements', JSON.stringify(achievements));
  }, [achievements]);

  const unlock = (code: string): boolean => {
    if (security.passcode === code) {
      setIsLocked(false);
      audio.playChimeDone();
      return true;
    }
    return false;
  };

  const lockNow = () => {
    if (security.passcodeEnabled) {
      setIsLocked(true);
    }
  };

  const wipeAllData = () => {
    // Clear everything from local storage
    const keys = [
      'timenest_preferences',
      'timenest_notifications',
      'timenest_tasks',
      'timenest_learning',
      'timenest_events',
      'timenest_margin',
      'timenest_gsync',
      'timenest_focus_stats',
      'timenest_ambient',
      'timenest_profile',
      'timenest_security',
      'timenest_achievements'
    ];
    
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  // Listen to visibility change for requireOnWake
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && security.passcodeEnabled && security.requireOnWake) {
        setIsLocked(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [security]);

  return (
    <ProfileContext.Provider value={{
      profile, setProfile, achievements,
      security, setSecurity, isLocked, unlock, lockNow, wipeAllData
    }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
