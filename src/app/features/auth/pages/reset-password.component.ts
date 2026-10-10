import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApi } from '../../../core/auth/auth.api';
import { ApiError } from '../../../core/models/api.model';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../core/models/auth.model';
import { applyServerErrors, errorMessageFor } from '../../../shared/forms/form-errors';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field.component';
import { AuthLayoutComponent } from '../components/auth-layout.component';
import { AUTH_PAGE_STYLES } from './auth-done.styles';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword');
  if (!confirm || !confirm.value || password === confirm.value) {
    if (confirm?.hasError('mismatch')) {
      const { mismatch: _ignored, ...rest } = confirm.errors ?? {};
      confirm.setErrors(Object.keys(rest).length ? rest : null);
    }
    return null;
  }
  confirm.setErrors({ ...(confirm.errors ?? {}), mismatch: true });
  return null;
}

@Component({
  selector: 'ef-reset-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, ButtonComponent, FormFieldComponent],
  template: `
    <ef-auth-layout heading="Nouveau mot de passe" subheading="Choisissez le mot de passe de votre compte">
      @if (!token) {
        <div class="ef-alert ef-alert--error" role="alert">
          Ce lien de réinitialisation est incomplet. Ouvrez à nouveau le lien reçu par e-mail,
          ou demandez-en un nouveau.
        </div>
        <p class="alt"><a routerLink="/forgot-password">Demander un nouveau lien</a></p>
      } @else if (done()) {
        <div class="done" role="status">
          <div class="done__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 class="done__title">Mot de passe modifié</h3>
          <p class="done__text">
            Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <a class="done__link" routerLink="/login">Se connecter →</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError(); as message) {
            <div class="ef-alert ef-alert--error" role="alert">
              {{ message }}
              <a routerLink="/forgot-password">Demander un nouveau lien</a>
            </div>
          }

          <ef-form-field
            label="Nouveau mot de passe"
            [hint]="'Au moins ' + minLength + ' caractères'"
            [error]="errorFor('newPassword')"
          >
            <input
              class="ef-input"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••••"
              formControlName="newPassword"
              [class.ef-input--invalid]="!!errorFor('newPassword')"
            />
          </ef-form-field>

          <ef-form-field label="Confirmer le mot de passe" [error]="confirmError()">
            <input
              class="ef-input"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••••"
              formControlName="confirmPassword"
              [class.ef-input--invalid]="!!confirmError()"
            />
          </ef-form-field>

          <button efButton type="submit" [block]="true" [loading]="submitting()">
            Enregistrer le mot de passe →
          </button>
        </form>

        <p class="alt"><a routerLink="/login">Retour à la connexion</a></p>
      }
    </ef-auth-layout>
  `,
  styles: AUTH_PAGE_STYLES,
})
export class ResetPasswordComponent {
  private readonly api = inject(AuthApi);
  private readonly fb = inject(NonNullableFormBuilder);

  /** The raw token from the e-mail link: /reset-password?token=… */
  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  protected readonly minLength = PASSWORD_MIN_LENGTH;

  protected readonly form = this.fb.group(
    {
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(PASSWORD_MIN_LENGTH),
          Validators.maxLength(PASSWORD_MAX_LENGTH),
        ],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly submitting = signal(false);
  protected readonly done = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected errorFor(control: string): string | null {
    return errorMessageFor(this.form.get(control));
  }

  protected confirmError(): string | null {
    const control = this.form.get('confirmPassword');
    if (control?.touched && control.hasError('mismatch')) {
      return 'Les deux mots de passe ne correspondent pas';
    }
    return errorMessageFor(control);
  }

  protected submit(): void {
    if (this.submitting() || !this.token) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    this.api.resetPassword({ token: this.token, newPassword: this.form.getRawValue().newPassword }).subscribe({
      next: () => this.done.set(true),
      error: (error: ApiError) => {
        this.submitting.set(false);
        const unmatched = applyServerErrors(this.form, error.fieldErrors);
        this.formError.set(unmatched[0] ?? error.detail ?? 'Ce lien est invalide ou a expiré.');
      },
    });
  }
}
