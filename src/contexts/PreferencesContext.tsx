// Preferences and Accessibility Context for TimeNest

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_SKIN_ID } from '../utils/skins';

export type ThemeType = 'light' | 'dark' | 'system';
export type LanguageType = 'pt-BR' | 'en' | 'es';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type FontFamilyType = 'Outfit' | 'Plus Jakarta Sans' | 'Poppins';

interface PreferencesContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  skin: string;
  setSkin: (skinId: string) => void;
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  isLowStimulation: boolean;
  setIsLowStimulation: (val: boolean) => void;
  colorBlindMode: ColorBlindMode;
  setColorBlindMode: (val: ColorBlindMode) => void;
  fontFamily: FontFamilyType;
  setFontFamily: (val: FontFamilyType) => void;
  uiScale: number;
  setUiScale: (val: number) => void;
  isTestEnvironment: boolean;
  setIsTestEnvironment: (val: boolean) => void;
  sleepStart: string;
  setSleepStart: (val: string) => void;
  sleepEnd: string;
  setSleepEnd: (val: string) => void;
  updateSleepTime: (start: string, end: string) => void;
  sleepAlarmEnabled: boolean;
  setSleepAlarmEnabled: (val: boolean) => void;
  globalAlarmsEnabled: boolean;
  setGlobalAlarmsEnabled: (val: boolean) => void;
  t: (key: string) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const translations: Record<LanguageType, Record<string, string>> = {
  'pt-BR': {
    timelineTitle: 'Timeline',
    tasksTitle: 'Organizar',
    focusTitle: 'Foco',
    profileTitle: 'Perfil',
    now: 'Agora',
    addEvent: 'Adicionar Evento',
    profileIntelligence: 'Inteligência do App',
    profileSecurity: 'Segurança e Dados',
  },
  'en': {
    timelineTitle: 'Timeline',
    tasksTitle: 'Organize',
    focusTitle: 'Focus',
    profileTitle: 'Profile',
    now: 'Now',
    addEvent: 'Add Event',
    profileIntelligence: 'App Intelligence',
    profileSecurity: 'Security & Data',
  },
  'es': {
    timelineTitle: 'Línea de tiempo',
    tasksTitle: 'Organizar',
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
  const [skin, setSkin] = useState<string>(DEFAULT_SKIN_ID);
  const [language, setLanguage] = useState<LanguageType>('pt-BR');
  const [isLowStimulation, setIsLowStimulation] = useState<boolean>(false);
  const [colorBlindMode, setColorBlindMode] = useState<ColorBlindMode>('none');
  const [fontFamily, setFontFamily] = useState<FontFamilyType>('Outfit');
  const [uiScale, setUiScale] = useState<number>(100);
  const [isTestEnvironment, setIsTestEnvironment] = useState<boolean>(false);
  const [sleepStart, setSleepStart] = useState<string>('23:00');
  const [sleepEnd, setSleepEnd] = useState<string>('07:00');
  const [sleepAlarmEnabled, setSleepAlarmEnabled] = useState<boolean>(false);
  const [globalAlarmsEnabled, setGlobalAlarmsEnabled] = useState<boolean>(false);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('timenest_preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.theme) setTheme(parsed.theme);
        if (parsed.skin) {
          setSkin(parsed.skin === 'purpura-acolhedor' ? 'caderno-moderno' : parsed.skin);
        }
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.isLowStimulation !== undefined) setIsLowStimulation(parsed.isLowStimulation);
        if (parsed.colorBlindMode) setColorBlindMode(parsed.colorBlindMode);
        if (parsed.fontFamily) setFontFamily(parsed.fontFamily);
        if (parsed.uiScale) setUiScale(parsed.uiScale);
        if (parsed.isTestEnvironment !== undefined) setIsTestEnvironment(parsed.isTestEnvironment);
        if (parsed.sleepStart) setSleepStart(parsed.sleepStart);
        if (parsed.sleepEnd) setSleepEnd(parsed.sleepEnd);
        if (parsed.sleepAlarmEnabled !== undefined) setSleepAlarmEnabled(parsed.sleepAlarmEnabled);
        if (parsed.globalAlarmsEnabled !== undefined) setGlobalAlarmsEnabled(parsed.globalAlarmsEnabled);
      }
    } catch(e) {}
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('timenest_preferences', JSON.stringify({
      theme, skin, language, isLowStimulation, colorBlindMode, fontFamily, uiScale, isTestEnvironment, sleepStart, sleepEnd, sleepAlarmEnabled, globalAlarmsEnabled
    }));
  }, [theme, skin, language, isLowStimulation, colorBlindMode, fontFamily, uiScale, isTestEnvironment, sleepStart, sleepEnd, sleepAlarmEnabled, globalAlarmsEnabled]);

  // Apply theme, skin & accessibility classes to root
  useEffect(() => {
    const root = document.documentElement;
    
    // Skin attribute
    root.setAttribute('data-skin', skin || DEFAULT_SKIN_ID);

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
    
    // Font Family
    root.style.setProperty('--app-font', `"${fontFamily}", system-ui, sans-serif`);

  }, [theme, skin, isLowStimulation, colorBlindMode, uiScale, fontFamily]);

  const t = (key: string): string => {
    return translations[language][key] || translations['pt-BR'][key] || key;
  };

  return (
    <PreferencesContext.Provider value={{
      theme, setTheme,
      skin, setSkin,
      language, setLanguage,
      isLowStimulation, setIsLowStimulation,
      colorBlindMode, setColorBlindMode,
      fontFamily, setFontFamily,
      uiScale, setUiScale,
      isTestEnvironment, setIsTestEnvironment,
      sleepStart, setSleepStart,
      sleepEnd, setSleepEnd,
      updateSleepTime: (start, end) => { setSleepStart(start); setSleepEnd(end); },
      sleepAlarmEnabled, setSleepAlarmEnabled,
      globalAlarmsEnabled, setGlobalAlarmsEnabled,
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
