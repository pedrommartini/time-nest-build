// Sync and Cloud Persistence Engine for TimeNest

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

export interface UserCloudData {
  version: number;
  updatedAt: string; // ISO string
  accountEmail?: string;
  profile?: any;
  security?: any;
  energyLevel?: any;
  achievements?: any;
  tasks?: any[];
  events?: any[];
  medications?: any[];
  projects?: any[];
  gamification?: any;
  preferences?: any;
  focusStats?: any;
  onboardingCompleted?: boolean;
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline';

interface SyncContextType {
  isOffline: boolean;
  syncState: SyncState;
  lastSyncedAt: string | null;
  triggerSyncStatus: (state: SyncState) => void;
  syncNow: () => Promise<void>;
  saveCloudBackup: (accountEmail: string) => void;
  hasCloudDataForAccount: (accountEmail: string) => boolean;
  hydrateAccountFromCloud: (accountEmail: string) => boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

const CLOUD_STORAGE_PREFIX = 'timenest_cloud_user_';

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [syncState, setSyncState] = useState<SyncState>(!navigator.onLine ? 'offline' : 'idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return localStorage.getItem('timenest_last_cloud_sync') || null;
  });

  const syncTimerRef = useRef<any>(null);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      triggerSyncStatus('syncing');
      syncNow().then(() => {
        triggerSyncStatus('synced');
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      setSyncState('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSyncStatus = useCallback((status: SyncState) => {
    if (!navigator.onLine && status !== 'offline') {
      setSyncState('offline');
      return;
    }

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    setSyncState(status);

    if (status === 'synced') {
      const nowIso = new Date().toISOString();
      setLastSyncedAt(nowIso);
      localStorage.setItem('timenest_last_cloud_sync', nowIso);

      // Hide "Sincronizado!" toast after 2 seconds
      syncTimerRef.current = setTimeout(() => {
        setSyncState(navigator.onLine ? 'idle' : 'offline');
      }, 2000);
    }
  }, []);

  /**
   * Helper to gather all local data into a unified cloud package
   */
  const gatherAllLocalData = useCallback((): UserCloudData => {
    const safeParse = (key: string, fallback: any) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
      } catch (e) {
        return fallback;
      }
    };

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      profile: safeParse('timenest_profile', null),
      security: safeParse('timenest_security', null),
      energyLevel: localStorage.getItem('timenest_energy') || 'Média',
      achievements: safeParse('timenest_achievements', []),
      tasks: safeParse('timenest_tasks', []),
      events: safeParse('timenest_events', []),
      medications: safeParse('timenest_medications', []),
      projects: safeParse('timenest_projects', []),
      gamification: {
        nests: Number(localStorage.getItem('timenest_nests') || 0),
        level: Number(localStorage.getItem('timenest_level') || 1),
        streak: Number(localStorage.getItem('timenest_streak') || 0),
        history: safeParse('timenest_gamification_history', []),
        purchasedSkins: safeParse('timenest_purchased_skins', ['default']),
        activeSkin: localStorage.getItem('timenest_skin') || 'default'
      },
      preferences: safeParse('timenest_preferences', {}),
      focusStats: safeParse('timenest_focus_stats', null),
      onboardingCompleted: localStorage.getItem('timenest_onboarding_completed') === 'true'
    };
  }, []);

  /**
   * Saves cloud backup for a given user account email or account ID
   */
  const saveCloudBackup = useCallback((accountEmail: string) => {
    if (!accountEmail) return;
    const cleanKey = accountEmail.trim().toLowerCase();
    const data = gatherAllLocalData();
    data.accountEmail = cleanKey;

    try {
      const storageKey = CLOUD_STORAGE_PREFIX + cleanKey;
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      // Also write to cloud registry index
      const registryRaw = localStorage.getItem('timenest_cloud_registry') || '{}';
      const registry = JSON.parse(registryRaw);
      registry[cleanKey] = {
        updatedAt: data.updatedAt,
        hasData: true,
        taskCount: data.tasks?.length || 0,
        eventCount: data.events?.length || 0
      };
      localStorage.setItem('timenest_cloud_registry', JSON.stringify(registry));
    } catch (e) {
      console.error('Failed to save cloud backup:', e);
    }
  }, [gatherAllLocalData]);

  /**
   * Check if cloud data exists for a given account
   */
  const hasCloudDataForAccount = useCallback((accountEmail: string): boolean => {
    if (!accountEmail) return false;
    const cleanKey = accountEmail.trim().toLowerCase();
    try {
      const storageKey = CLOUD_STORAGE_PREFIX + cleanKey;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const parsed: UserCloudData = JSON.parse(raw);
      
      // Check if user has meaningful registered data or completed onboarding
      const hasTasks = parsed.tasks && parsed.tasks.length > 0;
      const hasEvents = parsed.events && parsed.events.length > 0;
      const hasMeds = parsed.medications && parsed.medications.length > 0;
      const hasName = parsed.profile && parsed.profile.name && parsed.profile.name !== 'Visitante';
      const completed = parsed.onboardingCompleted === true;

      return !!(hasTasks || hasEvents || hasMeds || hasName || completed);
    } catch (e) {
      return false;
    }
  }, []);

  /**
   * Restores user state from cloud backup for a specific account email
   */
  const hydrateAccountFromCloud = useCallback((accountEmail: string): boolean => {
    if (!accountEmail) return false;
    const cleanKey = accountEmail.trim().toLowerCase();
    try {
      const storageKey = CLOUD_STORAGE_PREFIX + cleanKey;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return false;
      const data: UserCloudData = JSON.parse(raw);

      if (data.profile) localStorage.setItem('timenest_profile', JSON.stringify(data.profile));
      if (data.security) localStorage.setItem('timenest_security', JSON.stringify(data.security));
      if (data.energyLevel) localStorage.setItem('timenest_energy', data.energyLevel);
      if (data.achievements) localStorage.setItem('timenest_achievements', JSON.stringify(data.achievements));
      if (data.tasks) localStorage.setItem('timenest_tasks', JSON.stringify(data.tasks));
      if (data.events) localStorage.setItem('timenest_events', JSON.stringify(data.events));
      if (data.medications) localStorage.setItem('timenest_medications', JSON.stringify(data.medications));
      if (data.projects) localStorage.setItem('timenest_projects', JSON.stringify(data.projects));
      
      if (data.gamification) {
        localStorage.setItem('timenest_nests', String(data.gamification.nests || 0));
        localStorage.setItem('timenest_level', String(data.gamification.level || 1));
        localStorage.setItem('timenest_streak', String(data.gamification.streak || 0));
        if (data.gamification.history) localStorage.setItem('timenest_gamification_history', JSON.stringify(data.gamification.history));
        if (data.gamification.purchasedSkins) localStorage.setItem('timenest_purchased_skins', JSON.stringify(data.gamification.purchasedSkins));
        if (data.gamification.activeSkin) localStorage.setItem('timenest_skin', data.gamification.activeSkin);
      }

      if (data.preferences) localStorage.setItem('timenest_preferences', JSON.stringify(data.preferences));
      if (data.focusStats) localStorage.setItem('timenest_focus_stats', JSON.stringify(data.focusStats));
      
      localStorage.setItem('timenest_onboarding_completed', 'true');
      return true;
    } catch (e) {
      console.error('Error hydrating from cloud data:', e);
      return false;
    }
  }, []);

  /**
   * Sync now operation across cloud storage & local storage
   */
  const syncNow = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) {
      setSyncState('offline');
      return;
    }

    triggerSyncStatus('syncing');

    try {
      // Simulate remote network sync latency (300ms)
      await new Promise(res => setTimeout(res, 300));

      // Get current profile email to persist cloud state
      const profileRaw = localStorage.getItem('timenest_profile');
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p.email && p.email !== 'visitante@email.com') {
          saveCloudBackup(p.email);
        }
      }

      triggerSyncStatus('synced');
    } catch (e) {
      console.error('Sync failed:', e);
      setSyncState('idle');
    }
  }, [saveCloudBackup, triggerSyncStatus]);

  // Periodic background auto-sync every 60 seconds if online
  useEffect(() => {
    if (isOffline) return;

    const interval = setInterval(() => {
      if (navigator.onLine && !document.hidden) {
        syncNow();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isOffline, syncNow]);

  return (
    <SyncContext.Provider value={{
      isOffline,
      syncState,
      lastSyncedAt,
      triggerSyncStatus,
      syncNow,
      saveCloudBackup,
      hasCloudDataForAccount,
      hydrateAccountFromCloud
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
