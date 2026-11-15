import { BackupPayload } from '../models/backup.model';

/** Contenuto condiviso di una dispensa: tutto il backup tranne le preferenze personali. */
export type SharedData = Omit<BackupPayload, 'preferences'>;

export const EMPTY_SHARED: SharedData = {
  products: [],
  shoppingItems: [],
  customCategories: [],
  barcodeCache: {},
  purchaseHistory: {},
};

/** JSON con chiavi ordinate: due oggetti uguali producono sempre la stessa stringa. */
export function stableStringify(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  const obj = value as Record<string, unknown>;
  return '{' + Object.keys(obj).filter(k => obj[k] !== undefined).sort()
    .map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

const same = (a: unknown, b: unknown) => stableStringify(a) === stableStringify(b);

export function normalize(data: Partial<SharedData> | null | undefined): SharedData {
  return {
    products: data?.products ?? [],
    shoppingItems: data?.shoppingItems ?? [],
    customCategories: data?.customCategories ?? [],
    barcodeCache: data?.barcodeCache ?? {},
    purchaseHistory: data?.purchaseHistory ?? {},
  };
}

export function sharedEquals(a: SharedData, b: SharedData): boolean {
  return same(normalize(a), normalize(b));
}

/**
 * Unione a tre vie di una mappa chiave → valore.
 * - cambiato solo da una parte → vince quella parte (anche se è una cancellazione);
 * - cambiato da entrambe → vince `onConflict` (di default la modifica locale);
 * - cancellato da una parte e modificato dall'altra → si tiene la modifica.
 */
function merge3Map<T>(
  base: Map<string, T>,
  local: Map<string, T>,
  remote: Map<string, T>,
  onConflict: (local: T, remote: T) => T = l => l,
): Map<string, T> {
  const out = new Map<string, T>();
  const keys = new Set([...base.keys(), ...local.keys(), ...remote.keys()]);
  for (const k of keys) {
    const b = base.get(k), l = local.get(k), r = remote.get(k);
    const localChanged = !same(b, l), remoteChanged = !same(b, r);
    let v: T | undefined;
    if (!localChanged) v = r;
    else if (!remoteChanged) v = l;
    else if (l === undefined) v = r;          // io ho cancellato, l'altro ha modificato
    else if (r === undefined) v = l;          // l'altro ha cancellato, io ho modificato
    else v = onConflict(l, r);
    if (v !== undefined) out.set(k, v);
  }
  return out;
}

const byId = <T extends { id: string }>(arr: T[]) => new Map(arr.map(x => [x.id, x] as [string, T]));
const byKey = <T>(rec: Record<string, T>) => new Map(Object.entries(rec ?? {}));
const toRecord = <T>(map: Map<string, T>): Record<string, T> => {
  const out: Record<string, T> = {};
  map.forEach((v, k) => (out[k] = v));
  return out;
};

/** Mantiene l'ordine: prima gli elementi nell'ordine remoto, poi i nuovi nell'ordine locale. */
function ordered<T extends { id: string }>(merged: Map<string, T>, remote: T[], local: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const x of [...remote, ...local]) {
    if (merged.has(x.id) && !seen.has(x.id)) { out.push(merged.get(x.id)!); seen.add(x.id); }
  }
  return out;
}

function mergeList<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  return ordered(merge3Map(byId(base), byId(local), byId(remote)), remote, local);
}

/** Unione semplice: tiene tutto, a parità di id vince la versione remota. */
function unionList<T extends { id: string }>(local: T[], remote: T[]): T[] {
  return ordered(merge3Map(new Map(), byId(local), byId(remote), (_l, r) => r), remote, local);
}

/**
 * Unione a tre vie dei dati condivisi.
 * `base` è l'ultima versione sincronizzata da questo dispositivo; con `base = null` (primo collegamento
 * a una dispensa) si fa l'unione semplice: niente viene cancellato, a parità di id vince la versione remota.
 */
export function mergeShared(base: SharedData | null, localIn: SharedData, remoteIn: SharedData): SharedData {
  const local = normalize(localIn), remote = normalize(remoteIn);
  if (!base) {
    return {
      products: unionList(local.products, remote.products),
      shoppingItems: unionList(local.shoppingItems, remote.shoppingItems),
      customCategories: unionList(local.customCategories, remote.customCategories),
      barcodeCache: { ...local.barcodeCache, ...remote.barcodeCache },
      purchaseHistory: toRecord(merge3Map(new Map(), byKey(local.purchaseHistory),
        byKey(remote.purchaseHistory), (l, r) => (l.count >= r.count ? l : r))),
    };
  }
  const b = normalize(base);
  return {
    products: mergeList(b.products, local.products, remote.products),
    shoppingItems: mergeList(b.shoppingItems, local.shoppingItems, remote.shoppingItems),
    customCategories: mergeList(b.customCategories, local.customCategories, remote.customCategories),
    barcodeCache: toRecord(merge3Map(byKey(b.barcodeCache), byKey(local.barcodeCache), byKey(remote.barcodeCache))),
    purchaseHistory: toRecord(merge3Map(byKey(b.purchaseHistory), byKey(local.purchaseHistory),
      byKey(remote.purchaseHistory), (l, r) => (l.count >= r.count ? l : r))),
  };
}

/** Voci della lista della spesa presenti in `after` ma non in `before`. */
export function addedShoppingItems(before: SharedData | null, after: SharedData): { id: string; name: string }[] {
  const prev = new Set((before?.shoppingItems ?? []).map(i => i.id));
  return normalize(after).shoppingItems.filter(i => !prev.has(i.id)).map(i => ({ id: i.id, name: i.name }));
}

/** Prodotti presenti in `after` ma non in `before`. */
export function addedProducts(before: SharedData | null, after: SharedData): { id: string; name: string }[] {
  const prev = new Set((before?.products ?? []).map(p => p.id));
  return normalize(after).products.filter(p => !prev.has(p.id)).map(p => ({ id: p.id, name: p.name }));
}
