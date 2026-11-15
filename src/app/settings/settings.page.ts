import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { environment } from '../../environments/environment';
import { ThemeService } from '../services/theme.service';
import { PreferencesService } from '../services/preferences.service';
import { StatsService, CategoryStat, LocationStat, ExpiryBucket } from '../services/stats.service';
import { BackupService } from '../services/backup.service';
import { DemoDataService } from '../services/demo-data.service';
import { NotificationService } from '../services/notification.service';
import { AuthService } from '../services/auth.service';
import { PantryInfo, PantryMember, SyncService, SyncStatus } from '../services/sync.service';
import { DEFAULT_PREFERENCES, UserPreferences } from '../models/user-preferences.model';
import { shareText } from '../shared/share.util';
import { TelemetryService } from '../services/telemetry.service';

type NotificationToggle = 'notifySummary' | 'notifyExpiry' | 'notifySameDay' | 'notifyExpired'
  | 'notifyLowStock' | 'notifyAdditions';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit, OnDestroy {
  @ViewChild('backupFileInput') backupFileInput!: ElementRef<HTMLInputElement>;

  currentTheme: 'light' | 'dark' | 'system' = 'system';
  prefs: UserPreferences = DEFAULT_PREFERENCES;
  alertDays = 7;
  notificationsEnabled = true;
  autoBackupDate: string | null = null;
  hasDemoData = false;
  accountEmail: string | null = null;
  syncStatus: SyncStatus = 'idle';
  pantry: PantryInfo | null = null;
  members: PantryMember[] = [];
  /** Data del codice di recupero: undefined = non ancora caricata, null = mai creato. */
  recoveryCreatedAt: string | null | undefined = undefined;

  // stats
  totalProducts = 0;
  totalExpired = 0;
  totalExpiring = 0;
  totalLowStock = 0;
  wastedValue = 0;
  mostRepurchased: { name: string; count: number }[] = [];
  byCategory: CategoryStat[] = [];
  byLocation: LocationStat[] = [];
  expiryBuckets: ExpiryBucket[] = [];

  private subs: Subscription[] = [];
  private telemetry = inject(TelemetryService);

  constructor(
    private themeService: ThemeService,
    private preferencesService: PreferencesService,
    private statsService: StatsService,
    private backupService: BackupService,
    private demoDataService: DemoDataService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private syncService: SyncService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.themeService.currentTheme$.subscribe(t => (this.currentTheme = t)),
      this.preferencesService.get$().subscribe(p => {
        this.prefs = p;
        this.alertDays = p.expiryAlertDays;
        this.notificationsEnabled = p.notificationsEnabled;
      }),
    );
    if (this.authService.enabled) {
      this.subs.push(
        this.authService.user$.subscribe(u => (this.accountEmail = u?.email ?? null)),
        this.syncService.status$.subscribe(s => (this.syncStatus = s)),
        this.syncService.pantry$.subscribe(p => (this.pantry = p)),
        this.syncService.members$.subscribe(m => (this.members = m)),
      );
    }
    this.loadStats();
    this.loadBackupState();
  }

  /** Permesso di sistema per le notifiche ('granted' | 'denied' | 'prompt' | 'unsupported'). */
  notifPermission: string = 'unsupported';

  private async loadPermission(): Promise<void> {
    this.notifPermission = await this.notificationService.permissionState();
    // L'interruttore è acceso solo se la preferenza è attiva E il sistema lo consente davvero.
    this.notificationsEnabled = this.prefs.notificationsEnabled && this.notifPermission === 'granted';
  }

  ionViewWillEnter(): void {
    this.loadPermission();
    this.loadStats();
    this.loadBackupState();
    if (this.accountEmail) {
      this.syncService.loadMembers();
      this.authService.recoveryCodeCreatedAt()
        .then(d => (this.recoveryCreatedAt = d))
        .catch(() => (this.recoveryCreatedAt = undefined));
    }
  }

  get recoveryLabel(): string {
    if (this.recoveryCreatedAt === undefined) return 'Serve per reimpostare la password senza email';
    if (this.recoveryCreatedAt === null) return 'Non ancora creato: crealo ora, ti servirà se dimentichi la password';
    return 'Creato il ' + new Date(this.recoveryCreatedAt).toLocaleDateString('it-IT') + ' · tocca per crearne uno nuovo';
  }

  async manageRecoveryCode(): Promise<void> {
    const create = async () => {
      try {
        const code = await this.authService.createRecoveryCode();
        this.recoveryCreatedAt = new Date().toISOString();
        await this.showRecoveryCode(code);
      } catch (e) {
        this.showToast(e instanceof Error ? e.message : 'Operazione non riuscita');
      }
    };
    if (!this.recoveryCreatedAt) { await create(); return; }
    const alert = await this.alertCtrl.create({
      header: 'Creare un nuovo codice?',
      message: 'Il codice di recupero attuale smetterà di funzionare.',
      buttons: [{ text: 'Annulla', role: 'cancel' }, { text: 'Nuovo codice', handler: () => { create(); } }],
    });
    await alert.present();
  }

  private async showRecoveryCode(code: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Codice di recupero',
      subHeader: code,
      message: 'Conservalo in un posto sicuro: serve per reimpostare la password se la dimentichi. Non verrà più mostrato.',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Copia / invia',
          handler: () => {
            shareText('Codice di recupero Dispensina Digitale',
              `Codice di recupero di Dispensina Digitale (account ${this.accountEmail}): ${code}`)
              .then(r => { if (r === 'copied') this.showToast('Codice copiato'); });
            return false;
          },
        },
        { text: 'Fatto', role: 'cancel' },
      ],
    });
    await alert.present();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get syncLabel(): string {
    switch (this.syncStatus) {
      case 'syncing': return 'Sincronizzazione in corso…';
      case 'synced': return 'Dati salvati nel tuo account';
      case 'offline': return 'Offline: le modifiche verranno salvate appena torni online';
      case 'error': return 'Salvataggio online non riuscito, riproverò';
      default: return 'In attesa di sincronizzazione';
    }
  }

  get isShared(): boolean { return this.members.length > 1; }
  get isOwner(): boolean { return this.pantry?.role === 'owner'; }
  get isNative(): boolean { return Capacitor.isNativePlatform(); }
  get pushActive(): boolean { return this.notificationService.isPushActive; }
  get needsHomeScreen(): boolean { return this.notificationService.needsHomeScreenInstall; }

  /** Codice invito leggibile: ABCD-1234. */
  get formattedCode(): string {
    const c = this.pantry?.inviteCode ?? '';
    return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
  }

  // ── Account ────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Uscire dall’account?',
      message: 'I dati restano salvati nel tuo account e verranno rimossi da questo dispositivo.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Esci',
          role: 'destructive',
          handler: async () => {
            await this.syncService.sync();
            await this.notificationService.disablePush();
            await this.authService.signOut();
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteAccount(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminare l’account?',
      message: 'L’account verrà cancellato definitivamente. Se la dispensa è condivisa resterà agli altri membri, altrimenti verrà eliminata. Esporta prima un backup se vuoi conservare i dati.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Elimina',
          role: 'destructive',
          handler: async () => {
            try {
              await this.notificationService.disablePush();
              await this.authService.deleteAccount();
            } catch (e) {
              this.showToast(e instanceof Error ? e.message : 'Eliminazione non riuscita');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Dispensa condivisa ─────────────────────────────────────────────────────

  async shareInvite(): Promise<void> {
    if (!this.pantry) return;
    const code = this.formattedCode;
    const link = `${environment.webUrl}?invito=${this.pantry.inviteCode}`;
    const text = `Entra nella mia dispensa su Dispensina Digitale!\n`
      + `Apri l’app → Impostazioni → Dispensa condivisa → “Entra con un codice” e inserisci: ${code}\n`
      + `Oppure apri questo link: ${link}`;
    try {
      if (Capacitor.isNativePlatform()) {
        await Share.share({ title: 'Invito alla dispensa', text });
      } else if (navigator.share) {
        await navigator.share({ title: 'Invito alla dispensa', text });
      } else {
        await navigator.clipboard.writeText(text);
        this.showToast('Invito copiato: incollalo in un messaggio');
      }
      this.telemetry.track('invito_condiviso');
    } catch { /* condivisione annullata */ }
  }

  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.pantry?.inviteCode ?? '');
      this.telemetry.track('codice_invito_copiato');
      this.showToast('Codice copiato');
    } catch {
      this.showToast('Codice: ' + this.formattedCode);
    }
  }

  async newInviteCode(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Generare un nuovo codice?',
      message: 'Il codice attuale smetterà di funzionare. Chi è già nella dispensa resta dentro.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Nuovo codice',
          handler: () => {
            this.syncService.regenerateInviteCode()
              .then(() => this.showToast('Nuovo codice generato'))
              .catch(e => this.showToast(e.message));
          },
        },
      ],
    });
    await alert.present();
  }

  async joinWithCode(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Entra in una dispensa',
      message: 'Inserisci il codice che ti hanno inviato. I prodotti che hai già verranno aggiunti alla dispensa condivisa.',
      inputs: [{ name: 'code', type: 'text', placeholder: 'ABCD-1234', attributes: { autocapitalize: 'characters', maxlength: 12 } }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Entra',
          handler: (values: { code: string }) => {
            const code = (values.code ?? '').trim();
            if (!code) return false;
            this.syncService.joinPantry(code)
              .then(() => this.showToast('Ora fai parte della dispensa condivisa'))
              .catch(e => this.showToast(e.message));
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async leaveShared(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Uscire dalla dispensa condivisa?',
      message: 'Avrai di nuovo una dispensa tutta tua, con una copia dei prodotti attuali. Gli altri non vedranno più le tue modifiche.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Esci',
          role: 'destructive',
          handler: () => {
            this.syncService.leavePantry()
              .then(() => this.showToast('Sei uscito dalla dispensa condivisa'))
              .catch(e => this.showToast(e.message));
          },
        },
      ],
    });
    await alert.present();
  }

  async removeMember(member: PantryMember): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: `Togliere ${member.displayName}?`,
      message: 'Non potrà più vedere né modificare questa dispensa.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Togli',
          role: 'destructive',
          handler: () => {
            this.syncService.removeMember(member.userId)
              .then(() => this.showToast(`${member.displayName} non fa più parte della dispensa`))
              .catch(e => this.showToast(e.message));
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Notifiche ──────────────────────────────────────────────────────────────

  onThemeChange(event: CustomEvent): void {
    this.themeService.setTheme(event.detail.value);
    this.preferencesService.update({ theme: event.detail.value });
    this.telemetry.track('tema_cambiato', { tema: String(event.detail.value) });
  }

  onAlertDaysChange(event: CustomEvent): void {
    this.alertDays = event.detail.value;
    this.preferencesService.update({ expiryAlertDays: this.alertDays });
    this.telemetry.track('impostazioni_modificate');
  }

  onToggle(key: NotificationToggle, event: CustomEvent): void {
    this.preferencesService.update({ [key]: !!event.detail.checked });
    this.telemetry.track('impostazioni_modificate');
  }

  onTimeChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (/^\d{2}:\d{2}$/.test(value)) {
      this.preferencesService.update({ notifyTime: value });
      this.telemetry.track('impostazioni_modificate');
    }
  }

  async onNotificationsToggle(event: CustomEvent): Promise<void> {
    const enabled = event.detail.checked;
    if (enabled) {
      const result = await this.notificationService.activate();
      if (result !== 'granted') {
        this.notificationsEnabled = false;
        await this.loadPermission();
        this.showToast(result === 'needs-home-screen'
          ? 'Su iPhone le notifiche funzionano solo dopo "Aggiungi a schermata Home" da Safari'
          : 'Notifiche non consentite: attivale dalle impostazioni del telefono (Notifiche → Dispensina)');
        return;
      }
      if (this.notificationService.isPushSupported && !this.notificationService.isPushActive) {
        this.showToast('Notifiche attive solo con l’app aperta: iscrizione al server non riuscita');
      }
    } else {
      await this.notificationService.disablePush();
    }
    this.notificationsEnabled = enabled;
    this.preferencesService.update({ notificationsEnabled: enabled });
    await this.loadPermission();
    this.telemetry.track(enabled ? 'notifiche_attivate' : 'notifiche_disattivate',
      enabled ? { push: this.notificationService.isPushActive } : {});
  }

  async testNotification(): Promise<void> {
    this.telemetry.track('notifica_prova');
    this.showToast(await this.notificationService.sendTest());
  }

  async exportBackup(): Promise<void> {
    try {
      await this.backupService.exportToFile();
      this.telemetry.track('backup_esportato');
      this.showToast('Backup esportato');
    } catch {
      this.showToast('Esportazione non riuscita');
    }
  }

  pickBackupFile(): void {
    this.backupFileInput.nativeElement.click();
  }

  async onBackupFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const confirmAlert = await this.alertCtrl.create({
      header: 'Ripristinare il backup?',
      message: 'I dati attuali verranno sostituiti con quelli del file selezionato.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Ripristina',
          role: 'destructive',
          handler: async () => {
            try {
              const json = await file.text();
              await this.backupService.restoreFromJson(json);
              this.telemetry.track('backup_ripristinato', { origine: 'file' });
              this.loadStats();
              this.loadBackupState();
              this.showToast('Backup ripristinato');
            } catch (e: any) {
              this.showToast(e?.message ?? 'Ripristino non riuscito');
            }
          },
        },
      ],
    });
    await confirmAlert.present();
  }

  async restoreAutoBackup(): Promise<void> {
    const confirmAlert = await this.alertCtrl.create({
      header: 'Ripristinare il backup automatico?',
      message: `Verranno ripristinati i dati salvati il ${this.autoBackupDate}.`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Ripristina',
          role: 'destructive',
          handler: async () => {
            try {
              await this.backupService.restoreFromAutoBackup();
              this.telemetry.track('backup_ripristinato', { origine: 'automatico' });
              this.loadStats();
              this.loadBackupState();
              this.showToast('Backup ripristinato');
            } catch (e: any) {
              this.showToast(e?.message ?? 'Ripristino non riuscito');
            }
          },
        },
      ],
    });
    await confirmAlert.present();
  }

  async removeDemoData(): Promise<void> {
    const confirmAlert = await this.alertCtrl.create({
      header: 'Rimuovere i dati di esempio?',
      message: 'Verrà creato automaticamente un backup di sicurezza prima della rimozione.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Rimuovi',
          role: 'destructive',
          handler: async () => {
            await this.demoDataService.removeDemoData();
            this.telemetry.track('dati_esempio_rimossi');
            this.loadStats();
            this.loadBackupState();
            this.showToast('Dati di esempio rimossi');
          },
        },
      ],
    });
    await confirmAlert.present();
  }

  private loadBackupState(): void {
    const backup = this.backupService.getAutoBackup();
    this.autoBackupDate = backup ? new Date(backup.createdAt).toLocaleString('it-IT') : null;
    this.hasDemoData = this.demoDataService.hasDemoData();
  }

  private loadStats(): void {
    this.totalProducts  = this.statsService.totalProducts();
    this.totalExpired   = this.statsService.totalExpired();
    this.totalExpiring  = this.statsService.totalExpiring();
    this.totalLowStock  = this.statsService.totalLowStock();
    this.wastedValue    = this.statsService.wastedValue();
    this.mostRepurchased = this.statsService.mostRepurchased();
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

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2500, position: 'bottom' });
    await toast.present();
  }
}
