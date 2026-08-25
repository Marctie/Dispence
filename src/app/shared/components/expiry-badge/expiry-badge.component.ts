import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-expiry-badge',
  templateUrl: 'expiry-badge.component.html',
  styleUrls: ['expiry-badge.component.scss'],
  standalone: false,
})
export class ExpiryBadgeComponent {
  @Input() expiryDate: string | null = null;

  get status(): 'ok' | 'soon' | 'today' | 'expired' | 'none' {
    if (!this.expiryDate) return 'none';
    const days = this.daysUntil(this.expiryDate);
    if (days < 0)  return 'expired';
    if (days === 0) return 'today';
    if (days <= 7) return 'soon';
    return 'ok';
  }

  get label(): string {
    if (!this.expiryDate) return '';
    const days = this.daysUntil(this.expiryDate);
    if (days < -1)  return `Scaduto ${Math.abs(days)}g fa`;
    if (days === -1) return 'Scaduto ieri';
    if (days === 0)  return 'Scade oggi';
    if (days === 1)  return 'Scade domani';
    if (days <= 7)  return `${days} giorni`;
    return this.formatDate(this.expiryDate);
  }

  private daysUntil(dateStr: string): number {
    const d = new Date(dateStr);
    const t = new Date();
    d.setHours(0, 0, 0, 0);
    t.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - t.getTime()) / 86400000);
  }

  private formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const months = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }
}
