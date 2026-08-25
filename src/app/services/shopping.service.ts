import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ShoppingItem } from '../models/shopping-item.model';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class ShoppingService {
  private readonly KEY = 'dispensa_shopping';
  private items$ = new BehaviorSubject<ShoppingItem[]>([]);

  constructor(private storage: StorageService) {
    const saved = this.storage.get<ShoppingItem[]>(this.KEY) ?? [];
    this.items$.next(saved);
  }

  getAll$(): Observable<ShoppingItem[]> { return this.items$.asObservable(); }
  getAll(): ShoppingItem[] { return this.items$.value; }

  add(data: Pick<ShoppingItem, 'name' | 'quantity' | 'unit' | 'category'>): void {
    const existing = this.items$.value.find(
      i => i.name.toLowerCase() === data.name.toLowerCase() && !i.checked
    );
    if (existing) return;
    const item: ShoppingItem = {
      ...data,
      id: this.generateId(),
      checked: false,
      linkedProductId: null,
      addedAt: new Date().toISOString(),
    };
    this.save([...this.items$.value, item]);
  }

  addFromProduct(productId: string, name: string, unit: string, category: string): void {
    const exists = this.items$.value.some(i => i.linkedProductId === productId && !i.checked);
    if (exists) return;
    const item: ShoppingItem = {
      id: this.generateId(),
      name,
      quantity: 1,
      unit,
      category,
      checked: false,
      linkedProductId: productId,
      addedAt: new Date().toISOString(),
    };
    this.save([...this.items$.value, item]);
  }

  toggle(id: string): void {
    this.save(this.items$.value.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }

  delete(id: string): void {
    this.save(this.items$.value.filter(i => i.id !== id));
  }

  clearChecked(): void {
    this.save(this.items$.value.filter(i => !i.checked));
  }

  get pendingCount(): number {
    return this.items$.value.filter(i => !i.checked).length;
  }

  private save(items: ShoppingItem[]): void {
    this.items$.next(items);
    this.storage.set(this.KEY, items);
  }

  private generateId(): string {
    return typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
