// GENERATO da scripts/deploy-functions.mjs a partire da src/app/notifications/planner.ts: non modificare qui.
/**
 * Pianificatore delle notifiche di Dispensina Digitale.
 *
 * Modulo puro, senza dipendenze: è usato dall'app (notifiche locali Android e riepilogo web)
 * e, copiato così com'è, dalla funzione server che invia le notifiche push (supabase/functions).
 * Lavora solo con date "di calendario" (AAAA-MM-GG), così non ha problemi di fuso orario:
 * chi lo chiama decide qual è "oggi" per l'utente.
 */

export interface PlannerProduct {
  id: string;
  name: string;
  quantity: number;
  expiryDate: string | null;
  lowStockThreshold: number | null;
}

export interface NotificationPrefs {
  notificationsEnabled: boolean;
  /** Ora degli avvisi, "HH:MM". */
  notifyTime: string;
  /** Avviso N giorni prima della scadenza. */
  notifyExpiry: boolean;
  expiryAlertDays: number;
  /** Avviso anche il giorno stesso della scadenza. */
  notifySameDay: boolean;
  /** Promemoria il giorno dopo la scadenza. */
  notifyExpired: boolean;
  /** Prodotti sotto la scorta minima. */
  notifyLowStock: boolean;
  /** Una sola notifica al giorno con tutto, invece di una per prodotto. */
  notifySummary: boolean;
  /** Prodotti aggiunti da altri membri della dispensa condivisa. */
  notifyAdditions: boolean;
}

/** Valori predefiniti (usati anche dal server quando un'opzione non è ancora stata salvata). */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  notificationsEnabled: true,
  notifyTime: '09:00',
  notifyExpiry: true,
  expiryAlertDays: 7,
  notifySameDay: true,
  notifyExpired: true,
  notifyLowStock: true,
  notifySummary: true,
  notifyAdditions: true,
};

export type EventKind = 'expiring' | 'today' | 'expired' | 'lowStock';

export interface PlannedEvent {
  kind: EventKind;
  productId: string;
  name: string;
  /** Giorni alla scadenza (solo per gli eventi di scadenza). */
  days?: number;
}

export interface PlannedNotification {
  /** Identificativo stabile (stesso giorno e contenuto ⇒ stesso id). */
  id: number;
  /** Giorno di invio, AAAA-MM-GG. */
  day: string;
  title: string;
  body: string;
  events: PlannedEvent[];
}

const DAY_MS = 86400000;

/** Converte "AAAA-MM-GG" (o una data ISO completa) in un numero di giorni dall'epoca, senza fuso orario. */
export function dayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function dayKey(dayNum: number): string {
  return new Date(dayNum * DAY_MS).toISOString().slice(0, 10);
}

