import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Product, LOCATION_LABELS } from '../../../models/product.model';
import { DEFAULT_CATEGORIES } from '../../../models/category.model';

@Component({
  selector: 'app-product-card',
  templateUrl: 'product-card.component.html',
  styleUrls: ['product-card.component.scss'],
  standalone: false,
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() showActions = true;
  @Output() editClick = new EventEmitter<void>();
  @Output() deleteClick = new EventEmitter<void>();

  get emoji(): string {
    return DEFAULT_CATEGORIES.find(c => c.id === this.product.category)?.emoji ?? '📦';
  }

  get locationLabel(): string {
    return LOCATION_LABELS[this.product.location] ?? this.product.location;
  }
}
