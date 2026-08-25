export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time: number;
  emoji?: string;
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy:   'Facile',
  medium: 'Medio',
  hard:   'Difficile',
};
