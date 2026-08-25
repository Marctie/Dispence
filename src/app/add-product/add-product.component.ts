import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Product, LOCATION_LABELS, UNIT_OPTIONS } from '../models/product.model';
import { DEFAULT_CATEGORIES } from '../models/category.model';

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
  lowStockEnabled = false;
  lowStockThreshold = 1;

  readonly categories = DEFAULT_CATEGORIES;
  readonly units = UNIT_OPTIONS;
  readonly locationLabels = LOCATION_LABELS;
  readonly locationOptions = ['pantry', 'fridge', 'freezer'] as const;

  get isEditMode(): boolean { return !!this.product; }
  get isValid(): boolean    { return this.name.trim().length > 0; }

  constructor(private modalCtrl: ModalController) {}

  ngOnInit(): void {
    if (this.product) {
      this.name             = this.product.name;
      this.category         = this.product.category;
      this.location         = this.product.location;
      this.quantity         = this.product.quantity;
      this.unit             = this.product.unit;
      this.expiryDate       = this.product.expiryDate;
      this.notes            = this.product.notes;
      this.lowStockEnabled  = this.product.lowStockThreshold !== null;
      this.lowStockThreshold = this.product.lowStockThreshold ?? 1;
    }
  }

  save(): void {
    if (!this.isValid) return;
    this.modalCtrl.dismiss({
      name:              this.name.trim(),
      category:          this.category,
      location:          this.location,
      quantity:          Number(this.quantity),
      unit:              this.unit,
      expiryDate:        this.expiryDate || null,
      notes:             this.notes,
      lowStockThreshold: this.lowStockEnabled ? Number(this.lowStockThreshold) : null,
    }, 'save');
  }

  cancel(): void { this.modalCtrl.dismiss(null, 'cancel'); }
}
