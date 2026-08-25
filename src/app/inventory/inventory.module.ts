import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { InventoryPage } from './inventory.page';
import { InventoryPageRoutingModule } from './inventory-routing.module';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, InventoryPageRoutingModule, SharedModule],
  declarations: [InventoryPage],
})
export class InventoryPageModule {}
