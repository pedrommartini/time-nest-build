import React, { createContext, useContext, useState, useEffect } from 'react';
import { audio } from '../utils/audio';
import confetti from 'canvas-confetti';

interface GamificationContextType {
  nests: number; // Nests are the currency/points
  addNests: (amount: number, reason?: string) => void;
  level: number;
  progressToNextLevel: number;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nests, setNests] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('timenest_nests');
      if (saved) return parseInt(saved);
    } catch(e) {}
    return 0;
  });

  useEffect(() => {
    localStorage.setItem('timenest_nests', nests.toString());
  }, [nests]);

  const addNests = (amount: number, _reason?: string) => {
    setNests(prev => prev + amount);
    audio.playChimeDone();
    
    // Quick confetti
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#7C3AED', '#38BDF8', '#34D399']
    });
  };

  // Basic leveling logic: 100 nests per level
  const level = Math.floor(nests / 100) + 1;
  const progressToNextLevel = (nests % 100);

  return (
    <GamificationContext.Provider value={{ nests, addNests, level, progressToNextLevel }}>
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
};
