import React, { createContext, useContext, useState } from 'react';

export type Tab = 'timeline' | 'tasks' | 'focus' | 'profile';

interface NavigationContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isSmartInputOpen: boolean;
  startWithVoice: boolean;
  openSmartInput: (withVoice?: boolean) => void;
  closeSmartInput: () => void;
  selectedEventId: string | null;
  selectedTaskId: string | null;
  isDrawerExpanded: boolean;
  setIsDrawerExpanded: (expanded: boolean) => void;
  selectEvent: (id: string | null) => void;
  selectTask: (id: string | null) => void;
  clearSelection: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [isSmartInputOpen, setIsSmartInputOpen] = useState(false);
  const [startWithVoice, setStartWithVoice] = useState(false);
  
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  const openSmartInput = (withVoice = false) => {
    setStartWithVoice(withVoice);
    setIsSmartInputOpen(true);
  };

  const closeSmartInput = () => {
    setIsSmartInputOpen(false);
  };

  const selectEvent = (id: string | null) => {
    setSelectedTaskId(null);
    setSelectedEventId(id);
    if (!id) setIsDrawerExpanded(false);
  };

  const selectTask = (id: string | null) => {
    setSelectedEventId(null);
    setSelectedTaskId(id);
    if (!id) setIsDrawerExpanded(false);
  };

  const clearSelection = () => {
    setSelectedEventId(null);
    setSelectedTaskId(null);
    setIsDrawerExpanded(false);
  };

  return (
    <NavigationContext.Provider value={{ 
      activeTab, 
      setActiveTab,
      isSmartInputOpen,
      startWithVoice,
      openSmartInput,
      closeSmartInput,
      selectedEventId,
      selectedTaskId,
      isDrawerExpanded,
      setIsDrawerExpanded,
      selectEvent,
      selectTask,
      clearSelection
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
