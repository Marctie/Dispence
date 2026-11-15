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
import { AuthService } from './services/auth.service';
import { SyncService } from './services/sync.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  showOnboarding = false;
  /** Versione web con account: schermata di accesso finché non c'è un utente. */
  showAuth = false;
  passwordRecovery = false;

  constructor(
    private preferencesService: PreferencesService,
    private backupService: BackupService,
    private productService: ProductService,
    private notificationService: NotificationService,
    private demoDataService: DemoDataService,
    private authService: AuthService,
    private syncService: SyncService,
  ) {}

  async ngOnInit(): Promise<void> {
    // ThemeService si inizializza nel costruttore, qui solo onboarding
    this.showOnboarding = !this.preferencesService.isOnboardingDone();

    if (this.authService.enabled) {
      try {
        await this.setupAccount();
      } catch (e) {
        console.error('Inizializzazione account non riuscita', e);
        this.showAuth = true;
      }
    }

    try {
      await this.setupNotificationChannel();
    } catch (e) {
      console.error('Impossibile creare il canale di notifica', e);
    }
    try {
      await this.backupService.runSilentAutoBackup();
    } catch (e) {
      console.error('Backup automatico silenzioso non riuscito', e);
    }

    combineLatest([this.productService.getAll$(), this.preferencesService.get$()])
      .pipe(debounceTime(300))
      .subscribe(([products, prefs]) => {
        this.notificationService.rescheduleAll(products, prefs.expiryAlertDays, prefs.notificationsEnabled);
      });

    if (Capacitor.isNativePlatform()) {
      await SplashScreen.hide();
    } else {
      // PWA: ricontrolla le scadenze ogni volta che l'app torna in primo piano
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.notificationService.checkWeb();
        }
      });
    }
  }

  onOnboardingDone(): void {
    try {
      this.preferencesService.markOnboardingDone();
    } catch (e) {
      console.error('Impossibile salvare il completamento onboarding', e);
    }
    try {
      this.demoDataService.seedIfEmpty();
    } catch (e) {
      console.error('Impossibile precaricare i dati di esempio', e);
    }
    this.showOnboarding = false;
  }

  async onAuthDone(): Promise<void> {
    this.passwordRecovery = false;
    const user = this.authService.user;
    if (!user) return;
    this.showAuth = false;
    try {
      await this.syncService.start(user.id);
    } catch (e) {
      console.error('Sincronizzazione iniziale non riuscita', e);
    }
  }

  private async setupAccount(): Promise<void> {
    const user = await this.authService.init();
    this.passwordRecovery = this.authService.passwordRecovery$.value;
    if (user && !this.passwordRecovery) {
      await this.syncService.start(user.id);
    } else {
      this.showAuth = true;
    }
    // Sessione scaduta o chiusa da un altro dispositivo: torna alla schermata di accesso.
    this.authService.user$.subscribe(u => {
      if (!u && !this.showAuth) {
        this.syncService.stop();
        this.showAuth = true;
      }
    });
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
