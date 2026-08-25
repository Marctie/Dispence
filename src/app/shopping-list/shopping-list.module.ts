import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ShoppingListPage } from './shopping-list.page';
import { ShoppingListPageRoutingModule } from './shopping-list-routing.module';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ShoppingListPageRoutingModule, SharedModule],
  declarations: [ShoppingListPage],
})
export class ShoppingListPageModule {}
