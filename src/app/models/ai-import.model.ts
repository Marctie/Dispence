/** Un prodotto capito dall'assistente, da confermare prima di finire in dispensa. */
export interface AiItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  location: 'pantry' | 'fridge' | 'freezer';
  expiryDate: string | null;
  /** True se la scadenza non era scritta ed è la durata tipica stimata dall'assistente. */
  expiryEstimated: boolean;
  /** Le parole sulla scadenza scritte dall'utente (vuoto se nessuna). */
  expiryText: string;
}

export type AiJobStatus = 'outbox' | 'pending' | 'processing' | 'done' | 'error';

/** Un elenco inviato all'assistente. 'outbox' = ancora sul telefono, in attesa di rete. */
export interface AiJob {
  id: string;
  status: AiJobStatus;
  inputText: string;
  createdAt: string;
  attempts: number;
  items: AiItem[];
  notUnderstood: string[];
  error: string | null;
  model: string | null;
  seconds: number | null;
}

export interface AiWorkerState {
  /** Programma sul PC acceso negli ultimi 60 secondi. */
  online: boolean;
  /** Ollama acceso con il modello pronto. */
  ready: boolean;
  busy: boolean;
  lastSeen: string | null;
}
