import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../models/product.model';
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

  constructor(private storage: StorageService) {
    const saved = this.storage.get<Product[]>(this.KEY) ?? [];
    this.products$.next(saved);
    this.purchaseHistory = this.storage.get<Record<string, { name: string; count: number }>>(this.PURCHASE_HISTORY_KEY) ?? {};
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
