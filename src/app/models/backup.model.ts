import { Product } from './product.model';
import { Category } from './category.model';
import { ShoppingItem } from './shopping-item.model';
import { UserPreferences } from './user-preferences.model';
import { BarcodeCacheEntry } from './barcode-cache.model';
import { UsageEntry } from './usage.model';
import { Recipe } from './recipe.model';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPayload {
  products: Product[];
  customCategories: Category[];
  shoppingItems: ShoppingItem[];
  preferences: UserPreferences;
  barcodeCache: Record<string, BarcodeCacheEntry>;
  purchaseHistory: Record<string, { name: string; count: number }>;
  /** Storico delle uscite (assente nei backup creati prima della 1.2). */
  usageHistory?: UsageEntry[];
  /** Ricette create dall'utente (assenti nei backup creati prima della 1.2). */
  customRecipes?: Recipe[];
}

export interface BackupFile {
  schemaVersion: number;
  appName: 'dispensina-digitale';
  createdAt: string;
  checksum: string;
  data: BackupPayload;
}
