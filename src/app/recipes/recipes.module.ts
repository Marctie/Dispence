import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RecipesPage } from './recipes.page';
import { RecipesPageRoutingModule } from './recipes-routing.module';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RecipesPageRoutingModule, SharedModule],
  declarations: [RecipesPage],
})
export class RecipesPageModule {}
