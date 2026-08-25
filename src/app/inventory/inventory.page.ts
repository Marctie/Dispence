import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { AddProductComponent } from '../add-product/add-product.component';

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
  private destroy$ = new Subject<void>();

  readonly locations = [
    { id: 'all',     label: 'Tutti' },
    { id: 'pantry',  label: 'Dispensa' },
    { id: 'fridge',  label: 'Frigo' },
    { id: 'freezer', label: 'Freezer' },
  ];

  constructor(
    private productService: ProductService,
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
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

  get filteredProducts(): Product[] {
    const term = this.searchTerm.toLowerCase();
    return this.products
      .filter(p => this.activeLocation === 'all' || p.location === this.activeLocation)
      .filter(p => !term || p.name.toLowerCase().includes(term));
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
