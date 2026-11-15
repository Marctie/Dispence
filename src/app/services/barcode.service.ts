import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { BarcodeCacheService } from './barcode-cache.service';
import { TelemetryService } from './telemetry.service';

export interface BarcodeLookupResult {
  barcode: string;
  name: string | null;
  category: string | null;
  unit: string | null;
  fromCache: boolean;
}

@Injectable({ providedIn: 'root' })
export class BarcodeService {
  /** Solo l'esito della scansione, mai il codice letto. */
  private telemetry = inject(TelemetryService);

  constructor(private cache: BarcodeCacheService) {}

  get isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  async ensurePermission(): Promise<boolean> {
    const { camera } = await BarcodeScanner.checkPermissions();
    if (camera === 'granted') return true;
    const result = await BarcodeScanner.requestPermissions();
    return result.camera === 'granted';
  }

  async scanOnce(): Promise<string | null> {
    if (!this.isSupported) return null;
    const granted = await this.ensurePermission();
    if (!granted) {
      this.telemetry.track('scansione_barcode', { esito: 'permesso_negato' });
      throw new Error('Permesso fotocamera negato');
    }

    const { barcodes } = await BarcodeScanner.scan();
    const code = barcodes.length > 0 ? (barcodes[0].rawValue ?? null) : null;
    this.telemetry.track('scansione_barcode', { esito: code ? 'letto' : 'annullato' });
    return code;
  }

  async lookup(barcode: string): Promise<BarcodeLookupResult> {
    const cached = this.cache.lookup(barcode);
    if (cached) {
      return { barcode, name: cached.name, category: cached.category, unit: cached.unit, fromCache: true };
    }

    if (navigator.onLine) {
      try {
        const remote = await this.lookupOpenFoodFacts(barcode);
        if (remote?.name) {
          this.cache.remember({
            barcode,
            name: remote.name,
            category: remote.category,
            unit: remote.unit,
            source: 'openfoodfacts',
            updatedAt: new Date().toISOString(),
          });
          return { barcode, ...remote, fromCache: false };
        }
      } catch {
        // rete non disponibile o risposta non valida: si passa all'inserimento manuale
      }
    }

    return { barcode, name: null, category: null, unit: null, fromCache: false };
  }

  rememberManualEntry(barcode: string, name: string, category: string, unit: string): void {
    this.cache.remember({
      barcode,
      name,
      category,
      unit,
      source: 'manual',
      updatedAt: new Date().toISOString(),
    });
  }

  private async lookupOpenFoodFacts(
    barcode: string
  ): Promise<{ name: string | null; category: string | null; unit: string | null } | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
        { signal: controller.signal }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status !== 1 || !data.product) return null;
      const p = data.product;
      return {
        name: p.product_name || p.generic_name || null,
        category: null,
        unit: p.quantity || null,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
