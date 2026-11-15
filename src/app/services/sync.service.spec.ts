import { TestBed } from '@angular/core/testing';
import { SyncService } from './sync.service';
import { AuthService } from './auth.service';
import { ProductService } from './product.service';
import { PreferencesService } from './preferences.service';
import { ShoppingService } from './shopping.service';

const OTHER = 'user-other';
const item = (id: string, name: string) => ({
  id, name, quantity: 1, unit: 'pz', category: 'altro', checked: false, linkedProductId: null,
  addedAt: '2026-01-01T00:00:00.000Z',
});
const prod = (id: string, name: string) => ({
  id, name, category: 'altro', location: 'pantry', quantity: 1, unit: 'pz',
  expiryDate: null, notes: '', addedAt: '2026-01-01T00:00:00.000Z', lowStockThreshold: null, price: null,
});

/** Finto Supabase: dispense con versione, membri, preferenze e funzioni, come nello schema reale. */
class FakeDb {
  pantries = new Map<string, { data: any; version: number; updated_by: string | null; invite_code: string }>();
  members: { pantry_id: string; user_id: string; display_name: string; role: string; joined_at: number }[] = [];
  settings = new Map<string, any>();
  invoked: { name: string; body: any }[] = [];
  /** Eseguito una volta subito prima di un salvataggio: simula un altro utente che salva nel frattempo. */
  beforeUpdate: (() => void) | null = null;
  private n = 0;

  createPantry(owner: string, data: any = {}): string {
    const id = 'p' + ++this.n;
    this.pantries.set(id, { data, version: 0, updated_by: null, invite_code: 'CODE' + this.n });
    this.members.push({ pantry_id: id, user_id: owner, display_name: owner, role: 'owner', joined_at: this.n });
    return id;
  }

  /** Un altro membro salva la dispensa. */
  otherSaves(pantryId: string, change: (data: any) => any): void {
    const row = this.pantries.get(pantryId)!;
    row.data = change(JSON.parse(JSON.stringify(row.data)));
    row.version++;
    row.updated_by = OTHER;
  }

  client(me: string) {
    const db = this;
    const memberOf = () => db.members.find(m => m.user_id === me)?.pantry_id;
    return {
      rpc: async (fn: string, args: any) => {
        if (fn === 'my_pantry') {
          const pid = memberOf() ?? db.createPantry(me);
          const m = db.members.find(x => x.user_id === me)!;
          return { data: [{ pantry_id: pid, invite_code: db.pantries.get(pid)!.invite_code, role: m.role }], error: null };
        }
        if (fn === 'join_pantry') {
          const target = [...db.pantries.entries()].find(([, p]) => p.invite_code === args.p_code)?.[0];
          if (!target) return { data: null, error: { message: 'invalid_invite_code' } };
          db.members = db.members.filter(m => m.user_id !== me);
          db.members.push({ pantry_id: target, user_id: me, display_name: me, role: 'member', joined_at: ++db.n });
          return { data: target, error: null };
        }
        return { data: null, error: { message: 'unknown' } };
      },
      from: (table: string) => {
        const filters: Record<string, any> = {};
        let updateValues: any = null;
        const q: any = {
          select: () => q,
          order: async () => ({
            data: db.members.filter(m => m.pantry_id === filters['pantry_id'] && memberOf() === m.pantry_id)
              .sort((a, b) => a.joined_at - b.joined_at),
            error: null,
          }),
          eq: (col: string, v: any) => {
            filters[col] = v;
            if (updateValues && 'version' in filters) {
              const row = db.pantries.get(filters['id']);
              if (db.beforeUpdate) { const f = db.beforeUpdate; db.beforeUpdate = null; f(); }
              if (!row || memberOf() !== filters['id'] || row.version !== filters['version']) {
                return { select: async () => ({ data: [], error: null }) };
              }
              row.data = JSON.parse(JSON.stringify(updateValues.data));
              row.version = updateValues.version;
              row.updated_by = me;
              return { select: async () => ({ data: [{ version: row.version }], error: null }) };
            }
            return q;
          },
          maybeSingle: async () => {
            if (table === 'pantries') {
              const row = db.pantries.get(filters['id']);
              const visible = row && memberOf() === filters['id'];
              return { data: visible ? JSON.parse(JSON.stringify(row)) : null, error: null };
            }
            if (table === 'user_settings') return { data: db.settings.get(me) ?? null, error: null };
            return { data: null, error: null };
          },
          update: (values: any) => { updateValues = values; return q; },
          upsert: async (row: any) => { db.settings.set(me, row); return { error: null }; },
        };
        return q;
      },
      channel: (name: string) => {
        const ch: any = { topic: 'realtime:' + name, on: () => ch, subscribe: () => ch };
        return ch;
      },
      removeChannel: () => undefined,
      functions: { invoke: async (name: string, opts: any) => { db.invoked.push({ name, body: opts.body }); return { error: null }; } },
    };
  }
}

