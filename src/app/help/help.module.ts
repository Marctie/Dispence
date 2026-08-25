import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HelpPage } from './help.page';
import { HelpPageRoutingModule } from './help-routing.module';

@NgModule({
  imports: [CommonModule, IonicModule, HelpPageRoutingModule],
  declarations: [HelpPage],
})
export class HelpPageModule {}
