import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '../models/product.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly KEY = 'dispensa_products';
  private products$ = new BehaviorSubject<Product[]>([]);

  constructor(private storage: StorageService) {
    const saved = this.storage.get<Product[]>(this.KEY) ?? [];
    this.products$.next(saved);
  }

  getAll$(): Observable<Product[]> {
    return this.products$.asObservable();
  }

  getAll(): Product[] {
    return this.products$.value;
  }

  add(data: Omit<Product, 'id' | 'addedAt'>): void {
    const product: Product = {
      ...data,
      id: this.generateId(),
      addedAt: new Date().toISOString(),
    };
    this.save([...this.products$.value, product]);
  }

  update(id: string, changes: Partial<Product>): void {
    this.save(this.products$.value.map(p => (p.id === id ? { ...p, ...changes } : p)));
  }

  delete(id: string): void {
    this.save(this.products$.value.filter(p => p.id !== id));
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