describe('SyncService (dispensa condivisa)', () => {
  let db: FakeDb;
  let products: ProductService;

  function setup(me = 'user-me'): SyncService {
    TestBed.configureTestingModule({
      providers: [{
        provide: AuthService,
        useValue: { supabase: db.client(me), displayName: me, user: { id: me } },
      }],
    });
    products = TestBed.inject(ProductService);
    return TestBed.inject(SyncService);
  }

  beforeEach(() => {
    localStorage.clear();
    db = new FakeDb();
  });

  it('al primo accesso crea la dispensa e ci carica i prodotti già presenti sul telefono', async () => {
    const sync = setup();
    products.replaceAll([prod('a', 'Latte')]);
    await sync.start('user-me');

    const [pantry] = [...db.pantries.values()];
    expect(pantry.data.products.map((p: any) => p.name)).toEqual(['Latte']);
    expect(pantry.version).toBe(1);
    expect(sync.status$.value).toBe('synced');
    sync.stop();
  });

  it('le preferenze personali NON finiscono nella dispensa condivisa, ma nel proprio profilo', async () => {
    const sync = setup();
    TestBed.inject(PreferencesService).update({ notifyTime: '07:30' });
    products.replaceAll([prod('a', 'Latte')]);
    await sync.start('user-me');

    expect([...db.pantries.values()][0].data.preferences).toBeUndefined();
    expect(db.settings.get('user-me').prefs.notifyTime).toBe('07:30');
    sync.stop();
  });

  it('entrando con un codice, i propri prodotti si uniscono a quelli condivisi', async () => {
    const shared = db.createPantry(OTHER, { products: [prod('s1', 'Pane')] });
    const sync = setup();
    products.replaceAll([prod('m1', 'Uova')]);
    await sync.start('user-me');

    await sync.joinPantry(db.pantries.get(shared)!.invite_code);

    expect(products.getAll().map(p => p.name).sort()).toEqual(['Pane', 'Uova']);
    expect(db.pantries.get(shared)!.data.products.map((p: any) => p.name).sort()).toEqual(['Pane', 'Uova']);
    expect(sync.members$.value.length).toBe(2);
    sync.stop();
  });

  it('se un altro salva nel mezzo del mio salvataggio, non si perde nessuna delle due modifiche', async () => {
    const shared = db.createPantry(OTHER, { products: [prod('s1', 'Pane')] });
    const sync = setup();
    await sync.start('user-me');
    await sync.joinPantry(db.pantries.get(shared)!.invite_code);

    // io aggiungo il latte; nello stesso istante l'altro aggiunge il caffè
    db.beforeUpdate = () => db.otherSaves(shared, d => ({ ...d, products: [...d.products, prod('o1', 'Caffè')] }));
    products.replaceAll([...products.getAll(), prod('m2', 'Latte')]);
    await sync.sync();

    const online = db.pantries.get(shared)!.data.products.map((p: any) => p.name).sort();
    expect(online).toEqual(['Caffè', 'Latte', 'Pane']);
    expect(products.getAll().map(p => p.name).sort()).toEqual(['Caffè', 'Latte', 'Pane']);
    sync.stop();
  });

  it('ricevo le aggiunte degli altri e vengo avvisato di chi le ha fatte', async () => {
    const shared = db.createPantry(OTHER, { products: [] });
    const sync = setup();
    await sync.start('user-me');
    await sync.joinPantry(db.pantries.get(shared)!.invite_code);

    const seen: any[] = [];
    sync.remoteAdditions$.subscribe(a => seen.push(a));
    db.otherSaves(shared, d => ({ ...d, products: [prod('o2', 'Mele')] }));
    await sync.sync();

    expect(products.getAll().map(p => p.name)).toEqual(['Mele']);
    expect(seen).toEqual([{ by: OTHER, names: ['Mele'], shopping: [] }]);
    sync.stop();
  });

  it('le mie aggiunte avvisano gli altri membri tramite il server', async () => {
    const shared = db.createPantry(OTHER, { products: [] });
    const sync = setup();
    await sync.start('user-me');
    await sync.joinPantry(db.pantries.get(shared)!.invite_code);
    db.invoked = [];

    products.replaceAll([prod('m3', 'Burro')]);
    await sync.sync();

    expect(db.invoked).toEqual([{ name: 'notify-additions', body: { names: ['Burro'], shopping: [] } }]);
    sync.stop();
  });

  it('lista della spesa condivisa: le voci aggiunte da un altro arrivano e vengo avvisato', async () => {
    const shared = db.createPantry(OTHER, { products: [], shoppingItems: [] });
    const sync = setup();
    await sync.start('user-me');
    await sync.joinPantry(db.pantries.get(shared)!.invite_code);

    const seen: any[] = [];
    sync.remoteAdditions$.subscribe(a => seen.push(a));
    db.otherSaves(shared, d => ({ ...d, shoppingItems: [item('s1', 'Latte')] }));
    await sync.sync();

    expect(TestBed.inject(ShoppingService).getAll().map(i => i.name)).toEqual(['Latte']);
    expect(seen).toEqual([{ by: OTHER, names: [], shopping: ['Latte'] }]);
    sync.stop();
  });

  it('lista della spesa condivisa: io spunto una voce mentre l’altro ne aggiunge un’altra, restano entrambe le modifiche', async () => {
    const shared = db.createPantry(OTHER, { products: [], shoppingItems: [item('s1', 'Pane')] });
    const sync = setup();
    await sync.start('user-me');
    await sync.joinPantry(db.pantries.get(shared)!.invite_code);
    const shopping = TestBed.inject(ShoppingService);
    db.invoked = [];

    db.beforeUpdate = () => db.otherSaves(shared, d => ({ ...d, shoppingItems: [...d.shoppingItems, item('s2', 'Uova')] }));
    shopping.toggle('s1');
    shopping.add({ name: 'Caffè', quantity: 1, unit: 'pz', category: 'altro', checked: false, linkedProductId: null } as any);
    await sync.sync();

    const online = db.pantries.get(shared)!.data.shoppingItems;
    expect(online.map((i: any) => i.name).sort()).toEqual(['Caffè', 'Pane', 'Uova']);
    expect(online.find((i: any) => i.id === 's1').checked).toBeTrue();
    expect(shopping.getAll().map(i => i.name).sort()).toEqual(['Caffè', 'Pane', 'Uova']);
    expect(db.invoked[0].body.shopping).toEqual(['Caffè']);
    sync.stop();
  });

  it('una cancellazione fatta da un altro arriva anche a me', async () => {
    const shared = db.createPantry(OTHER, { products: [prod('s1', 'Pane'), prod('s2', 'Olio')] });
    const sync = setup();
    await sync.start('user-me');
    await sync.joinPantry(db.pantries.get(shared)!.invite_code);

    db.otherSaves(shared, d => ({ ...d, products: d.products.filter((p: any) => p.id !== 's2') }));
    await sync.sync();

    expect(products.getAll().map(p => p.name)).toEqual(['Pane']);
    sync.stop();
  });

  it('i dati di un altro account rimasti sul telefono non finiscono nel nuovo account', async () => {
    localStorage.setItem('dispensa_sync_owner', JSON.stringify('user-A'));
    localStorage.setItem('dispensa_products', JSON.stringify([prod('x', 'Dati di A')]));
    const sync = setup('user-B');
    await sync.start('user-B');

    expect(products.getAll()).toEqual([]);
    const [pantry] = [...db.pantries.values()];
    expect(pantry.data.products ?? []).toEqual([]);
    sync.stop();
  });
});
