import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { ShoppingService } from '../services/shopping.service';
import { AddProductComponent } from '../add-product/add-product.component';
import { CategoryService } from '../services/category.service';
import { DemoDataService } from '../services/demo-data.service';
import { TelemetryService } from '../services/telemetry.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  products: Product[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private shoppingService: ShoppingService,
    private categoryService: CategoryService,
    private modalCtrl: ModalController,
    private demoDataService: DemoDataService,
    private alertCtrl: AlertController,
    private telemetry: TelemetryService,
  ) {}

  ngOnInit(): void {
    this.productService.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(products => (this.products = products));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalProducts(): number { return this.products.length; }

  /** Prodotti di esempio dell'onboarding ancora presenti: vanno tolti prima di usare l'app sul serio. */
  get demoCount(): number { return this.products.filter(p => p.isDemo).length; }

  async removeDemo(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Eliminare i prodotti di esempio?',
      message: 'Verranno tolti solo i prodotti di esempio; quelli che hai inserito tu restano. Prima viene fatto un backup di sicurezza.',
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Elimina', role: 'destructive', handler: () => {
          this.demoDataService.removeDemoData();
          this.telemetry.track('dati_esempio_rimossi', { origine: 'home' });
        } },
      ],
    });
    await alert.present();
  }

  get expiredProducts(): Product[] { return this.productService.getExpired(); }

  get expiringProducts(): Product[] { return this.productService.getExpiringWithinDays(7); }

  get expiringTodayCount(): number {
    return this.products.filter(p => p.expiryDate && this.productService.daysUntil(p.expiryDate) === 0).length;
  }

  get alertCount(): number { return this.expiredProducts.length + this.expiringProducts.length; }

  get lowStockProducts(): Product[] {
    return this.products.filter(p => p.lowStockThreshold !== null && p.quantity <= (p.lowStockThreshold ?? 0));
  }

  getEmoji(categoryId: string): string {
    return this.categoryService.getById(categoryId)?.emoji ?? '📦';
  }

  addToShoppingList(product: Product): void {
    this.shoppingService.addFromProduct(product.id, product.name, product.unit, product.category);
  }

  isInShoppingList(productId: string): boolean {
    return this.shoppingService.getAll().some(i => i.linkedProductId === productId && !i.checked);
  }

  async openAddProduct(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AddProductComponent,
      breakpoints: [0, 1],
      initialBreakpoint: 1,
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'save' && data) this.productService.add(data);
  }
}
