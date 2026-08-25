export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
  custom?: boolean;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'verdure',    name: 'Verdure',       emoji: '🥦', color: '#4caf50' },
  { id: 'frutta',     name: 'Frutta',        emoji: '🍎', color: '#e53935' },
  { id: 'latticini',  name: 'Latticini',     emoji: '🧀', color: '#fdd835' },
  { id: 'carne',      name: 'Carne',         emoji: '🥩', color: '#f4511e' },
  { id: 'pesce',      name: 'Pesce',         emoji: '🐟', color: '#039be5' },
  { id: 'cereali',    name: 'Cereali',       emoji: '🌾', color: '#fb8c00' },
  { id: 'scatolame',  name: 'Scatolame',     emoji: '🥫', color: '#8d6e63' },
  { id: 'bevande',    name: 'Bevande',       emoji: '🧃', color: '#00acc1' },
  { id: 'dolci',      name: 'Dolci',         emoji: '🍫', color: '#ab47bc' },
  { id: 'condimenti', name: 'Condimenti',    emoji: '🧂', color: '#78909c' },
  { id: 'surgelati',  name: 'Surgelati',     emoji: '🧊', color: '#42a5f5' },
  { id: 'altro',      name: 'Altro',         emoji: '📦', color: '#90a4ae' },
];
