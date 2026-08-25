import { Component, OnInit } from '@angular/core';
import { PreferencesService } from './services/preferences.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  showOnboarding = false;

  constructor(private preferencesService: PreferencesService) {}

  ngOnInit(): void {
    // ThemeService si inizializza nel costruttore, qui solo onboarding
    this.showOnboarding = !this.preferencesService.isOnboardingDone();
  }

  onOnboardingDone(): void {
    this.preferencesService.markOnboardingDone();
    this.showOnboarding = false;
  }
}
