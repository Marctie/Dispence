import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ManageCategoriesPage } from './manage-categories.page';
import { ManageCategoriesPageRoutingModule } from './manage-categories-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ManageCategoriesPageRoutingModule],
  declarations: [ManageCategoriesPage],
})
export class ManageCategoriesPageModule {}
