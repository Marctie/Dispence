import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
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
}
