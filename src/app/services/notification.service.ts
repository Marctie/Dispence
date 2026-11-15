import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Product } from '../models/product.model';

const WEB_LAST_NOTIFIED_KEY = 'dispensa_web_last_expiry_notification';

/**
 * Notifiche di scadenza.
 * - Nativo (Android): notifiche locali pianificate, arrivano anche ad app chiusa.
 * - Web/PWA (es. iPhone da schermata Home): il browser non permette di pianificare
 *   notifiche future senza un server push. Quando l'app viene aperta o torna in primo piano
 *   si mostra al massimo una notifica riepilogativa al giorno e si aggiorna il badge
 *   sull'icona con il numero di prodotti scaduti/in scadenza.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private lastArgs: { products: Product[]; alertDays: number; enabled: boolean } | null = null;

  /** Notifiche native pianificabili (Android). */
  get isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  /** Notifiche web disponibili (su iPhone solo se l'app è installata nella schermata Home). */
  get isWebSupported(): boolean {
    return !Capacitor.isNativePlatform()
      && typeof window !== 'undefined'
      && 'Notification' in window
      && 'serviceWorker' in navigator;
  }

  /** True su iPhone/iPad in Safari ma non ancora aggiunta alla schermata Home. */
  get needsHomeScreenInstall(): boolean {
    if (Capacitor.isNativePlatform() || typeof navigator === 'undefined') return false;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = (navigator as any).standalone === true
      || window.matchMedia?.('(display-mode: standalone)').matches;
    return isIos && !standalone;
  }

  async ensurePermission(): Promise<boolean> {
    if (this.isSupported) {
      const { display } = await LocalNotifications.checkPermissions();
      if (display === 'granted') return true;
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    }
    if (this.isWebSupported) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;
      return (await Notification.requestPermission()) === 'granted';
    }
    return false;
  }

  /** Ripianifica tutte le notifiche di scadenza a partire dallo stato attuale della dispensa. */
  async rescheduleAll(products: Product[], alertDays: number, enabled: boolean): Promise<void> {
    this.lastArgs = { products, alertDays, enabled };
    if (!this.isSupported) {
      await this.checkWeb();
      return;
    }

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

  /** Web: da richiamare quando l'app torna in primo piano. */
  async checkWeb(): Promise<void> {
    if (this.isSupported || !this.lastArgs) return;
    const { products, alertDays, enabled } = this.lastArgs;
    const due = enabled ? this.dueProducts(products, alertDays) : [];

    await this.setBadge(due.length);

    if (!enabled || due.length === 0 || !this.isWebSupported) return;
    if (Notification.permission !== 'granted') return;

    const today = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(WEB_LAST_NOTIFIED_KEY) === today) return;
    } catch { /* storage non disponibile */ }

    const expired = due.filter(d => d.days < 0).length;
    const names = due.slice(0, 3).map(d => d.product.name).join(', ');
    const more = due.length > 3 ? ` e altri ${due.length - 3}` : '';
    const title = expired > 0
      ? `${due.length} prodott${due.length === 1 ? 'o' : 'i'} scadut${due.length === 1 ? 'o' : 'i'} o in scadenza`
      : `${due.length} prodott${due.length === 1 ? 'o' : 'i'} in scadenza`;

    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body: `${names}${more}`,
        icon: 'assets/icon/icon-192.png',
        badge: 'assets/icon/icon-192.png',
        tag: 'expiry-summary',
      });
      localStorage.setItem(WEB_LAST_NOTIFIED_KEY, today);
    } catch (e) {
      console.error('Notifica web non riuscita', e);
    }
  }

  private dueProducts(products: Product[], alertDays: number): { product: Product; days: number }[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return products
      .filter(p => p.expiryDate)
      .map(p => {
        const d = new Date(p.expiryDate!);
        d.setHours(0, 0, 0, 0);
        return { product: p, days: Math.round((d.getTime() - today.getTime()) / 86400000) };
      })
      .filter(x => x.days <= alertDays)
      .sort((a, b) => a.days - b.days);
  }

  private async setBadge(count: number): Promise<void> {
    const nav = navigator as any;
    try {
      if (count > 0 && nav.setAppBadge) await nav.setAppBadge(count);
      else if (nav.clearAppBadge) await nav.clearAppBadge();
    } catch { /* badge non supportato */ }
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