/** Giorno di calendario locale del dispositivo. */
export function localDayKey(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function parseTime(time: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  const hour = m ? Math.min(23, Math.max(0, Number(m[1]))) : 9;
  const minute = m ? Math.min(59, Math.max(0, Number(m[2]))) : 0;
  return { hour, minute };
}

export function isLowStock(p: PlannerProduct): boolean {
  return p.lowStockThreshold !== null && p.lowStockThreshold !== undefined
    && Number(p.quantity) <= Number(p.lowStockThreshold);
}

/** Eventi che riguardano un certo giorno. */
export function eventsForDay(
  products: PlannerProduct[],
  prefs: NotificationPrefs,
  day: string,
  includeLowStock: boolean,
): PlannedEvent[] {
  const today = dayNumber(day);
  const events: PlannedEvent[] = [];

  for (const p of products) {
    if (!p.expiryDate) continue;
    const diff = dayNumber(p.expiryDate) - today;
    if (prefs.notifyExpiry && prefs.expiryAlertDays > 0 && diff === prefs.expiryAlertDays) {
      events.push({ kind: 'expiring', productId: p.id, name: p.name, days: diff });
    } else if (prefs.notifySameDay && diff === 0) {
      events.push({ kind: 'today', productId: p.id, name: p.name, days: 0 });
    } else if (prefs.notifyExpired && diff === -1) {
      events.push({ kind: 'expired', productId: p.id, name: p.name, days: -1 });
    }
  }

  if (includeLowStock && prefs.notifyLowStock) {
    for (const p of products) {
      if (isLowStock(p)) events.push({ kind: 'lowStock', productId: p.id, name: p.name });
    }
  }
  return events;
}

const list = (names: string[], max = 4) =>
  names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} e altri ${names.length - max}`;

const daysLabel = (n: number) => (n === 1 ? 'domani' : `tra ${n} giorni`);

/** Una notifica riepilogativa per tutti gli eventi del giorno. */
export function summaryNotification(day: string, events: PlannedEvent[]): PlannedNotification | null {
  if (events.length === 0) return null;
  const names = (k: EventKind) => events.filter(e => e.kind === k).map(e => e.name);
  const lines: string[] = [];
  const today = names('today'), expiring = names('expiring'), expired = names('expired'), low = names('lowStock');
  if (today.length) lines.push(`Scade oggi: ${list(today)}`);
  if (expiring.length) lines.push(`Scade ${daysLabel(events.find(e => e.kind === 'expiring')!.days!)}: ${list(expiring)}`);
  if (expired.length) lines.push(`Scaduto ieri: ${list(expired)}`);
  if (low.length) lines.push(`Scorte basse: ${list(low)}`);

  const expiryCount = today.length + expiring.length + expired.length;
  const title = expiryCount > 0
    ? `${expiryCount} prodott${expiryCount === 1 ? 'o' : 'i'} da controllare`
    : 'Scorte in esaurimento';
  return { id: hash('summary|' + day), day, title, body: lines.join('\n'), events };
}

/** Una notifica per ogni prodotto in scadenza, più una per le scorte basse. */
export function perProductNotifications(day: string, events: PlannedEvent[]): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  for (const e of events) {
    if (e.kind === 'lowStock') continue;
    const title = e.kind === 'today' ? 'Scade oggi'
      : e.kind === 'expired' ? 'Prodotto scaduto'
      : 'Prodotto in scadenza';
    const body = e.kind === 'today' ? `${e.name} scade oggi`
      : e.kind === 'expired' ? `${e.name} è scaduto ieri`
      : `${e.name} scade ${daysLabel(e.days!)}`;
    out.push({ id: hash(`${e.kind}|${e.productId}|${day}`), day, title, body, events: [e] });
  }
  const low = events.filter(e => e.kind === 'lowStock');
  if (low.length) {
    out.push({
      id: hash('lowStock|' + day), day, title: 'Scorte basse',
      body: `Da ricomprare: ${list(low.map(e => e.name), 6)}`, events: low,
    });
  }
  return out;
}

export function notificationsForDay(
  products: PlannerProduct[],
  prefs: NotificationPrefs,
  day: string,
  includeLowStock: boolean,
): PlannedNotification[] {
  if (!prefs.notificationsEnabled) return [];
  const events = eventsForDay(products, prefs, day, includeLowStock);
  if (prefs.notifySummary) {
    const n = summaryNotification(day, events);
    return n ? [n] : [];
  }
  return perProductNotifications(day, events);
}

/**
 * Notifiche dei prossimi `horizonDays` giorni a partire da `today` (giorno locale).
 * Le scorte basse compaiono solo nella prima notifica utile, perché dipendono dallo stato attuale.
 * `skipToday` esclude oggi (quando l'orario degli avvisi è già passato).
 */
export function planNotifications(
  products: PlannerProduct[],
  prefs: NotificationPrefs,
  today: string,
  horizonDays: number,
  skipToday: boolean,
): PlannedNotification[] {
  const start = dayNumber(today) + (skipToday ? 1 : 0);
  const out: PlannedNotification[] = [];
  for (let d = start; d < dayNumber(today) + horizonDays; d++) {
    out.push(...notificationsForDay(products, prefs, dayKey(d), d === start));
  }
  return out;
}

/** Testo dell'avviso "X ha aggiunto…" (dispensa e/o lista della spesa). Usato da app e server. */
export function additionsMessage(by: string, products: string[], shopping: string[]): { title: string; body: string } {
  const who = by || 'Qualcuno';
  if (products.length && !shopping.length) return { title: `${who} ha aggiunto alla dispensa`, body: list(products) };
  if (shopping.length && !products.length) return { title: `${who} ha aggiunto alla lista della spesa`, body: list(shopping) };
  return { title: `${who} ha aggiunto`, body: `Dispensa: ${list(products)}\nSpesa: ${list(shopping)}` };
}

/** Hash stabile a 31 bit (gli id delle notifiche Android devono essere interi positivi). */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 2147483647 || 1;
}
