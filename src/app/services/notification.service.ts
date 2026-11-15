import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { environment } from '../../environments/environment';
import { Product } from '../models/product.model';
import { UserPreferences } from '../models/user-preferences.model';
import {
  additionsMessage, dayNumber, hash, localDayKey, notificationsForDay, parseTime, planNotifications,
} from '../notifications/planner';
import { AuthService } from './auth.service';

const WEB_LAST_NOTIFIED_KEY = 'dispensa_web_last_expiry_notification';
const PUSH_ENDPOINT_KEY = 'dispensa_push_endpoint';
/** Giorni di notifiche pianificate in anticipo su Android (si ripianifica a ogni apertura/modifica). */
const HORIZON_DAYS = 30;
const MAX_SCHEDULED = 60;

export const CHANNEL_EXPIRY = 'expiry-alerts';
export const CHANNEL_PANTRY = 'pantry-updates';

/**
 * Notifiche.
 * - Android: notifiche locali pianificate (scadenze, scorte basse) che arrivano anche ad app chiusa,
 *   più l'avviso dei prodotti aggiunti da altri membri quando l'app è in secondo piano.
 * - Web/iPhone: notifiche push inviate dal server (Supabase) anche ad app chiusa, se l'utente ha un
 *   account e l'app è installata nella schermata Home. Senza push si mostra un riepilogo all'apertura.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private lastArgs: { products: Product[]; prefs: UserPreferences } | null = null;

  constructor(private auth: AuthService) {}

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

  /** Notifiche push dal server (app chiusa) disponibili su questo browser. */
  get isPushSupported(): boolean {
    return this.isWebSupported && 'PushManager' in window
      && !!environment.vapidPublicKey && this.auth.enabled && !!this.auth.user;
  }

  get isPushActive(): boolean {
    try { return !!localStorage.getItem(PUSH_ENDPOINT_KEY); } catch { return false; }
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

  /** Stato reale del permesso di sistema (la preferenza "notifiche attive" da sola non basta). */
  async permissionState(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
    try {
      if (this.isSupported) {
        const { display } = await LocalNotifications.checkPermissions();
        return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
      }
      if (this.isWebSupported) {
        return Notification.permission === 'granted' ? 'granted'
          : Notification.permission === 'denied' ? 'denied' : 'prompt';
      }
    } catch { /* plugin non disponibile */ }
    return 'unsupported';
  }

  /** Ripianifica con gli ultimi dati (es. subito dopo aver ottenuto il permesso). */
  async refresh(): Promise<void> {
    if (this.lastArgs) await this.rescheduleAll(this.lastArgs.products, this.lastArgs.prefs);
  }

  /**
   * Chiede il permesso e attiva tutto (push sul web, ripianificazione su Android).
   * Va chiamata direttamente dal tocco dell'utente: su iPhone la richiesta di sistema compare solo così.
   */
  async activate(): Promise<'granted' | 'denied' | 'needs-home-screen'> {
    if (this.needsHomeScreenInstall) return 'needs-home-screen';
    const granted = await this.ensurePermission();
    if (!granted) return 'denied';
    if (this.isPushSupported) await this.enablePush();
    await this.refresh();
    return 'granted';
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

  /** Ripianifica tutte le notifiche a partire dallo stato attuale della dispensa e delle preferenze. */
  async rescheduleAll(products: Product[], prefs: UserPreferences): Promise<void> {
    this.lastArgs = { products, prefs };
    if (!this.isSupported) {
      await this.checkWeb();
      return;
    }
    // Una ripianificazione alla volta: all'avvio ne partono più d'una quasi insieme (dati, preferenze)
    // e due giri sovrapposti potrebbero cancellare a vicenda ciò che l'altro ha appena pianificato.
    const run = this.nativeQueue.then(() => this.rescheduleNative(products, prefs));
    this.nativeQueue = run.catch(() => undefined);
    return run;
  }

  private nativeQueue: Promise<void> = Promise.resolve();

  private async rescheduleNative(products: Product[], prefs: UserPreferences): Promise<void> {
    const pending = await LocalNotifications.getPending();
    const expiryIds = pending.notifications
      .filter(n => (n as LocalNotificationSchema).channelId !== CHANNEL_PANTRY)
      .map(n => Number(n.id))
      .filter(id => Number.isInteger(id))
      .map(id => ({ id }));
    if (expiryIds.length) {
      try {
        await LocalNotifications.cancel({ notifications: expiryIds });
      } catch (e) {
        // Una cancellazione non riuscita non deve impedire di pianificare: gli id sono stabili,
        // quindi le notifiche ripianificate sostituiscono comunque quelle vecchie con lo stesso id.
        console.warn('Cancellazione notifiche non riuscita', e);
      }
    }
    if (!prefs.notificationsEnabled) return;

    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    const now = new Date();
    const { hour, minute } = parseTime(prefs.notifyTime);
    const todayAt = new Date(now);
    todayAt.setHours(hour, minute, 0, 0);

    const planned = planNotifications(products, prefs, localDayKey(now), HORIZON_DAYS, todayAt <= now)
      .slice(0, MAX_SCHEDULED);

    const notifications: LocalNotificationSchema[] = planned.map(n => {
      const [y, m, d] = n.day.split('-').map(Number);
      return {
        id: n.id,
        title: n.title,
        body: n.body,
        largeBody: n.body,
        schedule: { at: new Date(y, m - 1, d, hour, minute), allowWhileIdle: true },
        channelId: CHANNEL_EXPIRY,
        // Niente sveglia "esatta": basta l'orario con qualche minuto di tolleranza. Con il default (true)
        // il plugin v8, senza il permesso "Sveglie e promemoria", aprirebbe le impostazioni di Android
        // a ogni pianificazione e la chiamata resterebbe in attesa.
        isExactNotification: false,
      };
    });
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  }

  /** Android: prodotti aggiunti da un altro membro mentre l'app è in secondo piano. */
  async showAdditions(by: string, names: string[], shopping: string[], prefs: UserPreferences): Promise<void> {
    if (!this.isSupported || !prefs.notificationsEnabled || !prefs.notifyAdditions) return;
    if (document.visibilityState === 'visible') return;
    const { title, body } = additionsMessage(by, names, shopping);
    await LocalNotifications.schedule({
      notifications: [{
        id: hash('add|' + Date.now()), title, body, largeBody: body, channelId: CHANNEL_PANTRY, isExactNotification: false,
      }],
    });
  }

  /** Web: riepilogo all'apertura (se non ci sono le push) e numero sull'icona dell'app. */
  async checkWeb(): Promise<void> {
    if (this.isSupported || !this.lastArgs) return;
    const { products, prefs } = this.lastArgs;
    const today = localDayKey(new Date());

    const due = prefs.notificationsEnabled
      ? products.filter(p => p.expiryDate && dayNumber(p.expiryDate) - dayNumber(today) <= prefs.expiryAlertDays)
      : [];
    await this.setBadge(due.length);

    if (!prefs.notificationsEnabled || !this.isWebSupported || Notification.permission !== 'granted') return;
    if (this.isPushActive) return;           // ci pensa il server, anche ad app chiusa

    const { hour, minute } = parseTime(prefs.notifyTime);
    const now = new Date();
    if (now.getHours() * 60 + now.getMinutes() < hour * 60 + minute) return;
    try {
      if (localStorage.getItem(WEB_LAST_NOTIFIED_KEY) === today) return;
    } catch { /* storage non disponibile */ }

    const [n] = notificationsForDay(products, { ...prefs, notifySummary: true }, today, true);
    if (!n) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(n.title, {
        body: n.body,
        icon: 'assets/icon/icon-192.png',
        badge: 'assets/icon/icon-192.png',
        tag: 'expiry-summary',
      });
      localStorage.setItem(WEB_LAST_NOTIFIED_KEY, today);
    } catch (e) {
      console.error('Notifica web non riuscita', e);
    }
  }

  // ── Push dal server (web) ─────────────────────────────────────────────────

  /** Iscrive questo browser alle notifiche push dell'account. */
  async enablePush(): Promise<boolean> {
    if (!this.isPushSupported || Notification.permission !== 'granted') return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.base64UrlToBytes(environment.vapidPublicKey),
        });
      }
      const json = sub.toJSON();
      // Lo stesso browser potrebbe essere stato usato da un altro account: si ripulisce prima.
      await this.auth.supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      const { error } = await this.auth.supabase.from('push_subscriptions').insert({
        endpoint: sub.endpoint,
        p256dh: json.keys?.['p256dh'],
        auth: json.keys?.['auth'],
      });
      if (error) throw error;
      localStorage.setItem(PUSH_ENDPOINT_KEY, sub.endpoint);
      return true;
    } catch (e) {
      console.error('Iscrizione alle notifiche push non riuscita', e);
      return false;
    }
  }

  async disablePush(): Promise<void> {
    if (!this.isWebSupported) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        if (this.auth.user) {
          await this.auth.supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
        await sub.unsubscribe();
      }
    } catch (e) {
      console.error('Disattivazione push non riuscita', e);
    } finally {
      try { localStorage.removeItem(PUSH_ENDPOINT_KEY); } catch { /* ignore */ }
    }
  }

  /** Notifica di prova: su web passa dal server (verifica tutta la catena), su Android è locale. */
  async sendTest(): Promise<string> {
    if (this.isSupported) {
      if (!(await this.ensurePermission())) return 'Permesso notifiche negato';
      await LocalNotifications.schedule({
        notifications: [{
          id: hash('test|' + Date.now()), title: 'Dispensina Digitale',
          body: 'Le notifiche funzionano 👍', channelId: CHANNEL_EXPIRY, isExactNotification: false,
          schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
        }],
      });
      return 'Notifica di prova tra qualche secondo';
    }
    if (this.isPushActive && this.auth.user) {
      const { error } = await this.auth.supabase.functions.invoke('push-test', { body: {} });
      return error ? 'Invio non riuscito, riprova più tardi' : 'Notifica di prova inviata';
    }
    if (this.isWebSupported && Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification('Dispensina Digitale', { body: 'Le notifiche funzionano 👍', icon: 'assets/icon/icon-192.png' });
      return 'Notifica di prova mostrata';
    }
    return 'Attiva prima le notifiche';
  }

  private async setBadge(count: number): Promise<void> {
    const nav = navigator as any;
    try {
      if (count > 0 && nav.setAppBadge) await nav.setAppBadge(count);
      else if (nav.clearAppBadge) await nav.clearAppBadge();
    } catch { /* badge non supportato */ }
  }

  private base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
    const padded = (value + '='.repeat((4 - (value.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(padded);
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
}
