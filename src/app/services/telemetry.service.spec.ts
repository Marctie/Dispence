import { TELEMETRY_LIMITS, TELEMETRY_QUEUE_KEY, TelemetryService } from './telemetry.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

/** Risposta finta di fetch. */
const resp = (status: number) => Promise.resolve(new Response(null, { status }));

describe('TelemetryService', () => {
  let t: TelemetryService;
  let calls: { url: string; init: RequestInit; rows: any[] }[];
  let answer: () => Promise<Response>;

  /** Istanza pronta all'invio ma senza hook globali (console, window) per non disturbare gli altri test. */
  function make(): TelemetryService {
    const s = new TelemetryService();
    (s as any).installed = true;
    s.fetchImpl = (url, init) => {
      calls.push({ url, init, rows: JSON.parse(String(init.body)) });
      return answer();
    };
    return s;
  }

  function stopTimers(s: TelemetryService): void {
    clearTimeout((s as any).sendTimer);
    (s as any).sendTimer = null;
  }

  beforeEach(() => {
    localStorage.removeItem(TELEMETRY_QUEUE_KEY);
    calls = [];
    answer = () => resp(201);
    t = make();
  });

  afterEach(() => {
    stopTimers(t);
    localStorage.removeItem(TELEMETRY_QUEUE_KEY);
  });

  it('accoda un evento con piattaforma, versione e dispositivo, e lo salva in localStorage', () => {
    t.track('prodotto_aggiunto');
    const q = t.pending();
    expect(q.length).toBe(1);
    expect(q[0].kind).toBe('event');
    expect(q[0].name).toBe('prodotto_aggiunto');
    expect(['android', 'ios-app', 'ios-safari', 'web']).toContain(q[0].platform);
    expect(q[0].app_version).toBe((environment as any).appVersion);
    expect(q[0].device_id).toMatch(/^d/);
    expect(JSON.parse(localStorage.getItem(TELEMETRY_QUEUE_KEY)!).length).toBe(1);
  });

  it('usa una chiave che NON inizia con dispensa_ (non viene cancellata al logout)', () => {
    expect(TELEMETRY_QUEUE_KEY.startsWith('dispensa_')).toBeFalse();
    t.track('logout');
    new AuthService(t).clearLocalData();
    expect(localStorage.getItem(TELEMETRY_QUEUE_KEY)).not.toBeNull();
  });

  it('raggruppa eventi uguali ravvicinati in un solo evento con conteggio', () => {
    t.track('prodotto_aggiunto');
    t.track('prodotto_aggiunto');
    t.track('prodotto_aggiunto', { count: 3 });
    t.track('prodotto_eliminato');
    const q = t.pending();
    expect(q.length).toBe(2);
    expect(q[0].detail['count']).toBe(5);
    expect(q[1].name).toBe('prodotto_eliminato');
  });

  it('non raggruppa eventi con dettagli diversi', () => {
    t.track('backup_ripristinato', { origine: 'file' });
    t.track('backup_ripristinato', { origine: 'automatico' });
    expect(t.pending().length).toBe(2);
  });

  it('scarta nomi non validi e dettagli non ammessi (nessun dato sensibile)', () => {
    t.track('Nome Prodotto: Latte');
    t.track('prova', {
      nome: 'Latte intero Parmalat di Mario Rossi, scaffale alto a sinistra',
      email: 'mario.rossi@gmail.com',
      oggetto: { a: 1 } as any,
      'chiave strana!': 1,
    });
    const q = t.pending();
    expect(q.length).toBe(1);
    const d = q[0].detail;
    expect(String(d['nome']).length).toBeLessThanOrEqual(40);
    expect(d['email']).toBe('[email]');
    expect(d['oggetto']).toBeUndefined();
    expect(Object.keys(d)).not.toContain('chiave strana!');
    expect(JSON.stringify(q)).not.toContain('gmail.com');
  });

  it('cattura un errore con messaggio, stack, pagina e ripulisce email e token', () => {
    const e = new Error('Fallito per anna@example.com con token eyJabc.def.ghi');
    t.captureError(e, 'angular');
    const q = t.pending();
    expect(q.length).toBe(1);
    expect(q[0].kind).toBe('error');
    expect(q[0].name).toBe('errore_angular');
    expect(q[0].detail['msg']).toContain('[email]');
    expect(q[0].detail['msg']).toContain('[token]');
    expect(String(q[0].detail['msg'])).not.toContain('anna@');
    expect(typeof q[0].detail['stack']).toBe('string');
    expect(typeof q[0].detail['page']).toBe('string');
  });

  it('deduplica errori identici ravvicinati (solo il conteggio aumenta)', () => {
    for (let i = 0; i < 5; i++) t.captureError(new Error('Boom'), 'window');
    t.captureError(new Error('Altro errore'), 'window');
    const q = t.pending();
    expect(q.length).toBe(2);
    expect(q[0].detail['count']).toBe(5);
  });

  it('descrive errori non Error (stringhe, oggetti Supabase, valori strani)', () => {
    t.captureError('testo semplice', 'promessa');
    t.captureError({ code: '42501', message: 'permission denied' }, 'sync');
    t.captureError(null, 'promessa');
    const msgs = t.pending().map(e => e.detail['msg']);
    expect(msgs).toContain('testo semplice');
    expect(msgs).toContain('42501 permission denied');
    expect(msgs.length).toBe(3);
  });

  it('invia la coda a app_events con la chiave pubblica e la svuota', async () => {
    t.track('app_aperta');
    t.captureError(new Error('x'), 'console');
    await t.flush();
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(environment.supabase.url + '/rest/v1/app_events');
    const h = calls[0].init.headers as Record<string, string>;
    expect(h['apikey']).toBe(environment.supabase.publishableKey);
    expect(h['Prefer']).toBe('return=minimal');
    expect(calls[0].rows.length).toBe(2);
    expect(calls[0].rows[0].user_id).toBeNull();
    expect(Object.keys(calls[0].rows[0]).some(k => k.startsWith('_'))).toBeFalse();
    expect(t.pending().length).toBe(0);
    expect(localStorage.getItem(TELEMETRY_QUEUE_KEY)).toBeNull();
  });

  it('con utente collegato usa il suo token e lascia al server il nome utente', async () => {
    t.setSession({ id: 'u1', email: 'luca@example.org' }, 'tok-1');
    stopTimers(t);
    t.track('login');
    await t.flush();
    const h = calls[0].init.headers as Record<string, string>;
    expect(h['Authorization']).toBe('Bearer tok-1');
    expect(calls[0].rows[0].user_id).toBe('u1');
    expect(calls[0].rows[0].user_label).toBeNull();
  });

  it('se offline o la rete fallisce gli eventi restano in coda e partono dopo', async () => {
    answer = () => Promise.reject(new TypeError('Failed to fetch'));
    t.track('prodotto_aggiunto');
    await t.flush();
    stopTimers(t);
    expect(t.pending().length).toBe(1);

    answer = () => resp(503);
    (t as any).backoffUntil = 0;
    await t.flush();
    stopTimers(t);
    expect(t.pending().length).toBe(1);

    answer = () => resp(201);
    (t as any).backoffUntil = 0;
    await t.flush();
    expect(t.pending().length).toBe(0);
    expect(calls.length).toBe(3);
  });

  it('rispetta l\'attesa tra un tentativo fallito e il successivo', async () => {
    answer = () => resp(500);
    t.track('prodotto_aggiunto');
    await t.flush();
    stopTimers(t);
    await t.flush();
    stopTimers(t);
    expect(calls.length).toBe(1);
  });

  it('la coda sopravvive al riavvio dell\'app', async () => {
    answer = () => resp(500);
    t.track('spesa_aggiunto');
    t.captureError(new Error('prima del riavvio'), 'window');
    await t.flush();
    stopTimers(t);

    const dopo = make();
    expect(dopo.pending().length).toBe(2);
    answer = () => resp(201);
    await dopo.flush();
    stopTimers(dopo);
    expect(dopo.pending().length).toBe(0);
    expect(calls[calls.length - 1].rows.length).toBe(2);
  });

  it('eventi di un utente non più collegato partono senza account, col solo suggerimento del nome', async () => {
    t.setSession({ id: 'u1', email: 'anna@example.org' }, 'tok-1');
    t.track('logout');
    t.setSession(null, null);
    stopTimers(t);
    await t.flush();
    const row = calls[0].rows[0];
    expect(row.user_id).toBeNull();
    expect(row.user_label).toBe('anna');
    expect((calls[0].init.headers as any)['Authorization']).toBe('Bearer ' + environment.supabase.publishableKey);
  });

  it('una riga rifiutata (400) non blocca le altre: si riprova una alla volta', async () => {
    t.track('a_uno');
    t.track('b_due');
    t.track('c_tre');
    let n = 0;
    answer = () => resp(n++ === 0 ? 400 : (n === 3 ? 400 : 201));
    await t.flush();
    expect(t.pending().length).toBe(0);
    expect(calls.length).toBe(4);           // 1 lotto + 3 singole
    expect(calls[1].rows.length).toBe(1);
  });

  it('token scaduto (401): resta in coda e dopo 3 tentativi parte senza account', async () => {
    t.setSession({ id: 'u1', email: 'anna@example.org' }, 'scaduto');
    stopTimers(t);
    t.track('prodotto_aggiunto');
    answer = () => resp(401);
    for (let i = 0; i < 3; i++) {
      (t as any).backoffUntil = 0;
      await t.flush();
      stopTimers(t);
    }
    expect(t.pending()[0].user_id).toBeNull();
    answer = () => resp(201);
    (t as any).backoffUntil = 0;
    await t.flush();
    expect(t.pending().length).toBe(0);
    expect(calls[calls.length - 1].rows[0].user_id).toBeNull();
  });

  it('limita la dimensione della coda tenendo gli errori', () => {
    t.captureError(new Error('errore importante'), 'window');
    for (let i = 0; i < TELEMETRY_LIMITS.maxQueue + 20; i++) {
      (t as any).recentEvents = [];
      t.track('evento_' + i);
    }
    const q = t.pending();
    expect(q.length).toBe(TELEMETRY_LIMITS.maxQueue);
    expect(q.some(e => e.kind === 'error')).toBeTrue();
  });

  it('limita gli eventi al minuto e ne invia il conteggio', async () => {
    for (let i = 0; i < TELEMETRY_LIMITS.eventsPerMinute + 10; i++) t.track('evento_' + i);
    expect(t.pending().length).toBe(TELEMETRY_LIMITS.eventsPerMinute);
    await t.flush();
    const rows: any[] = [];
    calls.forEach(c => rows.push(...c.rows));
    const names = rows.map(r => r.name);
    const lim = rows.find(r => r.name === 'eventi_limitati');
    expect(names).toContain('eventi_limitati');
    expect(lim.detail.count).toBe(10);
  });

  it('senza install() non fa nessuna chiamata di rete', async () => {
    const s = new TelemetryService();
    let used = false;
    s.fetchImpl = () => { used = true; return resp(201); };
    s.track('prodotto_aggiunto');
    await s.flush();
    expect(used).toBeFalse();
    expect(s.pending().length).toBe(1);
  });

  it('flush con attesa massima non blocca oltre il limite', async () => {
    answer = () => new Promise(() => undefined);   // server che non risponde mai
    t.track('logout');
    const start = Date.now();
    await t.flush(200);
    expect(Date.now() - start).toBeLessThan(1500);
    expect(t.pending().length).toBe(1);
  });

  it('riconosce la piattaforma', () => {
    expect(['android', 'ios-app', 'ios-safari', 'web']).toContain(TelemetryService.detectPlatform());
  });

  it('non lancia mai eccezioni, nemmeno con input assurdi', () => {
    const circ: any = {}; circ.self = circ;
    expect(() => t.captureError(circ, '!!!')).not.toThrow();
    expect(() => t.track('x', null as any)).not.toThrow();
    expect(() => t.captureError(undefined)).not.toThrow();
  });
});
