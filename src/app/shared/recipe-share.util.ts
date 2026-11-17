import { Recipe } from '../models/recipe.model';

/** Prefisso del codice ricetta dentro i messaggi condivisi. */
export const RECIPE_CODE_PREFIX = 'DISPENSINA-RICETTA:';
/** Parametro (nel frammento #) dei link di condivisione: non viene inviato al server. */
export const RECIPE_LINK_PARAM = 'ricetta';

type SharedRecipe = Omit<Recipe, 'id' | 'custom' | 'createdAt'>;

/** Forma compatta per tenere corti link e codici. */
interface Packed { v: 1; n: string; e?: string; d?: string; df?: string; t?: number; s?: number; i: string[]; st?: string[]; }

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}

export function encodeRecipe(r: Recipe): string {
  const p: Packed = {
    v: 1, n: r.name, e: r.emoji, d: r.description || undefined, df: r.difficulty, t: r.time,
    s: r.servings, i: r.ingredients, st: r.steps?.length ? r.steps : undefined,
  };
  return toBase64Url(JSON.stringify(p));
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Cerca un codice ricetta in un link o in un messaggio e lo valida. */
export function decodeSharedRecipe(text: string): SharedRecipe | null {
  const m = text.match(/(?:DISPENSINA-RICETTA:|[#?&]ricetta=)([A-Za-z0-9_-]{8,})/);
  if (!m) return null;
  try {
    const p = JSON.parse(fromBase64Url(m[1])) as Partial<Packed>;
    const ingredients = (Array.isArray(p.i) ? p.i : []).map(x => str(x, 120)).filter(Boolean).slice(0, 60);
    const name = str(p.n, 80);
    if (!name || !ingredients.length) return null;
    const difficulty = (['easy', 'medium', 'hard'] as const).find(d => d === p.df) ?? 'easy';
    return {
      name,
      emoji: str(p.e, 8) || '🍽️',
      description: str(p.d, 240),
      difficulty,
      time: Math.min(1440, Math.max(1, Math.round(Number(p.t) || 20))),
      servings: p.s ? Math.min(99, Math.max(1, Math.round(Number(p.s)))) : undefined,
      ingredients,
      steps: (Array.isArray(p.st) ? p.st : []).map(x => str(x, 1000)).filter(Boolean).slice(0, 40),
    };
  } catch {
    return null;
  }
}

/** Messaggio leggibile da chiunque, con link per aprirla nell'app e codice da incollare. */
export function buildShareMessage(r: Recipe, webUrl: string): string {
  const code = encodeRecipe(r);
  const lines = [`${r.emoji ?? '🍽️'} ${r.name}`];
  if (r.description) lines.push(r.description);
  const meta = [`⏱ ${r.time} min`, r.servings ? `👥 ${r.servings} porzioni` : ''].filter(Boolean).join(' · ');
  lines.push(meta, '', 'Cosa serve:', ...r.ingredients.map(i => `• ${i}`));
  if (r.steps?.length) lines.push('', 'Preparazione:', ...r.steps.map((s, n) => `${n + 1}. ${s}`));
  lines.push(
    '',
    'Per salvarla in Dispensina Digitale apri il link oppure, nell\'app, vai in Ricette → Importa e incolla questo messaggio:',
    `${webUrl}#${RECIPE_LINK_PARAM}=${code}`,
    '',
    RECIPE_CODE_PREFIX + code,
  );
  return lines.join('\n');
}
