import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { UsageEntry, UsageReason } from '../models/usage.model';
import { StorageService } from './storage.service';
import { TelemetryService } from './telemetry.service';

@Injectable({ providedIn: 'root' })
export class ProductService {
  /** Solo il tipo di azione (mai il nome del prodotto). */
  private telemetry = inject(TelemetryService);
  private readonly KEY = 'dispensa_products';
  private readonly PURCHASE_HISTORY_KEY = 'dispensa_purchase_history';
  private products$ = new BehaviorSubject<Product[]>([]);
  private purchaseHistory: Record<string, { name: string; count: number }> = {};
  private readonly USAGE_KEY = 'dispensa_usage_history';
  /** Storico delle uscite: le più recenti in testa. */
  private usage$ = new BehaviorSubject<UsageEntry[]>([]);

  constructor(private storage: StorageService) {
    const saved = this.storage.get<Product[]>(this.KEY) ?? [];
    this.products$.next(saved);
    this.purchaseHistory = this.storage.get<Record<string, { name: string; count: number }>>(this.PURCHASE_HISTORY_KEY) ?? {};
    this.usage$.next(this.storage.get<UsageEntry[]>(this.USAGE_KEY) ?? []);
  }

  getAll$(): Observable<Product[]> {
    return this.products$.asObservable();
  }

  getAll(): Product[] {
    return this.products$.value;
  }

  replaceAll(products: Product[]): void {
    this.save(products);
  }

  getPurchaseHistory(): Record<string, { name: string; count: number }> {
    return this.purchaseHistory;
  }

  replacePurchaseHistory(history: Record<string, { name: string; count: number }>): void {
    this.purchaseHistory = history;
    this.storage.set(this.PURCHASE_HISTORY_KEY, history);
  }

  add(data: Omit<Product, 'id' | 'addedAt'>): void {
    const product: Product = {
      ...data,
      id: this.generateId(),
      addedAt: new Date().toISOString(),
    };
    this.save([...this.products$.value, product]);
    if (!data.isDemo) {
      this.trackPurchase(product.name);
      this.telemetry.track('prodotto_aggiunto');
    }
  }

  /** Nomi dei prodotti più spesso aggiunti alla dispensa, in ordine decrescente. */
  mostRepurchased(limit = 5): { name: string; count: number }[] {
    return Object.values(this.purchaseHistory)
      .filter(e => e.count > 1)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private trackPurchase(name: string): void {
    const trimmed = name.trim();
    const key = trimmed.toLowerCase();
    if (!key) return;
    const existing = this.purchaseHistory[key];
    this.purchaseHistory[key] = { name: trimmed, count: (existing?.count ?? 0) + 1 };
    this.storage.set(this.PURCHASE_HISTORY_KEY, this.purchaseHistory);
  }

  update(id: string, changes: Partial<Product>): void {
    this.save(this.products$.value.map(p => (p.id === id ? { ...p, ...changes } : p)));
    this.telemetry.track('prodotto_modificato');
  }

  delete(id: string): void {
    this.save(this.products$.value.filter(p => p.id !== id));
    this.telemetry.track('prodotto_eliminato');
  }

  // ── Uscite e storico ──────────────────────────────────────────────────────

  /**
   * Toglie dalla dispensa una quantità di un prodotto (usato o buttato) e la registra nello storico.
   * Se la quantità arriva a zero il prodotto viene tolto dalla dispensa.
   */
  consume(id: string, quantity: number, reason: UsageReason): UsageEntry | null {
    const product = this.products$.value.find(p => p.id === id);
    if (!product || !(quantity > 0)) return null;
    const taken = Math.min(quantity, product.quantity);
    const left = Math.round((product.quantity - taken) * 1000) / 1000;
    const finished = left <= 0;
    this.save(finished
      ? this.products$.value.filter(p => p.id !== id)
      : this.products$.value.map(p => (p.id === id ? { ...p, quantity: left } : p)));

    const entry: UsageEntry = {
      id: this.generateId(),
      productId: product.id,
      name: product.name,
      category: product.category,
      location: product.location,
      quantity: taken,
      unit: product.unit,
      reason,
      usedAt: new Date().toISOString(),
      finished,
      ...(finished ? { snapshot: { ...product } } : {}),
    };
    if (!product.isDemo) this.saveUsage([entry, ...this.usage$.value]);
    this.telemetry.track(reason === 'wasted' ? 'prodotto_buttato' : 'prodotto_usato');
    return entry;
  }

  getUsage$(): Observable<UsageEntry[]> {
    return this.usage$.asObservable();
  }

  getUsageHistory(): UsageEntry[] {
    return this.usage$.value;
  }

  replaceUsageHistory(entries: UsageEntry[]): void {
    this.saveUsage(entries);
  }

  deleteUsage(id: string): void {
    this.saveUsage(this.usage$.value.filter(e => e.id !== id));
  }

  clearUsage(): void {
    this.saveUsage([]);
  }

  /** Annulla un'uscita: rimette la quantità in dispensa (ricreando il prodotto se era finito). */
  undoUsage(entry: UsageEntry): void {
    const existing = this.products$.value.find(p => p.id === entry.productId);
    if (existing) {
      this.save(this.products$.value.map(p =>
        p.id === entry.productId ? { ...p, quantity: Math.round((p.quantity + entry.quantity) * 1000) / 1000 } : p));
    } else {
      const restored: Product = entry.snapshot ? { ...entry.snapshot, quantity: entry.quantity } : {
        id: entry.productId, name: entry.name, category: entry.category, location: entry.location,
        quantity: entry.quantity, unit: entry.unit, expiryDate: null, notes: '',
        addedAt: new Date().toISOString(), lowStockThreshold: null, price: null,
      };
      this.save([...this.products$.value, restored]);
    }
    this.deleteUsage(entry.id);
  }

  private saveUsage(entries: UsageEntry[]): void {
    const sorted = [...entries].sort((a, b) => b.usedAt.localeCompare(a.usedAt));
    this.usage$.next(sorted);
    this.storage.set(this.USAGE_KEY, sorted);
  }

  getExpiringWithinDays(days: number): Product[] {
    return this.products$.value
      .filter(p => p.expiryDate !== null && this.daysUntil(p.expiryDate!) >= 0 && this.daysUntil(p.expiryDate!) <= days)
      .sort((a, b) => this.daysUntil(a.expiryDate!) - this.daysUntil(b.expiryDate!));
  }

  getExpired(): Product[] {
    return this.products$.value.filter(p => p.expiryDate && this.daysUntil(p.expiryDate) < 0);
  }

  daysUntil(dateStr: string): number {
    const d = new Date(dateStr);
    const t = new Date();
    d.setHours(0, 0, 0, 0);
    t.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - t.getTime()) / 86400000);
  }

  private save(products: Product[]): void {
    this.products$.next(products);
    this.storage.set(this.KEY, products);
  }

  private generateId(): string {
    return typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
