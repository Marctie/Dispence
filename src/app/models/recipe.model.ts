export interface Recipe {
  id: string;
  name: string;
  /** Ingredienti ("quello che serve"): uno per riga, anche con le quantità (es. "200 g pasta"). */
  ingredients: string[];
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  time: number;
  emoji?: string;
  /** Passaggi della preparazione, in ordine. */
  steps?: string[];
  /** Numero di porzioni. */
  servings?: number;
  /** true per le ricette create dall'utente (modificabili ed eliminabili). */
  custom?: boolean;
  createdAt?: string;
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy:   'Facile',
  medium: 'Medio',
  hard:   'Difficile',
};
