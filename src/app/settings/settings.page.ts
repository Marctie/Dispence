import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { AlertController, ToastController } from '@ionic/angular';
import { ThemeService } from '../services/theme.service';
import { PreferencesService } from '../services/preferences.service';
import { StatsService, CategoryStat, LocationStat, ExpiryBucket } from '../services/stats.service';
import { BackupService } from '../services/backup.service';
import { DemoDataService } from '../services/demo-data.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit, OnDestroy {
  @ViewChild('backupFileInput') backupFileInput!: ElementRef<HTMLInputElement>;

  currentTheme: 'light' | 'dark' | 'system' = 'system';
  alertDays = 7;
  notificationsEnabled = true;
  autoBackupDate: string | null = null;
  hasDemoData = false;

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

  private sub!: Subscription;

  constructor(
    private themeService: ThemeService,
    private preferencesService: PreferencesService,
    private statsService: StatsService,
    private backupService: BackupService,
    private demoDataService: DemoDataService,
    private notificationService: NotificationService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    this.sub = this.themeService.currentTheme$.subscribe(t => (this.currentTheme = t));
    const prefs = this.preferencesService.get();
    this.alertDays = prefs.expiryAlertDays;
    this.notificationsEnabled = prefs.notificationsEnabled;
    this.loadStats();
    this.loadBackupState();
  }

  ionViewWillEnter(): void {
    this.loadStats();
    this.loadBackupState();
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

  async onNotificationsToggle(event: CustomEvent): Promise<void> {
    const enabled = event.detail.checked;
    if (enabled && this.notificationService.isSupported) {
      const granted = await this.notificationService.ensurePermission();
      if (!granted) {
        this.notificationsEnabled = false;
        this.showToast('Permesso notifiche negato: attivalo dalle impostazioni del sistema');
        return;
      }
    }
    this.notificationsEnabled = enabled;
    this.preferencesService.update({ notificationsEnabled: enabled });
  }

  async exportBackup(): Promise<void> {
    try {
      await this.backupService.exportToFile();
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
