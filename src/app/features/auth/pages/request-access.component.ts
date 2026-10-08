import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApi } from '../../../core/auth/auth.api';
import { ApiError } from '../../../core/models/api.model';
import { Level } from '../../../core/models/user.model';
import { applyServerErrors, errorMessageFor } from '../../../shared/forms/form-errors';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field.component';
import { AuthLayoutComponent } from '../components/auth-layout.component';
import { LevelCatalog } from '../../../core/services/level-catalog.service';

@Component({
  selector: 'ef-request-access',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, ButtonComponent, FormFieldComponent],
  template: `
    <ef-auth-layout
      heading="Demander un accès"
      subheading="Votre demande est validée manuellement"
    >
      @if (submitted()) {
        <div class="done">
          <div class="done__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 class="done__title">Demande envoyée</h3>
          <p class="done__text">
            Votre professeur va examiner votre demande. Une fois acceptée, vos identifiants de
            connexion vous seront remis.
          </p>
          <a class="done__link" routerLink="/login">Retour à la connexion</a>
        </div>
      } @else {
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

          <ef-form-field label="Niveau" [error]="errorFor('level')">
            <select class="ef-input" formControlName="level">
              <option value="" disabled>Choisissez votre niveau</option>
              @for (option of levels(); track option.value) {
                <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
          </ef-form-field>

          <ef-form-field
            label="Message"
            hint="Facultatif — classe, établissement, ou toute précision utile"
            [error]="errorFor('message')"
          >
            <textarea
              class="ef-input"
              rows="3"
              placeholder="Bonjour, je suis élève en…"
              formControlName="message"
              [class.ef-input--invalid]="!!errorFor('message')"
            ></textarea>
          </ef-form-field>

          <button efButton type="submit" [block]="true" [loading]="submitting()">
            Envoyer ma demande →
          </button>
        </form>

        <p class="signin">
          Pas encore de compte ? <a routerLink="/register">Créer mon compte</a>
        </p>
        <p class="signin">Déjà un compte ? <a routerLink="/login">Se connecter</a></p>
      }
    </ef-auth-layout>
  `,
  styles: `
    form {
      display: grid;
      gap: 14px;
    }

    .signin {
      text-align: center;
      margin-top: 18px;
      font-size: 13px;
      color: var(--ef-text-subtle);
    }

    .signin a {
      font-weight: 700;
    }

    .done {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 28px 20px;
      border-radius: var(--ef-radius-lg);
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      animation: ef-pop-in 0.3s var(--ef-ease-spring) both;
    }

    .done__icon {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: var(--ef-tint-green);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .done__title {
      font-family: var(--ef-font-display);
      font-size: 17px;
      font-weight: 800;
      color: var(--ef-text);
    }

    .done__text {
      font-size: 13.5px;
      line-height: 1.65;
      color: var(--ef-text-muted);
    }

    .done__link {
      font-size: 13px;
      font-weight: 700;
      margin-top: 4px;
    }
  `,
})
export class RequestAccessComponent {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(AuthApi);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly levels = this.catalog.options;

  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    level: ['' as Level, [Validators.required]],
    message: ['', [Validators.maxLength(1000)]],
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
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

    const { fullName, email, level, message } = this.form.getRawValue();

    this.api
      .submitAccessRequest({
        fullName,
        email,
        level,
        ...(message.trim() ? { message: message.trim() } : {}),
      })
      .subscribe({
        // The API answers 202 with an empty body whether or not the address is already known,
        // so the confirmation deliberately reveals nothing either way.
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
        },
        error: (error: ApiError) => {
          this.submitting.set(false);
          const unmatched = applyServerErrors(this.form, error.fieldErrors);
          this.formError.set(unmatched[0] ?? error.detail);
        },
      });
  }
}
