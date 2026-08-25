import { Injectable } from '@angular/core';
import { ProductService } from './product.service';
import { Product } from '../models/product.model';

export interface CategoryStat { category: string; count: number; emoji: string; }
export interface LocationStat  { location: string; label: string; count: number; }
export interface ExpiryBucket  { label: string; count: number; color: string; }

@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(private productService: ProductService) {}

  byCategory(): CategoryStat[] {
    const map = new Map<string, { count: number; emoji: string }>();
    for (const p of this.productService.getAll()) {
      const cur = map.get(p.category);
      if (cur) { cur.count++; }
      else { map.set(p.category, { count: 1, emoji: this.emoji(p) }); }
    }
    return Array.from(map.entries())
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.count - a.count);
  }

  byLocation(): LocationStat[] {
    const labels: Record<string, string> = { pantry: 'Dispensa', fridge: 'Frigo', freezer: 'Freezer' };
    const map = new Map<string, number>();
    for (const p of this.productService.getAll()) {
      map.set(p.location, (map.get(p.location) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([location, count]) => ({ location, label: labels[location] ?? location, count }))
      .sort((a, b) => b.count - a.count);
  }

  expiryDistribution(): ExpiryBucket[] {
    const products = this.productService.getAll().filter(p => p.expiryDate);
    let expired = 0, today = 0, week = 0, month = 0, later = 0;
    for (const p of products) {
      const d = this.productService.daysUntil(p.expiryDate!);
      if (d < 0)       expired++;
      else if (d === 0) today++;
      else if (d <= 7)  week++;
      else if (d <= 30) month++;
      else              later++;
    }
    return [
      { label: 'Scaduti',   count: expired, color: 'danger' },
      { label: 'Oggi',      count: today,   color: 'danger' },
      { label: '≤ 7 giorni', count: week,   color: 'warning' },
      { label: '≤ 30 giorni', count: month, color: 'primary' },
      { label: 'Oltre',     count: later,   color: 'success' },
    ].filter(b => b.count > 0);
  }

  totalProducts(): number { return this.productService.getAll().length; }
  totalExpired(): number  { return this.productService.getExpired().length; }
  totalExpiring(): number { return this.productService.getExpiringWithinDays(7).length; }
  totalLowStock(): number {
    return this.productService.getAll()
      .filter(p => p.lowStockThreshold !== null && p.quantity <= p.lowStockThreshold).length;
  }

  private emoji(p: Product): string {
    const map: Record<string, string> = {
      verdura:'🥦', frutta:'🍎', carne:'🥩', pesce:'🐟', latticini:'🧀',
      cereali:'🌾', legumi:'🫘', condimenti:'🫙', bevande:'🥤',
      dolci:'🍫', surgelati:'🧊', altro:'📦',
    };
    return map[p.category?.toLowerCase()] ?? '📦';
  }
}
