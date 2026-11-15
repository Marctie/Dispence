import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { SyncService } from './sync.service';
import { AuthService } from './auth.service';
import { ProductService } from './product.service';
import { BackupPayload } from '../models/backup.model';

/** Finto Supabase: una tabella "pantries" in memoria, filtrata per user_id come farebbe RLS. */
class FakeSupabase {
  rows = new Map<string, { data: BackupPayload; updated_at: string }>();
  upserts = 0;

  from(_table: string) {
    let userId = '';
    const query = {
      select: () => query,
      eq: (_col: string, value: string) => { userId = value; return query; },
      maybeSingle: async () => ({ data: this.rows.get(userId) ?? null, error: null }),
      upsert: async (row: { user_id: string; data: BackupPayload; updated_at: string }) => {
        this.upserts++;
        // come Postgres: timestamptz torna con "+00:00" invece di "Z"
        this.rows.set(row.user_id, {
          data: JSON.parse(JSON.stringify(row.data)),
          updated_at: row.updated_at.replace('Z', '+00:00'),
        });
        return { error: null };
      },
    };
    return query;
  }
}

const product = (id: string, name: string) => ({
  id, name, category: 'altro', location: 'pantry', quantity: 1, unit: 'pz',
  expiryDate: null, notes: '', addedAt: '2026-01-01T00:00:00.000Z', lowStockThreshold: null, price: null,
});

describe('SyncService', () => {
  let fake: FakeSupabase;
  let products: ProductService;

  function makeService(): SyncService {
    return TestBed.inject(SyncService);
  }

  beforeEach(() => {
    localStorage.clear();
    fake = new FakeSupabase();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { supabase: fake } }],
    });
    products = TestBed.inject(ProductService);
  });

  it('al primo accesso carica nell’account i dati già presenti sul telefono', async () => {
    products.replaceAll([product('a', 'Latte')]);
    await makeService().start('user-1');

    expect(fake.rows.get('user-1')!.data.products.map(p => p.name)).toEqual(['Latte']);
  });

  it('scarica la dispensa dell’account su un dispositivo vuoto', async () => {
    fake.rows.set('user-1', {
      data: { products: [product('a', 'Pasta')], shoppingItems: [], customCategories: [],
        preferences: undefined as any, barcodeCache: {}, purchaseHistory: {} },
      updated_at: '2026-11-15T10:00:00.000+00:00',
    });
    await makeService().start('user-1');

    expect(products.getAll().map(p => p.name)).toEqual(['Pasta']);
    expect(fake.upserts).toBe(0);
  });

  it('unisce dati locali e online al primo accesso senza perdere nulla', async () => {
    products.replaceAll([product('local', 'Uova')]);
    fake.rows.set('user-1', {
      data: { products: [product('remote', 'Riso')], shoppingItems: [], customCategories: [],
        preferences: undefined as any, barcodeCache: {}, purchaseHistory: {} },
      updated_at: '2026-11-15T10:00:00.000+00:00',
    });
    await makeService().start('user-1');

    const names = products.getAll().map(p => p.name).sort();
    expect(names).toEqual(['Riso', 'Uova']);
    expect(fake.rows.get('user-1')!.data.products.length).toBe(2);
  });

  it('non porta i dati di un altro account nel nuovo account', async () => {
    localStorage.setItem('dispensa_sync_owner', JSON.stringify('user-A'));
    products.replaceAll([product('x', 'Dati di A')]);

    await makeService().start('user-B');

    expect(products.getAll()).toEqual([]);
    expect(fake.rows.has('user-B')).toBeFalse();
  });

  it('invia online le modifiche fatte dopo l’accesso', fakeAsync(() => {
    const sync = makeService();
    sync.start('user-1');
    flushMicrotasks();

    products.replaceAll([product('b', 'Pane')]);
    tick(1600);
    flushMicrotasks();

    expect(fake.rows.get('user-1')!.data.products.map(p => p.name)).toEqual(['Pane']);
    expect(sync.status$.value).toBe('synced');
    sync.stop();
  }));

  it('non riscarica i dati se online non è cambiato nulla (formato data +00:00)', async () => {
    const sync = makeService();
    products.replaceAll([product('a', 'Latte')]);
    await sync.start('user-1');

    // modifica locale non ancora inviata: un pull non deve sovrascriverla con la versione vecchia
    products.replaceAll([product('a', 'Latte'), product('c', 'Caffè')]);
    await sync.pull();

    expect(products.getAll().length).toBe(2);
    sync.stop();
  });
});
