import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ShoppingItem } from '../models/shopping-item.model';
import { ShoppingService } from '../services/shopping.service';
import { ProductService } from '../services/product.service';
import { DEFAULT_CATEGORIES } from '../models/category.model';

@Component({
  selector: 'app-shopping-list',
  templateUrl: 'shopping-list.page.html',
  styleUrls: ['shopping-list.page.scss'],
  standalone: false,
})
export class ShoppingListPage implements OnInit, OnDestroy {
  items: ShoppingItem[] = [];
  newItemName = '';
  private destroy$ = new Subject<void>();

  constructor(
    private shoppingService: ShoppingService,
    private productService: ProductService,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit(): void {
    this.shoppingService.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => (this.items = items));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pendingItems(): ShoppingItem[] { return this.items.filter(i => !i.checked); }
  get checkedItems(): ShoppingItem[]  { return this.items.filter(i => i.checked); }
  get hasSuggestions(): boolean {
    return this.productService.getAll().some(p =>
      p.lowStockThreshold !== null && p.quantity <= (p.lowStockThreshold ?? 0)
    );
  }

  get suggestedProducts() {
    return this.productService.getAll()
      .filter(p => p.lowStockThreshold !== null && p.quantity <= (p.lowStockThreshold ?? 0))
      .filter(p => !this.items.some(i => i.linkedProductId === p.id && !i.checked));
  }

  getEmoji(categoryId: string): string {
    return DEFAULT_CATEGORIES.find(c => c.id === categoryId)?.emoji ?? '📦';
  }

  trackById(_: number, item: ShoppingItem): string { return item.id; }

  addItem(): void {
    const name = this.newItemName.trim();
    if (!name) return;
    this.shoppingService.add({ name, quantity: 1, unit: 'pz', category: 'altro' });
    this.newItemName = '';
  }

  addSuggestion(productId: string): void {
    const p = this.productService.getAll().find(x => x.id === productId);
    if (!p) return;
    this.shoppingService.addFromProduct(p.id, p.name, p.unit, p.category);
  }

  toggle(id: string): void { this.shoppingService.toggle(id); }
  delete(id: string): void { this.shoppingService.delete(id); }

  async confirmClearChecked(): Promise<void> {
    if (!this.checkedItems.length) return;
    const alert = await this.alertCtrl.create({
      header: 'Svuota spuntati',
      message: `Rimuovere ${this.checkedItems.length} articoli completati?`,
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        { text: 'Rimuovi', role: 'destructive', handler: () => this.shoppingService.clearChecked() },
      ],
    });
    await alert.present();
  }

  async promptAddItem(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Aggiungi articolo',
      inputs: [{ name: 'name', type: 'text', placeholder: 'Nome prodotto...', attributes: { autocapitalize: 'sentences' } }],
      buttons: [
        { text: 'Annulla', role: 'cancel' },
        {
          text: 'Aggiungi',
          handler: (data) => {
            if (data.name?.trim()) {
              this.shoppingService.add({ name: data.name.trim(), quantity: 1, unit: 'pz', category: 'altro' });
            }
          },
        },
      ],
    });
    await alert.present();
  }
}
