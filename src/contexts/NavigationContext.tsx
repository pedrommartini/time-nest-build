import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

export type Tab = 'timeline' | 'tasks' | 'focus' | 'profile';

interface BackHandlerEntry {
  id: string;
  handler: () => boolean;
  priority: number;
  createdAt: number;
}

interface NavigationContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  tabHistory: Tab[];
  isSmartInputOpen: boolean;
  startWithVoice: boolean;
  openSmartInput: (withVoice?: boolean) => void;
  closeSmartInput: () => void;
  selectedEventId: string | null;
  selectedTaskId: string | null;
  isDrawerExpanded: boolean;
  setIsDrawerExpanded: (expanded: boolean) => void;
  isCleanMode: boolean;
  setIsCleanMode: (clean: boolean) => void;
  isResizing: boolean;
  setIsResizing: (resizing: boolean) => void;
  selectEvent: (id: string | null) => void;
  selectTask: (id: string | null) => void;
  clearSelection: () => void;
  registerBackHandler: (handler: () => boolean, priority?: number) => () => void;
  handleBack: () => boolean;
  exitToastVisible: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<Tab>('timeline');
  const [tabHistory, setTabHistory] = useState<Tab[]>([]);
  
  const [isSmartInputOpen, setIsSmartInputOpen] = useState(false);
  const [startWithVoice, setStartWithVoice] = useState(false);
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [isCleanMode, setIsCleanMode] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const [exitToastVisible, setExitToastVisible] = useState(false);

  const backHandlersRef = useRef<BackHandlerEntry[]>([]);
  const lastBackPressRef = useRef<number>(0);
  const exitToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep latest states in refs for handler evaluation
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  const tabHistoryRef = useRef(tabHistory);
  tabHistoryRef.current = tabHistory;
  const isSmartInputOpenRef = useRef(isSmartInputOpen);
  isSmartInputOpenRef.current = isSmartInputOpen;
  const isDrawerExpandedRef = useRef(isDrawerExpanded);
  isDrawerExpandedRef.current = isDrawerExpanded;
  const selectedEventIdRef = useRef(selectedEventId);
  selectedEventIdRef.current = selectedEventId;
  const selectedTaskIdRef = useRef(selectedTaskId);
  selectedTaskIdRef.current = selectedTaskId;

  const setActiveTab = useCallback((tab: Tab) => {
    setActiveTabState(prev => {
      if (prev !== tab) {
        setTabHistory(prevHistory => {
          const filtered = prevHistory.filter(t => t !== prev);
          return [...filtered, prev].slice(-15);
        });
      }
      return tab;
    });
  }, []);

  const openSmartInput = useCallback((withVoice = false) => {
    setStartWithVoice(withVoice);
    setIsSmartInputOpen(true);
  }, []);

  const closeSmartInput = useCallback(() => {
    setIsSmartInputOpen(false);
  }, []);

  const selectEvent = useCallback((id: string | null) => {
    setSelectedTaskId(null);
    setSelectedEventId(id);
    if (!id) setIsDrawerExpanded(false);
  }, []);

  const selectTask = useCallback((id: string | null) => {
    setSelectedEventId(null);
    setSelectedTaskId(id);
    if (!id) setIsDrawerExpanded(false);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEventId(null);
    setSelectedTaskId(null);
    setIsDrawerExpanded(false);
  }, []);

  const registerBackHandler = useCallback((handler: () => boolean, priority: number = 0) => {
    const entry: BackHandlerEntry = {
      id: Math.random().toString(36).substring(2, 9),
      handler,
      priority,
      createdAt: Date.now()
    };
    backHandlersRef.current.push(entry);

    return () => {
      backHandlersRef.current = backHandlersRef.current.filter(e => e.id !== entry.id);
    };
  }, []);

  const handleBack = useCallback((): boolean => {
    // 1. Run through registered back handlers (sorted by priority DESC, then LIFO createdAt DESC)
    const sortedHandlers = [...backHandlersRef.current].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.createdAt - a.createdAt;
    });

    for (const entry of sortedHandlers) {
      try {
        if (entry.handler()) {
          return true; // Handled!
        }
      } catch (e) {
        console.error('Error in custom back handler', e);
      }
    }

    // 2. Close Smart Input if open
    if (isSmartInputOpenRef.current) {
      setIsSmartInputOpen(false);
      return true;
    }

    // 3. Collapse expanded drawer if expanded
    if (isDrawerExpandedRef.current) {
      setIsDrawerExpanded(false);
      return true;
    }

    // 4. Close selection / detail drawer if an item is selected
    if (selectedEventIdRef.current || selectedTaskIdRef.current) {
      setSelectedEventId(null);
      setSelectedTaskId(null);
      setIsDrawerExpanded(false);
      return true;
    }

    // 5. Navigate back through tab history if we navigated between tabs
    if (tabHistoryRef.current.length > 0) {
      const newHistory = [...tabHistoryRef.current];
      const previousTab = newHistory.pop()!;
      setTabHistory(newHistory);
      setActiveTabState(previousTab);
      return true;
    }

    // 6. If on any tab other than 'timeline', navigate to 'timeline'
    if (activeTabRef.current !== 'timeline') {
      setActiveTabState('timeline');
      return true;
    }

    // 7. We are at root (timeline) with nothing open -> double-back to exit
    const now = Date.now();
    if (lastBackPressRef.current && now - lastBackPressRef.current < 2000) {
      if (Capacitor.isNativePlatform()) {
        import('@capacitor/app').then(({ App }) => {
          App.exitApp();
        }).catch(err => {
          console.warn('Failed to exit app', err);
        });
      }
      return true;
    }

    lastBackPressRef.current = now;
    setExitToastVisible(true);
    if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    exitToastTimerRef.current = setTimeout(() => {
      setExitToastVisible(false);
    }, 2000);

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/haptics').then(({ Haptics, ImpactStyle }) => {
        Haptics.impact({ style: ImpactStyle.Light });
      }).catch(() => {});
    }

    return true;
  }, []);

  // Setup Capacitor Android hardware back button listener
  useEffect(() => {
    let removeListener: (() => void) | null = null;

    if (Capacitor.isNativePlatform()) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('backButton', () => {
          handleBack();
        }).then(listener => {
          removeListener = () => listener.remove();
        });
      }).catch(err => {
        console.warn('Capacitor App plugin not loaded', err);
      });
    }

    return () => {
      if (removeListener) removeListener();
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  }, [handleBack]);

  return (
    <NavigationContext.Provider value={{ 
      activeTab, 
      setActiveTab,
      tabHistory,
      isSmartInputOpen,
      startWithVoice,
      openSmartInput,
      closeSmartInput,
      selectedEventId,
      selectedTaskId,
      isDrawerExpanded,
      setIsDrawerExpanded,
      isCleanMode,
      setIsCleanMode,
      isResizing,
      setIsResizing,
      selectEvent,
      selectTask,
      clearSelection,
      registerBackHandler,
      handleBack,
      exitToastVisible
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

/**
 * Hook to register a back action for the current component.
 * Automatically cleans up on unmount or when active becomes false.
 */
export const useBackHandler = (
  handler: () => boolean,
  active: boolean = true,
  priority: number = 0
) => {
  const { registerBackHandler } = useNavigation();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!active) return;
    return registerBackHandler(() => handlerRef.current(), priority);
  }, [active, priority, registerBackHandler]);
};

