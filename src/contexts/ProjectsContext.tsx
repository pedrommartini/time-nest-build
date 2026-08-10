import React, { createContext, useContext, useState, useEffect } from 'react';
import { audio } from '../utils/audio';

export interface Project {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  notes: string;
  createdAt: string;
}

interface ProjectsContextType {
  projects: Project[];
  addProject: (title: string, description?: string, color?: string, icon?: string) => string;
  updateProject: (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => void;
  deleteProject: (id: string) => void;
  getProjectById: (id: string) => Project | undefined;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

const getDefaultIcon = (title: string): string => {
  const lower = title.toLowerCase();
  if (lower.includes('trabalho') || lower.includes('work') || lower.includes('projeto') || lower.includes('empresa')) return 'Briefcase';
  if (lower.includes('estudo') || lower.includes('escola') || lower.includes('faculdade') || lower.includes('curso') || lower.includes('livro')) return 'GraduationCap';
  if (lower.includes('casa') || lower.includes('home') || lower.includes('limpeza') || lower.includes('organização')) return 'Home';
  if (lower.includes('cozinha') || lower.includes('comida') || lower.includes('receita') || lower.includes('jantar')) return 'ChefHat';
  if (lower.includes('academia') || lower.includes('treino') || lower.includes('saúde') || lower.includes('musculação')) return 'Dumbbell';
  if (lower.includes('viagem') || lower.includes('férias') || lower.includes('passeio') || lower.includes('voo')) return 'Plane';
  if (lower.includes('corrida') || lower.includes('correr') || lower.includes('maratona')) return 'PersonStanding';
  if (lower.includes('código') || lower.includes('code') || lower.includes('programação') || lower.includes('dev')) return 'Code';
  if (lower.includes('música') || lower.includes('music') || lower.includes('banda') || lower.includes('show')) return 'Music';
  if (lower.includes('arte') || lower.includes('pintura') || lower.includes('design') || lower.includes('desenho')) return 'Palette';
  if (lower.includes('foto') || lower.includes('câmera') || lower.includes('vídeo') || lower.includes('film')) return 'Camera';
  if (lower.includes('compras') || lower.includes('mercado') || lower.includes('shopping') || lower.includes('loja')) return 'ShoppingCart';
  if (lower.includes('amigos') || lower.includes('família') || lower.includes('pessoas') || lower.includes('reunião')) return 'Users';
  if (lower.includes('carro') || lower.includes('moto') || lower.includes('veículo') || lower.includes('oficina')) return 'Car';
  if (lower.includes('jogo') || lower.includes('game') || lower.includes('videogame') || lower.includes('play')) return 'Gamepad2';
  if (lower.includes('saúde') || lower.includes('médico') || lower.includes('remédio') || lower.includes('hospital')) return 'Heart';
  if (lower.includes('café') || lower.includes('coffee') || lower.includes('lanche')) return 'Coffee';
  
  return 'Folder';
};

const getDefaultColor = (title: string): string => {
  const lower = title.toLowerCase();
  if (lower.includes('trabalho') || lower.includes('viagem') || lower.includes('código')) return 'text-indigo-500 bg-indigo-50';
  if (lower.includes('estudo') || lower.includes('escola') || lower.includes('arte') || lower.includes('música')) return 'text-pink-500 bg-pink-50';
  if (lower.includes('casa') || lower.includes('home') || lower.includes('dinheiro') || lower.includes('compras')) return 'text-emerald-500 bg-emerald-50';
  if (lower.includes('cozinha') || lower.includes('comida') || lower.includes('café')) return 'text-orange-500 bg-orange-50';
  if (lower.includes('academia') || lower.includes('treino') || lower.includes('corrida') || lower.includes('jogo')) return 'text-blue-500 bg-blue-50';
  if (lower.includes('saúde') || lower.includes('médico') || lower.includes('coração')) return 'text-red-500 bg-red-50';
  return 'text-brand-500 bg-brand-50';
};

export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('timenest_projects');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('timenest_projects', JSON.stringify(projects));
  }, [projects]);

  const addProject = (title: string, description: string = '', color?: string, icon?: string) => {
    const newProject: Project = {
      id: 'proj_' + Date.now() + Math.random().toString(36).substring(2, 9),
      title,
      description,
      icon: icon || getDefaultIcon(title),
      color: color || getDefaultColor(title),
      notes: '',
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, newProject]);
    audio.playChimeDone();
    return newProject.id;
  };

  const updateProject = (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const getProjectById = (id: string) => {
    return projects.find(p => p.id === id);
  };

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, deleteProject, getProjectById }}>
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
};
