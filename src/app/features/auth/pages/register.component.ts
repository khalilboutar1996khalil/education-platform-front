import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/models/api.model';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../core/models/auth.model';
import { Level } from '../../../core/models/user.model';
import { ToastService } from '../../../core/services/toast.service';
import { applyServerErrors, errorMessageFor } from '../../../shared/forms/form-errors';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field.component';
import { AuthLayoutComponent } from '../components/auth-layout.component';
import { LevelCatalog } from '../../../core/services/level-catalog.service';

@Component({
  selector: 'ef-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, ButtonComponent, FormFieldComponent],
  template: `
    <ef-auth-layout
      heading="Créer mon compte"
      subheading="Choisissez votre niveau, l'accès est immédiat"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (formError(); as message) {
          <div class="ef-alert ef-alert--error" role="alert">{{ message }}</div>
        }

        <ef-form-field label="Nom et prénom" [error]="errorFor('fullName')">
          <input
            class="ef-input"
            type="text"
            autocomplete="name"
            placeholder="Amina Bensalem"
            formControlName="fullName"
            [class.ef-input--invalid]="!!errorFor('fullName')"
          />
        </ef-form-field>

        <ef-form-field label="E-mail" [error]="errorFor('email')">
          <input
            class="ef-input"
            type="email"
            autocomplete="email"
            placeholder="vous@exemple.com"
            formControlName="email"
            [class.ef-input--invalid]="!!errorFor('email')"
          />
        </ef-form-field>

        <ef-form-field
          label="Mot de passe"
          [hint]="'Au moins ' + minLength + ' caractères'"
          [error]="errorFor('password')"
        >
          <input
            class="ef-input"
            type="password"
            autocomplete="new-password"
            placeholder="••••••••••"
            formControlName="password"
            [class.ef-input--invalid]="!!errorFor('password')"
          />
        </ef-form-field>

        <ef-form-field label="Niveau" [error]="errorFor('level')">
          <select class="ef-input" formControlName="level">
            <option value="" disabled>Choisissez votre niveau</option>
            @for (option of levels(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </ef-form-field>

        <button efButton type="submit" [block]="true" [loading]="submitting()">
          Créer mon compte →
        </button>
      </form>

      <p class="alt">Déjà un compte ? <a routerLink="/login">Se connecter</a></p>
    </ef-auth-layout>
  `,
  styles: `
    form {
      display: grid;
      gap: 14px;
    }

    .alt {
      text-align: center;
      margin-top: 12px;
      font-size: 13px;
      color: var(--ef-text-subtle);
    }

    .alt a {
      font-weight: 700;
    }
  `,
})
export class RegisterComponent {
  protected readonly catalog = inject(LevelCatalog);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly levels = this.catalog.options;

  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(PASSWORD_MIN_LENGTH),
        Validators.maxLength(PASSWORD_MAX_LENGTH),
      ],
    ],
    level: ['' as Level, [Validators.required]],
  });

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected errorFor(control: string): string | null {
    return errorMessageFor(this.form.get(control));
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    this.auth.register(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.toast.success(`Bienvenue ${user.fullName} !`);
        void this.router.navigate(['/app']);
      },
      error: (error: ApiError) => {
        this.submitting.set(false);
        this.showError(error);
      },
    });
  }

  /**
   * A taken address (409) comes back as plain ProblemDetail with no field map, so it is attached
   * to the email control.
   */
  private showError(error: ApiError): void {
    if (error.status === 409) {
      const control = this.form.get('email');
      control?.setErrors({ ...(control.errors ?? {}), server: error.detail });
      control?.markAsTouched();
      return;
    }

    const unmatched = applyServerErrors(this.form, error.fieldErrors);
    this.formError.set(unmatched[0] ?? error.detail);
  }
}
