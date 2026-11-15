import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from '../services/auth.service';

type Mode = 'login' | 'signup' | 'reset' | 'recovery';

@Component({
  selector: 'app-auth',
  templateUrl: 'auth.component.html',
  styleUrls: ['auth.component.scss'],
  standalone: false,
})
export class AuthComponent implements OnInit {
  @Input() recovery = false;
  @Output() done = new EventEmitter<void>();

  mode: Mode = 'login';
  email = '';
  password = '';
  confirm = '';
  busy = false;
  error: string | null = null;
  info: string | null = null;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    if (this.recovery) this.mode = 'recovery';
    this.error = this.auth.linkError;
  }

  get title(): string {
    switch (this.mode) {
      case 'signup': return 'Crea il tuo account';
      case 'reset': return 'Password dimenticata';
      case 'recovery': return 'Nuova password';
      default: return 'Accedi';
    }
  }

  get submitLabel(): string {
    switch (this.mode) {
      case 'signup': return 'Registrati';
      case 'reset': return 'Invia link';
      case 'recovery': return 'Salva password';
      default: return 'Accedi';
    }
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.error = null;
    this.info = null;
    this.password = '';
    this.confirm = '';
  }

  async submit(): Promise<void> {
    if (this.busy) return;
    this.error = null;
    this.info = null;

    const problem = this.validate();
    if (problem) { this.error = problem; return; }

    this.busy = true;
    try {
      switch (this.mode) {
        case 'login':
          await this.auth.signIn(this.email, this.password);
          this.done.emit();
          break;
        case 'signup': {
          const needsConfirm = await this.auth.signUp(this.email, this.password);
          if (needsConfirm) {
            this.setMode('login');
            this.info = 'Ti abbiamo inviato un’email: apri il link per confermare l’account, poi accedi qui.';
          } else {
            this.done.emit();
          }
          break;
        }
        case 'reset':
          await this.auth.sendPasswordReset(this.email);
          this.info = 'Se l’indirizzo è registrato riceverai un’email con il link per scegliere una nuova password.';
          break;
        case 'recovery':
          await this.auth.updatePassword(this.password);
          this.done.emit();
          break;
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Si è verificato un errore, riprova';
    } finally {
      this.busy = false;
    }
  }

  private validate(): string | null {
    if (this.mode !== 'recovery' && !/^\S+@\S+\.\S+$/.test(this.email.trim())) {
      return 'Inserisci un indirizzo email valido';
    }
    if (this.mode === 'reset') return null;
    if (this.mode === 'login') return this.password ? null : 'Inserisci la password';
    if (this.password.length < 8) return 'La password deve avere almeno 8 caratteri';
    if (this.password !== this.confirm) return 'Le due password non coincidono';
    return null;
  }
}
