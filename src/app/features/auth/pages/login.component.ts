import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/models/api.model';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field.component';
import { applyServerErrors, errorMessageFor } from '../../../shared/forms/form-errors';
import { AuthLayoutComponent } from '../components/auth-layout.component';

const DEMO_PASSWORD = 'Passw0rd-Demo';

@Component({
  selector: 'ef-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, ButtonComponent, FormFieldComponent],
  template: `
    <ef-auth-layout heading="Bon retour" subheading="Connectez-vous pour accéder à votre espace">
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError(); as message) {
          <div class="ef-alert ef-alert--error" role="alert">{{ message }}</div>
        }

        <ef-form-field label="E-mail" [error]="errorFor('email')">
          <input
            class="ef-input"
            type="email"
            autocomplete="email"
            placeholder="vous@eduflow.dz"
            formControlName="email"
            [class.ef-input--invalid]="!!errorFor('email')"
          />
        </ef-form-field>

        <ef-form-field label="Mot de passe" [error]="errorFor('password')">
          <input
            class="ef-input"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            formControlName="password"
            [class.ef-input--invalid]="!!errorFor('password')"
          />
        </ef-form-field>

        <p class="forgot">Mot de passe oublié ? Contactez votre professeur.</p>

        <button efButton type="submit" [block]="true" [loading]="submitting()" [disabled]="lockoutSeconds() > 0">
          @if (lockoutSeconds() > 0) {
            Réessayez dans {{ lockoutLabel() }}
          } @else {
            Se connecter →
          }
        </button>
      </form>

      @if (showDemoCredentials) {
        <div class="demo">
          <span class="demo__label">Comptes de démonstration</span>
          <div class="demo__row">
            @for (account of demoAccounts; track account.email) {
              <button type="button" class="demo__chip" (click)="fillDemo(account.email)">
                {{ account.label }}
              </button>
            }
          </div>
        </div>
      }

      <p class="signup">
        Pas de compte ? <a routerLink="/register">Créer mon compte</a>
      </p>
    </ef-auth-layout>
  `,
  styles: `
    form {
      display: grid;
      gap: 14px;
    }

    .forgot {
      justify-self: end;
      margin: -4px 0 0;
      font-size: 12.5px;
      color: var(--ef-text-muted);
    }

    .demo {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid var(--ef-border);
    }

    .demo__label {
      display: block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ef-text-subtle);
      margin-bottom: 9px;
    }

    .demo__row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .demo__chip {
      font-size: 12px;
      font-weight: 700;
      padding: 7px 13px;
      border-radius: var(--ef-radius-pill);
      background: var(--ef-tint-green);
      color: var(--ef-ink-green);
      transition: background var(--ef-motion-fast);
    }

    .demo__chip:hover {
      background: rgba(34, 197, 94, 0.24);
    }

    .signup {
      text-align: center;
      margin-top: 18px;
      font-size: 13px;
      color: var(--ef-text-subtle);
    }

    .signup a {
      font-weight: 700;
    }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly lockoutSeconds = signal(0);

  /** The backend locks out for a full 15 minutes, so a raw second count reads badly. */
  protected readonly lockoutLabel = computed(() => {
    const total = this.lockoutSeconds();
    if (total < 60) {
      return `${total} s`;
    }
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes} min ${String(seconds).padStart(2, '0')} s`;
  });

  protected readonly showDemoCredentials = environment.showDemoCredentials;
  protected readonly demoAccounts = [
    { label: 'Administrateur', email: 'admin@eduflow.dz' },
    { label: 'Élève', email: 'amira@eduflow.dz' },
  ];

  constructor() {
    if (this.route.snapshot.queryParamMap.get('expired')) {
      this.formError.set('Votre session a expiré. Veuillez vous reconnecter.');
    }
  }

  protected errorFor(control: string): string | null {
    return errorMessageFor(this.form.get(control));
  }

  protected fillDemo(email: string): void {
    this.form.setValue({ email, password: DEMO_PASSWORD });
  }

  protected submit(): void {
    if (this.submitting() || this.lockoutSeconds() > 0) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl(this.redirectTarget()),
      error: (error: ApiError) => {
        this.submitting.set(false);
        const unmatched = applyServerErrors(this.form, error.fieldErrors);
        this.formError.set(unmatched[0] ?? error.detail);
        if (error.status === 429) {
          this.startLockout(error.retryAfterSeconds ?? 60);
        }
      },
    });
  }

  /** Only same-site paths are honoured, so ?redirectTo= can't be used as an open redirect. */
  private redirectTarget(): string {
    const raw = this.route.snapshot.queryParamMap.get('redirectTo');
    return raw?.startsWith('/') && !raw.startsWith('//') ? raw : '/app';
  }

  private startLockout(seconds: number): void {
    this.lockoutSeconds.set(seconds);
    const timer = setInterval(() => {
      this.lockoutSeconds.update((value) => Math.max(0, value - 1));
      if (this.lockoutSeconds() === 0) {
        clearInterval(timer);
      }
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }
}
