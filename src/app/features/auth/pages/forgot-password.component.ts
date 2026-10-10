import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApi } from '../../../core/auth/auth.api';
import { ApiError } from '../../../core/models/api.model';
import { applyServerErrors, errorMessageFor } from '../../../shared/forms/form-errors';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field.component';
import { AuthLayoutComponent } from '../components/auth-layout.component';
import { AUTH_PAGE_STYLES } from './auth-done.styles';

@Component({
  selector: 'ef-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, ButtonComponent, FormFieldComponent],
  template: `
    <ef-auth-layout heading="Mot de passe oublié" subheading="Recevez un lien pour en choisir un nouveau">
      @if (sent()) {
        <div class="done" role="status">
          <div class="done__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 class="done__title">Vérifiez votre boîte mail</h3>
          <p class="done__text">
            Si un compte existe pour <strong>{{ sentTo() }}</strong>, un e-mail avec un lien de
            réinitialisation vient de lui être envoyé. Le lien est valable une heure.
            Pensez à regarder dans les courriers indésirables.
          </p>
          <a class="done__link" routerLink="/login">Retour à la connexion</a>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError(); as message) {
            <div class="ef-alert ef-alert--error" role="alert">{{ message }}</div>
          }

          <p class="intro">Entrez l'adresse e-mail de votre compte.</p>

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

          <button efButton type="submit" [block]="true" [loading]="submitting()">
            Envoyer le lien →
          </button>
        </form>

        <p class="alt"><a routerLink="/login">Retour à la connexion</a></p>
      }
    </ef-auth-layout>
  `,
  styles: AUTH_PAGE_STYLES,
})
export class ForgotPasswordComponent {
  private readonly api = inject(AuthApi);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
  });

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly sentTo = signal('');
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
    const { email } = this.form.getRawValue();

    // The backend answers the same whether or not the address has an account, and so does this page.
    this.api.forgotPassword({ email }).subscribe({
      next: () => {
        this.sentTo.set(email);
        this.sent.set(true);
      },
      error: (error: ApiError) => {
        this.submitting.set(false);
        const unmatched = applyServerErrors(this.form, error.fieldErrors);
        this.formError.set(unmatched[0] ?? error.detail);
      },
    });
  }
}
