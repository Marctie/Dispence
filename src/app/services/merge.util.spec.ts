import { EMPTY_SHARED, SharedData, addedProducts, mergeShared, sharedEquals, stableStringify } from './merge.util';

const p = (id: string, name: string, quantity = 1) => ({
  id, name, quantity, category: 'altro', location: 'pantry', unit: 'pz', expiryDate: null,
  notes: '', addedAt: '2026-01-01T00:00:00.000Z', lowStockThreshold: null, price: null,
});
const data = (...products: ReturnType<typeof p>[]): SharedData => ({ ...EMPTY_SHARED, products });
const names = (d: SharedData) => d.products.map(x => x.name).sort();

describe('mergeShared (unione a tre vie)', () => {
  it('due persone aggiungono prodotti diversi nello stesso momento: restano entrambi', () => {
    const base = data(p('1', 'Pasta'));
    const local = data(p('1', 'Pasta'), p('2', 'Latte'));
    const remote = data(p('1', 'Pasta'), p('3', 'Pane'));
    expect(names(mergeShared(base, local, remote))).toEqual(['Latte', 'Pane', 'Pasta']);
  });

  it('una persona cancella, l’altra non tocca quel prodotto: resta cancellato', () => {
    const base = data(p('1', 'Pasta'), p('2', 'Latte'));
    const local = data(p('1', 'Pasta'));
    const remote = data(p('1', 'Pasta'), p('2', 'Latte'), p('3', 'Pane'));
    expect(names(mergeShared(base, local, remote))).toEqual(['Pane', 'Pasta']);
  });

  it('cancellazione remota di un prodotto che non ho toccato: sparisce anche da me', () => {
    const base = data(p('1', 'Pasta'), p('2', 'Latte'));
    expect(names(mergeShared(base, base, data(p('1', 'Pasta'))))).toEqual(['Pasta']);
  });

  it('modifiche a prodotti diversi vengono tenute entrambe', () => {
    const base = data(p('1', 'Pasta', 1), p('2', 'Latte', 1));
    const local = data(p('1', 'Pasta', 3), p('2', 'Latte', 1));
    const remote = data(p('1', 'Pasta', 1), p('2', 'Latte', 5));
    const m = mergeShared(base, local, remote);
    expect(m.products.find(x => x.id === '1')!.quantity).toBe(3);
    expect(m.products.find(x => x.id === '2')!.quantity).toBe(5);
  });

  it('stesso prodotto modificato da entrambi: vince la modifica locale (la più recente su questo dispositivo)', () => {
    const base = data(p('1', 'Pasta', 1));
    const m = mergeShared(base, data(p('1', 'Pasta', 2)), data(p('1', 'Pasta', 9)));
    expect(m.products[0].quantity).toBe(2);
  });

  it('cancellato da me ma modificato dall’altro: si tiene la modifica (niente perdite)', () => {
    const base = data(p('1', 'Pasta', 1));
    const m = mergeShared(base, data(), data(p('1', 'Pasta', 4)));
    expect(m.products.map(x => x.quantity)).toEqual([4]);
  });

  it('primo collegamento (senza base): unione di tutto, a parità di id vince l’online', () => {
    const m = mergeShared(null, data(p('a', 'Uova'), p('x', 'Locale')), data(p('b', 'Riso'), p('x', 'Online')));
    expect(names(m)).toEqual(['Online', 'Riso', 'Uova']);
  });

  it('storico acquisti: in caso di conflitto tiene il conteggio più alto', () => {
    const base = { ...EMPTY_SHARED, purchaseHistory: { latte: { name: 'Latte', count: 1 } } };
    const local = { ...EMPTY_SHARED, purchaseHistory: { latte: { name: 'Latte', count: 2 } } };
    const remote = { ...EMPTY_SHARED, purchaseHistory: { latte: { name: 'Latte', count: 5 } } };
    expect(mergeShared(base, local, remote).purchaseHistory['latte'].count).toBe(5);
  });

  it('confronto indipendente dall’ordine delle chiavi', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe(stableStringify({ a: { c: 3, d: 2 }, b: 1 }));
    expect(sharedEquals(data(p('1', 'A')), JSON.parse(JSON.stringify(data(p('1', 'A')))))).toBeTrue();
  });

  it('addedProducts trova solo i nuovi', () => {
    expect(addedProducts(data(p('1', 'A')), data(p('1', 'A'), p('2', 'B')))).toEqual([{ id: '2', name: 'B' }]);
  });
});
