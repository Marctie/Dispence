export interface BarcodeCacheEntry {
  barcode: string;
  name: string;
  category: string | null;
  unit: string | null;
  source: 'manual' | 'openfoodfacts';
  updatedAt: string;
}
