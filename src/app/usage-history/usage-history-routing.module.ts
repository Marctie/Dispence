import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UsageHistoryPage } from './usage-history.page';

const routes: Routes = [{ path: '', component: UsageHistoryPage }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UsageHistoryPageRoutingModule {}
