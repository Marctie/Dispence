import { Component, Output, EventEmitter } from '@angular/core';
import { PreferencesService } from '../services/preferences.service';

@Component({
  selector: 'app-onboarding',
  templateUrl: 'onboarding.component.html',
  styleUrls: ['onboarding.component.scss'],
  standalone: false,
})
export class OnboardingComponent {
  @Output() done = new EventEmitter<void>();

  step = 0;
  readonly steps = [
    {
      emoji: '🥦',
      title: 'Benvenuto in Dispensina Digitale',
      text: 'Tieni traccia di tutto quello che hai in casa: frigo, dispensa e freezer in un\'unica app.',
    },
    {
      emoji: '⏰',
      title: 'Mai più sprechi',
      text: 'Ti avvisiamo quando un prodotto sta per scadere così non butterai più nulla.',
    },
    {
      emoji: '🍝',
      title: 'Ricette su misura',
      text: 'Scopri cosa puoi cucinare con quello che hai già in casa. L\'app fa il match automaticamente.',
    },
  ];

  next(): void {
    if (this.step < this.steps.length - 1) {
      this.step++;
    } else {
      this.finish();
    }
  }

  finish(): void {
    this.done.emit();
  }
}
