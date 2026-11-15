import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { shareText } from '../shared/share.util';

/**
 * login      → accesso
 * signup     → registrazione (poi mostra il codice di recupero)
 * reset      → password dimenticata con codice di recupero (funziona senza email)
 * resetEmail → password dimenticata con link via email
 * recovery   → nuova password dopo il link email
 * saveCode   → mostra il codice di recupero da conservare
 */
type Mode = 'login' | 'signup' | 'reset' | 'resetEmail' | 'recovery' | 'saveCode';

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
  code = '';
  /** Codice di recupero da mostrare in modalità saveCode. */
  recoveryCode = '';
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
      case 'reset':
      case 'resetEmail': return 'Password dimenticata';
      case 'recovery': return 'Nuova password';
      case 'saveCode': return 'Il tuo codice di recupero';
      default: return 'Accedi';
    }
  }

  get submitLabel(): string {
    switch (this.mode) {
      case 'signup': return 'Registrati';
      case 'reset': return 'Reimposta password';
      case 'resetEmail': return 'Invia link';
      case 'recovery': return 'Salva password';
      default: return 'Accedi';
    }
  }

  get needsEmail(): boolean { return ['login', 'signup', 'reset', 'resetEmail'].includes(this.mode); }
  get needsPassword(): boolean { return ['login', 'signup', 'reset', 'recovery'].includes(this.mode); }
  get needsConfirm(): boolean { return ['signup', 'reset', 'recovery'].includes(this.mode); }

  setMode(mode: Mode): void {
    this.mode = mode;
    this.error = null;
    this.info = null;
    this.password = '';
    this.confirm = '';
    this.code = '';
  }

  async submit(): Promise<void> {
    if (this.busy || this.mode === 'saveCode') return;
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
            await this.showNewCode(() => this.auth.createRecoveryCode());
          }
          break;
        }
        case 'reset': {
          const newCode = await this.auth.recoverWithCode(this.email, this.code, this.password);
          this.recoveryCode = newCode;
          this.setMode('saveCode');
          this.info = 'Password cambiata. Il codice che hai usato non vale più: ecco quello nuovo.';
          break;
        }
        case 'resetEmail':
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

  async copyCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.recoveryCode);
      this.info = 'Codice copiato';
    } catch {
      this.info = 'Copia il codice a mano o fai uno screenshot';
    }
  }

  async shareCode(): Promise<void> {
    await shareText('Codice di recupero Dispensina Digitale',
      `Codice di recupero di Dispensina Digitale (account ${this.auth.user?.email ?? ''}): ${this.recoveryCode}`);
  }

  codeSaved(): void {
    this.done.emit();
  }

  private async showNewCode(create: () => Promise<string>): Promise<void> {
    try {
      this.recoveryCode = await create();
      this.setMode('saveCode');
    } catch {
      // Il codice si può sempre creare dopo, da Impostazioni → Account.
      this.done.emit();
    }
  }

  private validate(): string | null {
    if (this.needsEmail && !/^\S+@\S+\.\S+$/.test(this.email.trim())) {
      return 'Inserisci un indirizzo email valido';
    }
    if (this.mode === 'resetEmail') return null;
    if (this.mode === 'reset' && this.code.replace(/[^A-Za-z0-9]/g, '').length !== 16) {
      return 'Il codice di recupero ha 16 caratteri (es. ABCD-EFGH-JKLM-NPQR)';
    }
    if (this.mode === 'login') return this.password ? null : 'Inserisci la password';
    if (this.password.length < 8) return 'La password deve avere almeno 8 caratteri';
    if (this.password !== this.confirm) return 'Le due password non coincidono';
    return null;
  }
}
