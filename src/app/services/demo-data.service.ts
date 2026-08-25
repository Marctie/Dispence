import { Injectable } from '@angular/core';
import { Product } from '../models/product.model';
import { ProductService } from './product.service';
import { BackupService } from './backup.service';

function inDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const DEMO_PRODUCTS: Omit<Product, 'id' | 'addedAt'>[] = [
  { name: 'Latte intero', category: 'latticini', location: 'fridge', quantity: 1, unit: 'l', expiryDate: inDays(3), notes: '', price: 1.5, lowStockThreshold: null, isDemo: true },
  { name: 'Petto di pollo', category: 'carne', location: 'fridge', quantity: 500, unit: 'g', expiryDate: inDays(1), notes: '', price: 5.9, lowStockThreshold: null, isDemo: true },
  { name: 'Pasta di semola', category: 'cereali', location: 'pantry', quantity: 2, unit: 'conf', expiryDate: inDays(180), notes: '', price: 1.2, lowStockThreshold: 1, isDemo: true },
  { name: 'Passata di pomodoro', category: 'scatolame', location: 'pantry', quantity: 3, unit: 'pz', expiryDate: inDays(300), notes: '', price: 0.9, lowStockThreshold: 1, isDemo: true },
  { name: 'Yogurt bianco', category: 'latticini', location: 'fridge', quantity: 4, unit: 'pz', expiryDate: inDays(-2), notes: '', price: 2.4, lowStockThreshold: null, isDemo: true },
  { name: 'Piselli surgelati', category: 'surgelati', location: 'freezer', quantity: 1, unit: 'busta', expiryDate: inDays(120), notes: '', price: 1.8, lowStockThreshold: null, isDemo: true },
  { name: 'Acqua naturale', category: 'bevande', location: 'pantry', quantity: 6, unit: 'pz', expiryDate: null, notes: '', price: 0.3, lowStockThreshold: 2, isDemo: true },
  { name: 'Detersivo piatti', category: 'altro', location: 'pantry', quantity: 1, unit: 'pz', expiryDate: null, notes: '', price: 2.5, lowStockThreshold: null, isDemo: true },
];

@Injectable({ providedIn: 'root' })
export class DemoDataService {
  constructor(private productService: ProductService, private backupService: BackupService) {}

  hasDemoData(): boolean {
    return this.productService.getAll().some(p => p.isDemo);
  }

  seedIfEmpty(): void {
    if (this.productService.getAll().length > 0) return;
    for (const demo of DEMO_PRODUCTS) {
      this.productService.add(demo);
    }
  }

  async removeDemoData(): Promise<void> {
    await this.backupService.runSilentAutoBackup();
    const remaining = this.productService.getAll().filter(p => !p.isDemo);
    this.productService.replaceAll(remaining);
  }
}
