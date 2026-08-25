import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { Product, LOCATION_LABELS, UNIT_OPTIONS } from '../models/product.model';
import { Category } from '../models/category.model';
import { CategoryService } from '../services/category.service';
import { BarcodeService } from '../services/barcode.service';

@Component({
  selector: 'app-add-product',
  templateUrl: 'add-product.component.html',
  styleUrls: ['add-product.component.scss'],
  standalone: false,
})
export class AddProductComponent implements OnInit {
  @Input() product?: Product;

  name = '';
  category = 'altro';
  location = 'pantry';
  quantity = 1;
  unit = 'pz';
  expiryDate: string | null = null;
  notes = '';
  price: number | null = null;
  lowStockEnabled = false;
  lowStockThreshold = 1;
  barcode: string | null = null;
  scanning = false;

  categories: Category[] = [];
  readonly units = UNIT_OPTIONS;
  readonly locationLabels = LOCATION_LABELS;
  readonly locationOptions = ['pantry', 'fridge', 'freezer'] as const;

  get isEditMode(): boolean { return !!this.product; }
  get isValid(): boolean    { return this.name.trim().length > 0; }
  get canScan(): boolean    { return this.barcodeService.isSupported; }

  constructor(
    private modalCtrl: ModalController,
    private categoryService: CategoryService,
    private barcodeService: BarcodeService,
    private toastCtrl: ToastController,
  ) {}

  ngOnInit(): void {
    this.categories = this.categoryService.getAll();
    if (this.product) {
      this.name             = this.product.name;
      this.category         = this.product.category;
      this.location          = this.product.location;
      this.quantity          = this.product.quantity;
      this.unit               = this.product.unit;
      this.expiryDate        = this.product.expiryDate;
      this.notes              = this.product.notes;
      this.price               = this.product.price;
      this.barcode             = this.product.barcode ?? null;
      this.lowStockEnabled  = this.product.lowStockThreshold !== null;
      this.lowStockThreshold = this.product.lowStockThreshold ?? 1;
    }
  }

  async scanBarcode(): Promise<void> {
    this.scanning = true;
    try {
      const code = await this.barcodeService.scanOnce();
      if (!code) return;
      this.barcode = code;
      const result = await this.barcodeService.lookup(code);
      if (result.name) {
        this.name = result.name;
        if (result.category && this.categories.some(c => c.id === result.category)) {
          this.category = result.category;
        }
        if (result.unit && this.units.includes(result.unit)) {
          this.unit = result.unit;
        }
        this.showToast(result.fromCache ? 'Prodotto trovato in cache' : 'Prodotto trovato online');
      } else {
        this.showToast('Codice non riconosciuto: completa i dati manualmente');
      }
    } catch (e: any) {
      this.showToast(e?.message ?? 'Scansione non riuscita');
    } finally {
      this.scanning = false;
    }
  }

  save(): void {
    if (!this.isValid) return;
    if (this.barcode) {
      this.barcodeService.rememberManualEntry(this.barcode, this.name.trim(), this.category, this.unit);
    }
    this.modalCtrl.dismiss({
      name:              this.name.trim(),
      category:          this.category,
      location:          this.location,
      quantity:          Number(this.quantity),
      unit:              this.unit,
      expiryDate:        this.expiryDate || null,
      notes:             this.notes,
      price:             this.price !== null && this.price !== undefined && `${this.price}` !== '' ? Number(this.price) : null,
      barcode:           this.barcode,
      lowStockThreshold: this.lowStockEnabled ? Number(this.lowStockThreshold) : null,
    }, 'save');
  }

  cancel(): void { this.modalCtrl.dismiss(null, 'cancel'); }

  private async showToast(message: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 2000, position: 'bottom' });
    await toast.present();
  }
}
