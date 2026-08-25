import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { UserPreferences } from '../models/user-preferences.model';

type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'dispensa_theme';
  private mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  currentTheme$ = new BehaviorSubject<ThemeMode>('system');

  constructor() {
    const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeMode | null;
    this.apply(saved || 'system');
    this.mediaQuery.addEventListener('change', () => {
      if (this.currentTheme$.value === 'system') this.apply('system');
    });
  }

  setTheme(mode: ThemeMode): void {
    localStorage.setItem(this.STORAGE_KEY, mode);
    this.apply(mode);
  }

  private apply(mode: ThemeMode): void {
    this.currentTheme$.next(mode);
    const isDark = mode === 'dark' || (mode === 'system' && this.mediaQuery.matches);
    document.documentElement.classList.toggle('ion-palette-dark', isDark);
  }
}
