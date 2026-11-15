import { Component, OnInit } from '@angular/core';
import { combineLatest, debounceTime } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PreferencesService } from './services/preferences.service';
import { BackupService } from './services/backup.service';
import { ProductService } from './services/product.service';
import { CHANNEL_EXPIRY, CHANNEL_PANTRY, NotificationService } from './services/notification.service';
import { DemoDataService } from './services/demo-data.service';
import { AuthService } from './services/auth.service';
import { SyncService } from './services/sync.service';

const PENDING_INVITE_KEY = 'dispensa_pending_invite';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  showOnboarding = false;
  /** Con gli account attivi: schermata di accesso finché non c'è un utente. */
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
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  async ngOnInit(): Promise<void> {
    // ThemeService si inizializza nel costruttore, qui solo onboarding
    this.showOnboarding = !this.preferencesService.isOnboardingDone();
    this.capturePendingInvite();

    try {
      await this.setupNotificationChannels();
    } catch (e) {
      console.error('Impossibile creare i canali di notifica', e);
    }

    if (this.authService.enabled) {
      try {
        await this.setupAccount();
      } catch (e) {
        console.error('Inizializzazione account non riuscita', e);
        this.showAuth = true;
      }
    }

    try {
      await this.backupService.runSilentAutoBackup();
    } catch (e) {
      console.error('Backup automatico silenzioso non riuscito', e);
    }

    combineLatest([this.productService.getAll$(), this.preferencesService.get$()])
      .pipe(debounceTime(300))
      .subscribe(([products, prefs]) => {
        this.notificationService.rescheduleAll(products, prefs)
          .catch(e => console.error('Pianificazione notifiche non riuscita', e));
      });

    this.syncService.remoteAdditions$.subscribe(({ by, names, shopping }) => {
      this.notificationService.showAdditions(by, names, shopping, this.preferencesService.get())
        .catch(() => undefined);
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
    this.startSession(user.id);
  }

  private async setupAccount(): Promise<void> {
    const user = await this.authService.init();
    this.passwordRecovery = this.authService.passwordRecovery$.value;
    if (user && !this.passwordRecovery) {
      this.startSession(user.id);
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

  /** Avvia la sincronizzazione senza bloccare l'interfaccia (l'app funziona anche offline). */
  private startSession(userId: string): void {
    this.syncService.start(userId)
      .then(() => this.refreshPush())
      .then(() => this.offerPendingInvite())
      .catch(e => console.error('Sincronizzazione iniziale non riuscita', e));
  }

  /** Web: rinnova l'iscrizione alle push se le notifiche sono attive e il permesso è già concesso. */
  private async refreshPush(): Promise<void> {
    const prefs = this.preferencesService.get();
    if (prefs.notificationsEnabled && this.notificationService.isPushSupported
        && Notification.permission === 'granted') {
      await this.notificationService.enablePush();
    }
  }

  /** Link d'invito (…/Dispence/?invito=CODICE): lo ricorda finché l'utente non ha fatto l'accesso. */
  private capturePendingInvite(): void {
    try {
      const code = new URLSearchParams(location.search).get('invito');
      if (code) {
        sessionStorage.setItem(PENDING_INVITE_KEY, code);
        history.replaceState(null, '', location.pathname);
      }
    } catch { /* non disponibile */ }
  }

  private async offerPendingInvite(): Promise<void> {
    let code: string | null = null;
    try {
      code = sessionStorage.getItem(PENDING_INVITE_KEY);
      sessionStorage.removeItem(PENDING_INVITE_KEY);
    } catch { /* non disponibile */ }
    if (!code) return;

    const alert = await this.alertCtrl.create({
      header: 'Entrare nella dispensa condivisa?',
      message: 'Sei stato invitato in una dispensa. I prodotti che hai già verranno aggiunti a quella condivisa.',
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Entra',
          handler: () => {
            this.syncService.joinPantry(code!)
              .then(() => this.toast('Ora fai parte della dispensa condivisa'))
              .catch(e => this.toast(e instanceof Error ? e.message : 'Invito non valido'));
          },
        },
      ],
    });
    await alert.present();
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }

  private async setupNotificationChannels(): Promise<void> {
    if (!this.notificationService.isSupported) return;
    await LocalNotifications.createChannel({
      id: CHANNEL_EXPIRY,
      name: 'Avvisi scadenza',
      description: 'Notifiche per i prodotti in scadenza e le scorte basse',
      importance: 4,
    });
    await LocalNotifications.createChannel({
      id: CHANNEL_PANTRY,
      name: 'Dispensa condivisa',
      description: 'Prodotti aggiunti da chi condivide la dispensa con te',
      importance: 3,
    });
  }
}
