import { Component, OnInit } from '@angular/core';
import { combineLatest, debounceTime } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PreferencesService } from './services/preferences.service';
import { BackupService } from './services/backup.service';
import { ProductService } from './services/product.service';
import { NotificationService } from './services/notification.service';
import { DemoDataService } from './services/demo-data.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  showOnboarding = false;

  constructor(
    private preferencesService: PreferencesService,
    private backupService: BackupService,
    private productService: ProductService,
    private notificationService: NotificationService,
    private demoDataService: DemoDataService,
  ) {}

  async ngOnInit(): Promise<void> {
    // ThemeService si inizializza nel costruttore, qui solo onboarding
    this.showOnboarding = !this.preferencesService.isOnboardingDone();

    await this.setupNotificationChannel();
    await this.backupService.runSilentAutoBackup();

    combineLatest([this.productService.getAll$(), this.preferencesService.get$()])
      .pipe(debounceTime(300))
      .subscribe(([products, prefs]) => {
        this.notificationService.rescheduleAll(products, prefs.expiryAlertDays, prefs.notificationsEnabled);
      });

    if (Capacitor.isNativePlatform()) {
      await SplashScreen.hide();
    }
  }

  onOnboardingDone(): void {
    this.preferencesService.markOnboardingDone();
    this.demoDataService.seedIfEmpty();
    this.showOnboarding = false;
  }

  private async setupNotificationChannel(): Promise<void> {
    if (!this.notificationService.isSupported) return;
    await LocalNotifications.createChannel({
      id: 'expiry-alerts',
      name: 'Avvisi scadenza',
      description: 'Notifiche per i prodotti in scadenza nella dispensa',
      importance: 4,
    });
  }
}
