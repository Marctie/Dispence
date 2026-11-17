import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { UsageEntry, USAGE_REASON_LABELS } from '../models/usage.model';
import { LOCATION_LABELS } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';

type ReasonFilter = 'all' | 'used' | 'wasted';
type Period = 7 | 30 | 0;

interface DayGroup { label: string; entries: UsageEntry[]; }

@Component({
  selector: 'app-usage-history',
  templateUrl: 'usage-history.page.html',
  styleUrls: ['usage-history.page.scss'],
  standalone: false,
})
export class UsageHistoryPage implements OnInit, OnDestroy {
  entries: UsageEntry[] = [];
  search = '';
  reason: ReasonFilter = 'all';
  period: Period = 30;
  readonly reasonLabels = USAGE_REASON_LABELS;
  readonly locationLabels = LOCATION_LABELS;
  private sub?: Subscription;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit(): void {
    this.sub = this.productService.getUsage$().subscribe(e => (this.entries = e));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /** Voci nel periodo scelto (prima dei filtri su motivo e ricerca): servono per i totali. */
  private get inPeriod(): UsageEntry[] {
    if (!this.period) return this.entries;
    const from = Date.now() - this.period * 86400000;
    return this.entries.filter(e => new Date(e.usedAt).getTime() >= from);
  }

  get filtered(): UsageEntry[] {
    const q = this.search.trim().toLowerCase();
    return this.inPeriod
      .filter(e => this.reason === 'all' || e.reason === this.reason)
      .filter(e => !q || e.name.toLowerCase().includes(q));
  }

  get usedCount(): number   { return this.inPeriod.filter(e => e.reason === 'used').length; }
  get wastedCount(): number { return this.inPeriod.filter(e => e.reason === 'wasted').length; }

  /** Prodotti usati più spesso nel periodo. */
  get topUsed(): { name: string; count: number }[] {
    const map = new Map<string, { name: string; count: number }>();
    for (const e of this.inPeriod) {
      if (e.reason !== 'used') continue;
      const k = e.name.trim().toLowerCase();
      const cur = map.get(k) ?? { name: e.name, count: 0 };
      cur.count++;
      map.set(k, cur);
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }

  get groups(): DayGroup[] {
    const out: DayGroup[] = [];
    for (const e of this.filtered) {
      const label = this.dayLabel(e.usedAt);
      const last = out[out.length - 1];
      if (last?.label === label) last.entries.push(e);
      else out.push({ label, entries: [e] });
    }
    return out;
  }

  emoji(e: UsageEntry): string {
    return this.categoryService.getById(e.category)?.emoji ?? '📦';
  }

  time(e: UsageEntry): string {
    return new Date(e.usedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  }

  private dayLabel(iso: string): string {
    const d = new Date(iso); d.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return 'Oggi';
    if (diff === 1) return 'Ieri';
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  async undo(e: UsageEntry): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Annulla uscita',
      message: `Rimettere ${e.quantity} ${e.unit} di "${e.name}" in dispensa?`,
      buttons: [
        { text: 'No', role: 'cancel' },
        { text: 'Rimetti in dispensa', handler: () => this.productService.undoUsage(e) },
      ],
    });
    await alert.present();
  }

  remove(e: UsageEntry): void {
    this.productService.deleteUsage(e.id);
  }

  async clearAll(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Svuota storico',
      message: 'Vuoi cancellare tutto lo storico dei prodotti usati? I prodotti in dispensa non cambiano.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Svuota', role: 'destructive', handler: () => this.productService.clearUsage() },
      ],
    });
    await alert.present();
  }
}
