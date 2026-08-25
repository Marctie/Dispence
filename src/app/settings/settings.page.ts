import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ThemeService } from '../services/theme.service';
import { PreferencesService } from '../services/preferences.service';
import { StatsService, CategoryStat, LocationStat, ExpiryBucket } from '../services/stats.service';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit, OnDestroy {
  currentTheme: 'light' | 'dark' | 'system' = 'system';
  alertDays = 7;

  // stats
  totalProducts = 0;
  totalExpired = 0;
  totalExpiring = 0;
  totalLowStock = 0;
  byCategory: CategoryStat[] = [];
  byLocation: LocationStat[] = [];
  expiryBuckets: ExpiryBucket[] = [];

  private sub!: Subscription;

  constructor(
    private themeService: ThemeService,
    private preferencesService: PreferencesService,
    private statsService: StatsService,
  ) {}

  ngOnInit(): void {
    this.sub = this.themeService.currentTheme$.subscribe(t => (this.currentTheme = t));
    this.alertDays = this.preferencesService.get().expiryAlertDays;
    this.loadStats();
  }

  ionViewWillEnter(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onThemeChange(event: CustomEvent): void {
    this.themeService.setTheme(event.detail.value);
    this.preferencesService.update({ theme: event.detail.value });
  }

  onAlertDaysChange(event: CustomEvent): void {
    this.alertDays = event.detail.value;
    this.preferencesService.update({ expiryAlertDays: this.alertDays });
  }

  private loadStats(): void {
    this.totalProducts  = this.statsService.totalProducts();
    this.totalExpired   = this.statsService.totalExpired();
    this.totalExpiring  = this.statsService.totalExpiring();
    this.totalLowStock  = this.statsService.totalLowStock();
    this.byCategory     = this.statsService.byCategory().slice(0, 5);
    this.byLocation     = this.statsService.byLocation();
    this.expiryBuckets  = this.statsService.expiryDistribution();
  }

  maxCategory(): number {
    return this.byCategory.reduce((m, c) => Math.max(m, c.count), 1);
  }

  maxLocation(): number {
    return this.byLocation.reduce((m, l) => Math.max(m, l.count), 1);
  }
}
