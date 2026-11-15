import { DEFAULT_PREFERENCES } from '../models/user-preferences.model';
import { NotificationPrefs, PlannerProduct, dayKey, dayNumber, notificationsForDay, planNotifications } from './planner';

const TODAY = '2026-11-15';
const inDays = (n: number) => dayKey(dayNumber(TODAY) + n);
const prod = (name: string, expiry: number | null, quantity = 2, low: number | null = null): PlannerProduct =>
  ({ id: name, name, quantity, expiryDate: expiry === null ? null : inDays(expiry), lowStockThreshold: low });
const prefs = (over: Partial<NotificationPrefs> = {}): NotificationPrefs => ({ ...DEFAULT_PREFERENCES, ...over });

describe('Pianificatore notifiche', () => {
  const products = [
    prod('Latte', 0), prod('Pane', 3), prod('Yogurt', -1), prod('Pasta', 200),
    prod('Caffè', null, 1, 1), prod('Riso', null, 5, 1),
  ];

  it('riepilogo unico: una notifica con oggi, preavviso, scaduti e scorte basse', () => {
    const [n, ...rest] = notificationsForDay(products, prefs({ expiryAlertDays: 3 }), TODAY, true);
    expect(rest.length).toBe(0);
    expect(n.title).toBe('3 prodotti da controllare');
    expect(n.body).toContain('Scade oggi: Latte');
    expect(n.body).toContain('Scade tra 3 giorni: Pane');
    expect(n.body).toContain('Scaduto ieri: Yogurt');
    expect(n.body).toContain('Scorte basse: Caffè');
    expect(n.body).not.toContain('Riso');
    expect(n.body).not.toContain('Pasta');
  });

  it('una notifica per prodotto quando il riepilogo è disattivato', () => {
    const list = notificationsForDay(products, prefs({ notifySummary: false, expiryAlertDays: 3 }), TODAY, true);
    expect(list.map(n => n.body)).toEqual([
      'Latte scade oggi', 'Pane scade tra 3 giorni', 'Yogurt è scaduto ieri', 'Da ricomprare: Caffè',
    ]);
  });

  it('ogni opzione si può spegnere', () => {
    const off = prefs({ notifySameDay: false, notifyExpired: false, notifyLowStock: false, expiryAlertDays: 3 });
    const [n] = notificationsForDay(products, off, TODAY, true);
    expect(n.body).toBe('Scade tra 3 giorni: Pane');
    expect(notificationsForDay(products, prefs({ notificationsEnabled: false }), TODAY, true)).toEqual([]);
  });

  it('pianifica i giorni futuri: il preavviso cade il giorno giusto', () => {
    const plan = planNotifications([prod('Pane', 10)], prefs({ expiryAlertDays: 7 }), TODAY, 30, false);
    expect(plan.map(n => n.day)).toEqual([inDays(3), inDays(10), inDays(11)]);
    expect(plan[0].body).toBe('Scade tra 7 giorni: Pane');
  });

  it('se l’orario di oggi è passato, oggi viene saltato', () => {
    const plan = planNotifications([prod('Latte', 0), prod('Pane', 1)], prefs({ notifyExpiry: false }), TODAY, 5, true);
    expect(plan.map(n => n.day)).toEqual([inDays(1), inDays(2)]);
  });

  it('le scorte basse compaiono solo nella prima notifica utile', () => {
    const plan = planNotifications([prod('Caffè', null, 0, 1), prod('Pane', 4)], prefs({ expiryAlertDays: 2 }), TODAY, 10, false);
    expect(plan[0].day).toBe(TODAY);
    expect(plan[0].body).toContain('Scorte basse: Caffè');
    expect(plan.slice(1).some(n => n.body.includes('Caffè'))).toBeFalse();
  });

  it('id stabili e positivi (richiesti da Android)', () => {
    const a = planNotifications(products, prefs(), TODAY, 30, false);
    const b = planNotifications(products, prefs(), TODAY, 30, false);
    expect(a.map(n => n.id)).toEqual(b.map(n => n.id));
    expect(a.every(n => Number.isInteger(n.id) && n.id > 0 && n.id < 2147483647)).toBeTrue();
  });
});
