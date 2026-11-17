import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Recipe } from '../models/recipe.model';
import { ProductService } from './product.service';
import { StorageService } from './storage.service';
import { TelemetryService } from './telemetry.service';
import { RECIPES_DATASET } from '../data/recipes.data';
import { decodeSharedRecipe } from '../shared/recipe-share.util';

export interface RecipeWithScore extends Recipe {
  matchScore: number;
  matchedCount: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly CUSTOM_KEY = 'dispensa_custom_recipes';
  private telemetry = inject(TelemetryService);
  private custom$ = new BehaviorSubject<Recipe[]>([]);
  private readonly HIDDEN_KEY = 'dispensa_hidden_recipes';
  /** Ricette incluse nell'app che l'utente ha rimosso: id → data di rimozione. */
  private hidden: Record<string, string> = {};
  /** Ricetta ricevuta tramite link, in attesa di conferma nella pagina Ricette. */
  pendingImport: Omit<Recipe, 'id' | 'custom' | 'createdAt'> | null = null;

  constructor(private productService: ProductService, private storage: StorageService) {
    this.custom$.next(this.storage.get<Recipe[]>(this.CUSTOM_KEY) ?? []);
    this.hidden = this.storage.get<Record<string, string>>(this.HIDDEN_KEY) ?? {};
  }

  /** Ricette dell'utente in testa, poi quelle incluse nell'app. */
  get all(): Recipe[] {
    return [...this.custom$.value, ...RECIPES_DATASET.filter(r => !this.hidden[r.id])];
  }

  // ── Ricette incluse rimosse dall'utente ───────────────────────────────────

  hideBuiltin(id: string): void {
    this.hidden = { ...this.hidden, [id]: new Date().toISOString() };
    this.storage.set(this.HIDDEN_KEY, this.hidden);
    this.custom$.next(this.custom$.value); // aggiorna chi ascolta
    this.telemetry.track('ricetta_nascosta');
  }

  get hiddenCount(): number {
    return RECIPES_DATASET.filter(r => this.hidden[r.id]).length;
  }

  restoreHidden(): void {
    this.replaceHidden({});
  }

  getHidden(): Record<string, string> {
    return this.hidden;
  }

  replaceHidden(hidden: Record<string, string>): void {
    this.hidden = hidden;
    this.storage.set(this.HIDDEN_KEY, hidden);
    this.custom$.next(this.custom$.value);
  }

  // ── Ricette ricevute da altri ─────────────────────────────────────────────

  /** Legge una ricetta da un link o da un messaggio incollato; null se non ne contiene. */
  parseShared(text: string): Omit<Recipe, 'id' | 'custom' | 'createdAt'> | null {
    return decodeSharedRecipe(text);
  }

  /** Salva una ricetta ricevuta tra le proprie, evitando nomi doppi. */
  importShared(data: Omit<Recipe, 'id' | 'custom' | 'createdAt'>): Recipe {
    const names = new Set(this.all.map(r => r.name.trim().toLowerCase()));
    let name = data.name.trim();
    for (let n = 2; names.has(name.toLowerCase()); n++) name = `${data.name.trim()} (${n})`;
    this.telemetry.track('ricetta_importata');
    return this.addCustom({ ...data, name });
  }

  // ── Ricette personali ─────────────────────────────────────────────────────

  getCustom$(): Observable<Recipe[]> {
    return this.custom$.asObservable();
  }

  getCustom(): Recipe[] {
    return this.custom$.value;
  }

  replaceCustom(recipes: Recipe[]): void {
    this.saveCustom(recipes);
  }

  addCustom(data: Omit<Recipe, 'id' | 'custom' | 'createdAt'>): Recipe {
    const recipe: Recipe = {
      ...data,
      id: 'custom-' + (typeof crypto?.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      custom: true,
      createdAt: new Date().toISOString(),
    };
    this.saveCustom([recipe, ...this.custom$.value]);
    this.telemetry.track('ricetta_creata');
    return recipe;
  }

  updateCustom(id: string, changes: Partial<Recipe>): void {
    this.saveCustom(this.custom$.value.map(r => (r.id === id ? { ...r, ...changes, id, custom: true } : r)));
  }

  deleteCustom(id: string): void {
    this.saveCustom(this.custom$.value.filter(r => r.id !== id));
    this.telemetry.track('ricetta_eliminata');
  }

  private saveCustom(recipes: Recipe[]): void {
    this.custom$.next(recipes);
    this.storage.set(this.CUSTOM_KEY, recipes);
  }

  // ── Punteggio in base alla dispensa ───────────────────────────────────────

  getWithScores(): RecipeWithScore[] {
    const products = this.productService.getAll();
    const names = products.map(p => p.name.toLowerCase().trim()).filter(Boolean);

    return this.all.map(recipe => {
      const matched: string[] = [];
      const missing: string[] = [];

      for (const ing of recipe.ingredients) {
        const ingLower = ing.toLowerCase();
        const found = names.some(n => n.includes(ingLower) || ingLower.includes(n));
        (found ? matched : missing).push(ing);
      }

      return {
        ...recipe,
        matchScore: recipe.ingredients.length ? matched.length / recipe.ingredients.length : 0,
        matchedCount: matched.length,
        matchedIngredients: matched,
        missingIngredients: missing,
      };
    });
  }

  getSorted(): RecipeWithScore[] {
    return this.getWithScores().sort((a, b) => b.matchScore - a.matchScore);
  }

  getAvailable(): RecipeWithScore[] {
    return this.getWithScores()
      .filter(r => r.matchScore >= 0.7)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  getAlmostReady(): RecipeWithScore[] {
    return this.getWithScores()
      .filter(r => r.matchScore >= 0.4 && r.matchScore < 0.7)
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  getAntiWaste(): RecipeWithScore[] {
    const expiring = this.productService.getExpiringWithinDays(7).map(p => p.name.toLowerCase());
    return this.getWithScores()
      .filter(r => r.matchedIngredients.some(ing => {
        const i = ing.toLowerCase();
        return expiring.some(e => e.includes(i) || i.includes(e));
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }
}
