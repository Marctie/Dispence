import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { UsageHistoryPage } from './usage-history.page';
import { UsageHistoryPageRoutingModule } from './usage-history-routing.module';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, UsageHistoryPageRoutingModule],
  declarations: [UsageHistoryPage],
})
export class UsageHistoryPageModule {}
