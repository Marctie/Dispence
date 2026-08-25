import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { UserPreferences, DEFAULT_PREFERENCES } from '../models/user-preferences.model';
import { StorageService } from './storage.service';

const PREFS_KEY = 'dispensa_preferences';
const ONBOARDING_KEY = 'dispensa_onboarding_done';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private prefs$ = new BehaviorSubject<UserPreferences>(DEFAULT_PREFERENCES);

  constructor(private storage: StorageService) {
    const saved = this.storage.get<UserPreferences>(PREFS_KEY);
    if (saved) this.prefs$.next({ ...DEFAULT_PREFERENCES, ...saved });
  }

  get$(): Observable<UserPreferences> { return this.prefs$.asObservable(); }
  get(): UserPreferences { return this.prefs$.value; }

  update(changes: Partial<UserPreferences>): void {
    const next = { ...this.prefs$.value, ...changes };
    this.prefs$.next(next);
    this.storage.set(PREFS_KEY, next);
  }

  isOnboardingDone(): boolean {
    return this.storage.get<boolean>(ONBOARDING_KEY) === true;
  }

  markOnboardingDone(): void {
    this.storage.set(ONBOARDING_KEY, true);
  }
}
