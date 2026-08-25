import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  get isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  async ensurePermission(): Promise<boolean> {
    if (!this.isSupported) return false;
    const { display } = await LocalNotifications.checkPermissions();
    if (display === 'granted') return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  }

  /** Ripianifica tutte le notifiche di scadenza a partire dallo stato attuale della dispensa. */
  async rescheduleAll(products: Product[], alertDays: number, enabled: boolean): Promise<void> {
    if (!this.isSupported) return;

    await LocalNotifications.cancel({ notifications: await this.pendingIds() });
    if (!enabled) return;

    const granted = await this.ensurePermission();
    if (!granted) return;

    const notifications = products
      .filter(p => p.expiryDate)
      .map(p => this.buildNotification(p, alertDays))
      .filter((n): n is NonNullable<typeof n> => n !== null);

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  private buildNotification(product: Product, alertDays: number) {
    const expiry = new Date(product.expiryDate!);
    expiry.setHours(9, 0, 0, 0);
    const fireDate = new Date(expiry.getTime() - alertDays * 86400000);
    if (fireDate.getTime() <= Date.now()) return null;

    return {
      id: this.idFor(product.id),
      title: 'Prodotto in scadenza',
      body: `${product.name} scade il ${expiry.toLocaleDateString('it-IT')}`,
      schedule: { at: fireDate },
      channelId: 'expiry-alerts',
    };
  }

  private idFor(productId: string): number {
    let hash = 0;
    for (let i = 0; i < productId.length; i++) {
      hash = (hash * 31 + productId.charCodeAt(i)) >>> 0;
    }
    return hash % 2147483647;
  }

  private async pendingIds(): Promise<{ id: number }[]> {
    const { notifications } = await LocalNotifications.getPending();
    return notifications.map(n => ({ id: n.id }));
  }
}
