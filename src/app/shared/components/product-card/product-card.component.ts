import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Product, LOCATION_LABELS } from '../../../models/product.model';
import { CategoryService } from '../../../services/category.service';

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
  /** "Usa": toglie una quantità dalla dispensa. Il pulsante appare solo se qualcuno ascolta. */
  @Output() useClick = new EventEmitter<void>();

  constructor(private categoryService: CategoryService) {}

  get emoji(): string {
    return this.categoryService.getById(this.product.category)?.emoji ?? '📦';
  }

  get locationLabel(): string {
    return LOCATION_LABELS[this.product.location] ?? this.product.location;
  }
}
