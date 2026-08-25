import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SettingsPage } from './settings.page';
import { SettingsPageRoutingModule } from './settings-routing.module';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, SettingsPageRoutingModule, SharedModule],
  declarations: [SettingsPage],
})
export class SettingsPageModule {}
