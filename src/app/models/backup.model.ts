import { Product } from './product.model';
import { Category } from './category.model';
import { ShoppingItem } from './shopping-item.model';
import { UserPreferences } from './user-preferences.model';
import { BarcodeCacheEntry } from './barcode-cache.model';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPayload {
  products: Product[];
  customCategories: Category[];
  shoppingItems: ShoppingItem[];
  preferences: UserPreferences;
  barcodeCache: Record<string, BarcodeCacheEntry>;
  purchaseHistory: Record<string, { name: string; count: number }>;
}

export interface BackupFile {
  schemaVersion: number;
  appName: 'dispensina-digitale';
  createdAt: string;
  checksum: string;
  data: BackupPayload;
}
