// Skins definitions and metadata for TimeNest

export interface Skin {
  id: string;
  name: string;
  tagline: string;
  description: string;
  isDefault?: boolean;
  colors: {
    primary: string;
    primarySoft: string;
    bgPrimary: string;
    bgSecondary: string;
    textPrimary: string;
    accent: string;
  };
  previewGradient: string;
  badgeText?: string;
}

export const AVAILABLE_SKINS: Skin[] = [
  {
    id: 'caderno-moderno',
    name: 'Caderno Moderno',
    tagline: 'Papel, Prancheta & Foco',
    description: 'Paleta inspirada em um ambiente de estudo e trabalho com tons de lavanda, púrpura (#6E4EFF), off-white textura papel e toques de post-it.',
    isDefault: true,
    badgeText: 'PRINCIPAL',
    colors: {
      primary: '#6E4EFF',
      primarySoft: '#EDE7FF',
      bgPrimary: '#FAF7F2',
      bgSecondary: '#FFFFFF',
      textPrimary: '#25232B',
      accent: '#BDA8FF',
    },
    previewGradient: 'linear-gradient(135deg, #6E4EFF 0%, #BDA8FF 60%, #FAF7F2 100%)',
  },
  {
    id: 'timenest-classic',
    name: 'TimeNest Clássico',
    tagline: 'Visual Original',
    description: 'A aparência original do aplicativo com azul índigo vibrante e o visual clean com padrão de pontos.',
    colors: {
      primary: '#625dda',
      primarySoft: '#e9ebfa',
      bgPrimary: '#ffffff',
      bgSecondary: '#fdfdfd',
      textPrimary: '#1e293b',
      accent: '#787ce1',
    },
    previewGradient: 'linear-gradient(135deg, #625dda 0%, #939ae8 60%, #ffffff 100%)',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    tagline: 'Futurista & Alta Energia',
    description: 'Ciano neon e rosa choque em um ambiente dark com grade futurista para foco elétrico.',
    colors: {
      primary: '#00f2fe',
      primarySoft: '#003847',
      bgPrimary: '#08090d',
      bgSecondary: '#10141d',
      textPrimary: '#f0f6fc',
      accent: '#ff007f',
    },
    previewGradient: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 50%, #ff007f 100%)',
  },
  {
    id: 'emerald-focus',
    name: 'Esmeralda & Sálvia',
    tagline: 'Calma & Serenidade Orgânica',
    description: 'Verdes botânicos e tons de sálvia acolhedores para um ambiente de calma e clareza mental.',
    colors: {
      primary: '#10b981',
      primarySoft: '#d1fae5',
      bgPrimary: '#f4fbf7',
      bgSecondary: '#ffffff',
      textPrimary: '#064e3b',
      accent: '#34d399',
    },
    previewGradient: 'linear-gradient(135deg, #059669 0%, #a7f3d0 60%, #f4fbf7 100%)',
  },
  {
    id: 'warm-sunset',
    name: 'Pôr do Sol Quente',
    tagline: 'Energia Suave & Criativa',
    description: 'Cores de coral, pêssego e dourado que trazem aconchego e criatividade para o seu dia.',
    colors: {
      primary: '#f97316',
      primarySoft: '#ffedd5',
      bgPrimary: '#fffaf5',
      bgSecondary: '#ffffff',
      textPrimary: '#431407',
      accent: '#fbbf24',
    },
    previewGradient: 'linear-gradient(135deg, #f97316 0%, #fbbf24 60%, #fffaf5 100%)',
  },
  {
    id: 'minimal-mono',
    name: 'Monocromático Minimal',
    tagline: 'Zero Distração',
    description: 'Estética em preto, grafite e branco com tipografia marcante para produtividade pura.',
    colors: {
      primary: '#18181b',
      primarySoft: '#f4f4f5',
      bgPrimary: '#fafafa',
      bgSecondary: '#ffffff',
      textPrimary: '#09090b',
      accent: '#71717a',
    },
    previewGradient: 'linear-gradient(135deg, #18181b 0%, #71717a 60%, #fafafa 100%)',
  },
];

export const DEFAULT_SKIN_ID = 'caderno-moderno';
