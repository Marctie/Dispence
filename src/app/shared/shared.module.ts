import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { AppFooterComponent } from './components/app-footer/app-footer.component';
import { ExpiryBadgeComponent } from './components/expiry-badge/expiry-badge.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { AddProductComponent } from '../add-product/add-product.component';

@NgModule({
  declarations: [
    AppFooterComponent,
    ExpiryBadgeComponent,
    ProductCardComponent,
    AddProductComponent,
  ],
  imports: [CommonModule, IonicModule, RouterModule, FormsModule],
  exports: [
    AppFooterComponent,
    ExpiryBadgeComponent,
    ProductCardComponent,
    AddProductComponent,
    FormsModule,
  ],
})
export class SharedModule {}
