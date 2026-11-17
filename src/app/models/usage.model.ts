/** Motivo per cui un prodotto è uscito dalla dispensa. */
import { Product } from './product.model';

export type UsageReason = 'used' | 'wasted';

/** Una voce dello storico: un'uscita (totale o parziale) di un prodotto dalla dispensa. */
export interface UsageEntry {
  id: string;
  productId: string;
  name: string;
  category: string;
  location: string;
  quantity: number;
  unit: string;
  reason: UsageReason;
  usedAt: string;
  /** true se con questa uscita il prodotto è finito ed è stato tolto dalla dispensa. */
  finished: boolean;
  /** Copia del prodotto finito, per poterlo ripristinare con "Annulla". */
  snapshot?: Product;
}

export const USAGE_REASON_LABELS: Record<UsageReason, string> = {
  used:   'Usato',
  wasted: 'Buttato',
};
