import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { UsageReason } from '../models/usage.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Category } from '../models/category.model';
import { ProductService } from '../services/product.service';
import { CategoryService } from '../services/category.service';
import { AddProductComponent } from '../add-product/add-product.component';

type ExpiryFilter = 'all' | 'expiring' | 'expired';

@Component({
  selector: 'app-inventory',
  templateUrl: 'inventory.page.html',
  styleUrls: ['inventory.page.scss'],
  standalone: false,
})
export class InventoryPage implements OnInit, OnDestroy {
  products: Product[] = [];
  searchTerm = '';
  activeLocation = 'all';
  activeCategory = 'all';
  activeExpiry: ExpiryFilter = 'all';
  categories: Category[] = [];
  private destroy$ = new Subject<void>();

  readonly locations = [
    { id: 'all',     label: 'Tutti' },
    { id: 'pantry',  label: 'Dispensa' },
    { id: 'fridge',  label: 'Frigo' },
    { id: 'freezer', label: 'Freezer' },
  ];

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    this.categories = this.categoryService.getAll();
    this.productService.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(products => (this.products = products));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get filteredProducts(): Product[] {
    const term = this.searchTerm.toLowerCase();
    return this.products
      .filter(p => this.activeLocation === 'all' || p.location === this.activeLocation)
      .filter(p => this.activeCategory === 'all' || p.category === this.activeCategory)
      .filter(p => this.matchesExpiry(p))
      .filter(p => !term || p.name.toLowerCase().includes(term));
  }

  private matchesExpiry(p: Product): boolean {
    if (this.activeExpiry === 'all') return true;
    if (!p.expiryDate) return false;
    const days = this.productService.daysUntil(p.expiryDate);
    if (this.activeExpiry === 'expired') return days < 0;
    return days >= 0 && days <= 7;
  }

  trackById(_: number, p: Product): string {
    return p.id;
  }

  async openAddProduct(product?: Product): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddProductComponent,
      componentProps: { product },
      breakpoints: [0, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'save' && data) {
      product ? this.productService.update(product.id, data) : this.productService.add(data);
    }
  }

  async confirmDelete(product: Product): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Elimina prodotto',
      message: `Vuoi eliminare "${product.name}"?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Elimina', role: 'destructive', handler: () => this.productService.delete(product.id) },
      ],
    });
    await alert.present();
  }

  /** Uscita dalla dispensa: chiede quanto ne hai usato (o buttato) e lo registra nello storico. */
  async openUse(product: Product): Promise<void> {
    const suggested = product.quantity >= 1 && ['pz', 'conf', 'busta', 'scatola'].includes(product.unit) ? 1 : product.quantity;
    const alert = await this.alertCtrl.create({
      header: `Togli "${product.name}"`,
      message: `In dispensa: ${product.quantity} ${product.unit}. Quanto ne hai tolto?`,
      inputs: [{
        name: 'qty', type: 'number', value: suggested, min: 0,
        attributes: { step: 'any', inputmode: 'decimal', 'aria-label': `Quantità in ${product.unit}` },
      }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Buttato', handler: v => this.doUse(product, v?.qty, 'wasted') },
        { text: 'Usato', handler: v => this.doUse(product, v?.qty, 'used') },
      ],
    });
    await alert.present();
  }

  private doUse(product: Product, raw: unknown, reason: UsageReason): boolean {
    const qty = Number(String(raw ?? '').replace(',', '.'));
    if (!(qty > 0)) return false; // resta aperto: quantità non valida
    const entry = this.productService.consume(product.id, qty, reason);
    if (entry) void this.showUndoToast(entry.finished
      ? `${product.name} è finito ed è stato tolto dalla dispensa`
      : `${reason === 'used' ? 'Usati' : 'Buttati'} ${entry.quantity} ${entry.unit} di ${product.name}`, entry.id);
    return true;
  }

  private async showUndoToast(message: string, entryId: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message, duration: 3500, position: 'bottom',
      buttons: [{
        text: 'Annulla', handler: () => {
          const e = this.productService.getUsageHistory().find(x => x.id === entryId);
          if (e) this.productService.undoUsage(e);
        },
      }],
    });
    await toast.present();
  }
}
