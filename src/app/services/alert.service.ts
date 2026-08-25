import { Injectable } from '@angular/core';
import { Product } from '../models/product.model';
import { ProductService } from './product.service';

export interface ExpiryAlert {
  type: 'expired' | 'today' | 'soon';
  product: Product;
  daysUntil: number;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  constructor(private productService: ProductService) {}

  getAlerts(alertDays = 7): ExpiryAlert[] {
    const alerts: ExpiryAlert[] = [];
    for (const p of this.productService.getAll()) {
      if (!p.expiryDate) continue;
      const days = this.productService.daysUntil(p.expiryDate);
      if (days < 0) alerts.push({ type: 'expired', product: p, daysUntil: days });
      else if (days === 0) alerts.push({ type: 'today', product: p, daysUntil: 0 });
      else if (days <= alertDays) alerts.push({ type: 'soon', product: p, daysUntil: days });
    }
    return alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  get totalAlertCount(): number {
    return this.getAlerts().length;
  }
}
