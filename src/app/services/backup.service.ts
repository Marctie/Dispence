import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { BackupFile, BackupPayload, BACKUP_SCHEMA_VERSION } from '../models/backup.model';
import { StorageService } from './storage.service';
import { ProductService } from './product.service';
import { CategoryService } from './category.service';
import { ShoppingService } from './shopping.service';
import { PreferencesService } from './preferences.service';
import { BarcodeCacheService } from './barcode-cache.service';

const AUTO_BACKUP_KEY = 'dispensa_auto_backup';

@Injectable({ providedIn: 'root' })
export class BackupService {
  constructor(
    private storage: StorageService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private shoppingService: ShoppingService,
    private preferencesService: PreferencesService,
    private barcodeCache: BarcodeCacheService,
  ) {}

  collectPayload(): BackupPayload {
    return {
      products: this.productService.getAll(),
      customCategories: this.categoryService.getCustom(),
      shoppingItems: this.shoppingService.getAll(),
      preferences: this.preferencesService.get(),
      barcodeCache: this.barcodeCache.getAll(),
      purchaseHistory: this.productService.getPurchaseHistory(),
    };
  }

  private async buildBackupFile(): Promise<BackupFile> {
    const data = this.collectPayload();
    const checksum = await this.checksum(data);
    return {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appName: 'dispensina-digitale',
      createdAt: new Date().toISOString(),
      checksum,
      data,
    };
  }

  private async checksum(data: BackupPayload): Promise<string> {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async verify(file: BackupFile): Promise<boolean> {
    return (await this.checksum(file.data)) === file.checksum;
  }

  /** Backup automatico e silenzioso: salvato internamente, non scaricato. */
  async runSilentAutoBackup(): Promise<void> {
    const backup = await this.buildBackupFile();
    this.storage.set(AUTO_BACKUP_KEY, backup);
  }

  getAutoBackup(): BackupFile | null {
    return this.storage.get<BackupFile>(AUTO_BACKUP_KEY);
  }

  async restoreFromAutoBackup(): Promise<void> {
    const backup = this.getAutoBackup();
    if (!backup) throw new Error('Nessun backup automatico disponibile');
    await this.applyBackup(backup);
  }

  /** Esporta un file JSON scaricabile/condivisibile dall'utente. */
  async exportToFile(): Promise<void> {
    const backup = await this.buildBackupFile();
    const json = JSON.stringify(backup, null, 2);
    const fileName = `dispensina-digitale-backup-${new Date().toISOString().slice(0, 10)}.json`;

    if (Capacitor.isNativePlatform()) {
      const result = await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Cache,
        encoding: 'utf8' as any,
      });
      await Share.share({
        title: 'Backup Dispensina Digitale',
        url: result.uri,
      });
    } else {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  parseBackupJson(json: string): BackupFile {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object' || !parsed.data || !parsed.checksum) {
      throw new Error('File di backup non valido');
    }
    return parsed as BackupFile;
  }

  async restoreFromJson(json: string): Promise<void> {
    const backup = this.parseBackupJson(json);
    const valid = await this.verify(backup);
    if (!valid) throw new Error('Il file di backup è danneggiato o è stato alterato (checksum non valido)');
    await this.applyBackup(backup);
  }

  private async applyBackup(backup: BackupFile): Promise<void> {
    this.applyPayload(backup.data);
  }

  /** Sostituisce l'intero stato locale con quello indicato (usato anche dalla sincronizzazione). */
  applyPayload(data: BackupPayload): void {
    this.productService.replaceAll(data.products ?? []);
    this.categoryService.replaceCustom(data.customCategories ?? []);
    this.shoppingService.replaceAll(data.shoppingItems ?? []);
    if (data.preferences) this.preferencesService.update(data.preferences);
    this.barcodeCache.replaceAll(data.barcodeCache ?? {});
    this.productService.replacePurchaseHistory(data.purchaseHistory ?? {});
  }
}
