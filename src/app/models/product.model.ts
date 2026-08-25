export interface Product {
  id: string;
  name: string;
  category: string;
  location: 'pantry' | 'fridge' | 'freezer' | string;
  quantity: number;
  unit: string;
  expiryDate: string | null;
  notes: string;
  addedAt: string;
  lowStockThreshold: number | null;
  price: number | null;
  barcode?: string | null;
  isDemo?: boolean;
}

export type Location = 'pantry' | 'fridge' | 'freezer';

export const LOCATION_LABELS: Record<string, string> = {
  pantry:  'Dispensa',
  fridge:  'Frigo',
  freezer: 'Freezer',
};

export const UNIT_OPTIONS = ['pz', 'g', 'kg', 'ml', 'l', 'conf', 'busta', 'scatola'];
