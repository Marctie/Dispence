import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StorageService {
  /** Emette la chiave ogni volta che un dato viene scritto o rimosso (usato dalla sincronizzazione). */
  readonly changes$ = new Subject<string>();

  get<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; }
    catch { return null; }
  }

  set(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
    this.changes$.next(key);
  }

  remove(key: string): void {
    localStorage.removeItem(key);
    this.changes$.next(key);
  }
}
