import React, { createContext, useContext, useState } from 'react';

export type Tab = 'timeline' | 'tasks' | 'focus' | 'profile';

interface NavigationContextType {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isSmartInputOpen: boolean;
  startWithVoice: boolean;
  openSmartInput: (withVoice?: boolean) => void;
  closeSmartInput: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [isSmartInputOpen, setIsSmartInputOpen] = useState(false);
  const [startWithVoice, setStartWithVoice] = useState(false);

  const openSmartInput = (withVoice = false) => {
    setStartWithVoice(withVoice);
    setIsSmartInputOpen(true);
  };

  const closeSmartInput = () => {
    setIsSmartInputOpen(false);
  };

  return (
    <NavigationContext.Provider value={{ 
      activeTab, 
      setActiveTab,
      isSmartInputOpen,
      startWithVoice,
      openSmartInput,
      closeSmartInput
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
