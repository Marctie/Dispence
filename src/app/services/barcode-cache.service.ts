import { Injectable } from '@angular/core';
import { BarcodeCacheEntry } from '../models/barcode-cache.model';
import { StorageService } from './storage.service';

const KEY = 'dispensa_barcode_cache';

@Injectable({ providedIn: 'root' })
export class BarcodeCacheService {
  private cache: Record<string, BarcodeCacheEntry> = {};

  constructor(private storage: StorageService) {
    this.cache = this.storage.get<Record<string, BarcodeCacheEntry>>(KEY) ?? {};
  }

  lookup(barcode: string): BarcodeCacheEntry | null {
    return this.cache[barcode] ?? null;
  }

  remember(entry: BarcodeCacheEntry): void {
    this.cache[entry.barcode] = entry;
    this.storage.set(KEY, this.cache);
  }

  getAll(): Record<string, BarcodeCacheEntry> {
    return this.cache;
  }

  replaceAll(cache: Record<string, BarcodeCacheEntry>): void {
    this.cache = cache;
    this.storage.set(KEY, this.cache);
  }
}
