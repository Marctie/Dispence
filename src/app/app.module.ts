import { ErrorHandler, NgModule, inject, provideAppInitializer } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { AuthComponent } from './auth/auth.component';
import { SharedModule } from './shared/shared.module';
import { GlobalErrorHandler } from './services/global-error-handler';
import { TelemetryService } from './services/telemetry.service';

@NgModule({
  declarations: [AppComponent, OnboardingComponent, AuthComponent],
  imports: [BrowserModule, IonicModule.forRoot(), AppRoutingModule, SharedModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // Telemetria per il bot di monitoraggio: errori globali + coda locale con reinvio (non blocca l'avvio).
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideAppInitializer(() => inject(TelemetryService).install()),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
