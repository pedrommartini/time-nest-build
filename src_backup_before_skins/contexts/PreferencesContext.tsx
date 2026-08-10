// Preferences and Accessibility Context for TimeNest

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'light' | 'dark' | 'system';
export type LanguageType = 'pt-BR' | 'en' | 'es';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

interface PreferencesContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  isLowStimulation: boolean;
  setIsLowStimulation: (val: boolean) => void;
  colorBlindMode: ColorBlindMode;
  setColorBlindMode: (val: ColorBlindMode) => void;
  uiScale: number;
  setUiScale: (val: number) => void;
  isTestEnvironment: boolean;
  setIsTestEnvironment: (val: boolean) => void;
  sleepStart: string;
  setSleepStart: (val: string) => void;
  sleepEnd: string;
  setSleepEnd: (val: string) => void;
  updateSleepTime: (start: string, end: string) => void;
  t: (key: string) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const translations: Record<LanguageType, Record<string, string>> = {
  'pt-BR': {
    timelineTitle: 'Timeline',
    tasksTitle: 'Tarefas',
    focusTitle: 'Foco',
    profileTitle: 'Perfil',
    now: 'Agora',
    addEvent: 'Adicionar Evento',
    profileIntelligence: 'Inteligência do App',
    profileSecurity: 'Segurança e Dados',
  },
  'en': {
    timelineTitle: 'Timeline',
    tasksTitle: 'Tasks',
    focusTitle: 'Focus',
    profileTitle: 'Profile',
    now: 'Now',
    addEvent: 'Add Event',
    profileIntelligence: 'App Intelligence',
    profileSecurity: 'Security & Data',
  },
  'es': {
    timelineTitle: 'Línea de tiempo',
    tasksTitle: 'Tareas',
    focusTitle: 'Enfoque',
    profileTitle: 'Perfil',
    now: 'Ahora',
    addEvent: 'Añadir evento',
    profileIntelligence: 'Inteligencia de la aplicación',
    profileSecurity: 'Seguridad y Datos',
  }
};

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('system');
  const [language, setLanguage] = useState<LanguageType>('pt-BR');
  const [isLowStimulation, setIsLowStimulation] = useState<boolean>(false);
  const [colorBlindMode, setColorBlindMode] = useState<ColorBlindMode>('none');
  const [uiScale, setUiScale] = useState<number>(100);
  const [isTestEnvironment, setIsTestEnvironment] = useState<boolean>(false);
  const [sleepStart, setSleepStart] = useState<string>('23:00');
  const [sleepEnd, setSleepEnd] = useState<string>('07:00');

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timenest_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.isLowStimulation !== undefined) setIsLowStimulation(parsed.isLowStimulation);
        if (parsed.colorBlindMode) setColorBlindMode(parsed.colorBlindMode);
        if (parsed.uiScale) setUiScale(parsed.uiScale);
        if (parsed.isTestEnvironment !== undefined) setIsTestEnvironment(parsed.isTestEnvironment);
        if (parsed.sleepStart) setSleepStart(parsed.sleepStart);
        if (parsed.sleepEnd) setSleepEnd(parsed.sleepEnd);
      }
    } catch(e) {}
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('timenest_preferences', JSON.stringify({
      theme, language, isLowStimulation, colorBlindMode, uiScale, isTestEnvironment, sleepStart, sleepEnd
    }));
  }, [theme, language, isLowStimulation, colorBlindMode, uiScale, isTestEnvironment, sleepStart, sleepEnd]);

  // Apply theme & accessibility classes to body
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme
    let effectiveTheme = theme;
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Low Stimulation
    if (isLowStimulation) {
      root.classList.add('low-stim');
    } else {
      root.classList.remove('low-stim');
    }

    // Color Blind Filters
    root.style.filter = colorBlindMode !== 'none' ? `url(#${colorBlindMode})` : 'none';
    
    // UI Scale
    root.style.fontSize = `${uiScale}%`;

  }, [theme, isLowStimulation, colorBlindMode, uiScale]);

  const t = (key: string): string => {
    return translations[language][key] || translations['pt-BR'][key] || key;
  };

  return (
    <PreferencesContext.Provider value={{
      theme, setTheme, language, setLanguage,
      isLowStimulation, setIsLowStimulation,
      colorBlindMode, setColorBlindMode,
      uiScale, setUiScale,
      isTestEnvironment, setIsTestEnvironment,
      sleepStart, setSleepStart,
      sleepEnd, setSleepEnd,
      updateSleepTime: (start, end) => { setSleepStart(start); setSleepEnd(end); },
      t
    }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
