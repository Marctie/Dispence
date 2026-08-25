import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Category, DEFAULT_CATEGORIES } from '../models/category.model';
import { StorageService } from './storage.service';

const CUSTOM_CATEGORIES_KEY = 'dispensa_custom_categories';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private customCategories$ = new BehaviorSubject<Category[]>([]);
  private all$ = new BehaviorSubject<Category[]>(DEFAULT_CATEGORIES);

  constructor(private storage: StorageService) {
    const saved = this.storage.get<Category[]>(CUSTOM_CATEGORIES_KEY) ?? [];
    this.customCategories$.next(saved);
    this.all$.next([...DEFAULT_CATEGORIES, ...saved]);
  }

  getAll$(): Observable<Category[]> { return this.all$.asObservable(); }
  getAll(): Category[] { return this.all$.value; }

  getById(id: string): Category | undefined {
    return this.all$.value.find(c => c.id === id);
  }

  add(name: string, emoji: string, color: string): Category {
    const id = this.slugify(name);
    if (this.getById(id)) throw new Error('Esiste già una categoria con questo nome');
    const category: Category = { id, name, emoji, color, custom: true };
    const next = [...this.customCategories$.value, category];
    this.persist(next);
    return category;
  }

  update(id: string, changes: Partial<Pick<Category, 'name' | 'emoji' | 'color'>>): void {
    const existing = this.customCategories$.value.find(c => c.id === id);
    if (!existing) throw new Error('Solo le categorie personalizzate possono essere modificate');
    const next = this.customCategories$.value.map(c => c.id === id ? { ...c, ...changes } : c);
    this.persist(next);
  }

  delete(id: string): void {
    const existing = this.customCategories$.value.find(c => c.id === id);
    if (!existing) throw new Error('Solo le categorie personalizzate possono essere eliminate');
    const next = this.customCategories$.value.filter(c => c.id !== id);
    this.persist(next);
  }

  isCustom(id: string): boolean {
    return this.customCategories$.value.some(c => c.id === id);
  }

  replaceCustom(categories: Category[]): void {
    this.persist(categories);
  }

  getCustom(): Category[] {
    return this.customCategories$.value;
  }

  private persist(next: Category[]): void {
    this.customCategories$.next(next);
    this.storage.set(CUSTOM_CATEGORIES_KEY, next);
    this.all$.next([...DEFAULT_CATEGORIES, ...next]);
  }

  private slugify(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;
  }
}
