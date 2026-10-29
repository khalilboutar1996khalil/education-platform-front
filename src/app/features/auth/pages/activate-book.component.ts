import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ApiError } from '../../../core/models/api.model';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../../core/models/auth.model';
import { LevelCatalog } from '../../../core/services/level-catalog.service';
import { User } from '../../../core/models/user.model';
import { applyServerErrors, errorMessageFor } from '../../../shared/forms/form-errors';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field.component';
import { AuthLayoutComponent } from '../components/auth-layout.component';
import { AUTH_PAGE_STYLES } from './auth-done.styles';

/**
 * Where the QR code of a book leads: /activer?serial=3-0042. The student types the code from
 * under the scratch-off panel and their name, and gets an account at the book's level.
 */
@Component({
  selector: 'ef-activate-book',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, ButtonComponent, FormFieldComponent],
  template: `
    <ef-auth-layout heading="Activer mon livre" subheading="Créez votre compte avec le code de votre livre">
      @if (created(); as user) {
        <div class="done" role="status">
          <div class="done__icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 class="done__title">Bienvenue {{ user.fullName }} !</h3>
          <p class="done__text">
            Votre compte {{ catalog.label(user.level) }} est prêt. Pour vous reconnecter, utilisez cet
            <strong>identifiant</strong> et votre mot de passe :
          </p>
          <div class="id">
            <code>{{ user.username }}</code>
            <button type="button" (click)="copy(user.username ?? '')">{{ copied() ? 'Copié ✓' : 'Copier' }}</button>
          </div>
          <p class="done__text done__text--small">Notez-le dans votre livre, à côté du code.</p>
          <button efButton type="button" [block]="true" (click)="enter()">Accéder à mon espace →</button>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          @if (formError(); as message) {
            <div class="ef-alert ef-alert--error" role="alert">{{ message }}</div>
          }

          <p class="intro">
            Grattez la zone <strong>« Code d'activation »</strong> sur la première page de votre livre.
          </p>

          <ef-form-field label="Numéro du livre" hint="Imprimé à côté du QR code" [error]="errorFor('serial')">
            <input
              class="ef-input"
              type="text"
              inputmode="text"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="ex. 3-0042"
              formControlName="serial"
              [readonly]="serialFromQr"
              [class.ef-input--invalid]="!!errorFor('serial')"
            />
          </ef-form-field>

          <ef-form-field label="Code d'activation" [error]="errorFor('code')">
            <input
              class="ef-input code-input"
              type="text"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="XXXX-XXXX"
              maxlength="20"
              formControlName="code"
              [class.ef-input--invalid]="!!errorFor('code')"
            />
          </ef-form-field>

          <div class="names">
            <ef-form-field label="Prénom" [error]="errorFor('firstName')">
              <input class="ef-input" type="text" autocomplete="given-name" placeholder="Amina"
                     formControlName="firstName" [class.ef-input--invalid]="!!errorFor('firstName')" />
            </ef-form-field>
            <ef-form-field label="Nom" [error]="errorFor('lastName')">
              <input class="ef-input" type="text" autocomplete="family-name" placeholder="Bensalem"
                     formControlName="lastName" [class.ef-input--invalid]="!!errorFor('lastName')" />
            </ef-form-field>
          </div>

          <ef-form-field
            label="Choisissez un mot de passe"
            [hint]="'Au moins ' + minLength + ' caractères'"
            [error]="errorFor('password')"
          >
            <input class="ef-input" type="password" autocomplete="new-password" placeholder="••••••••••"
                   formControlName="password" [class.ef-input--invalid]="!!errorFor('password')" />
          </ef-form-field>

          <button efButton type="submit" [block]="true" [loading]="submitting()">
            Activer mon livre →
          </button>
        </form>

        <p class="alt">Déjà un compte ? <a routerLink="/login">Se connecter</a></p>
      }
    </ef-auth-layout>
  `,
  styles: [
    AUTH_PAGE_STYLES,
    `
      .names {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      @media (max-width: 420px) {
        .names {
          grid-template-columns: 1fr;
        }
      }

      .code-input {
        font-family: var(--ef-font-display);
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .id {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 12px 14px;
        border-radius: 12px;
        background: var(--ef-tint-green);
        border: 1px dashed var(--ef-brand-500);
      }

      .id code {
        flex: 1;
        font-family: var(--ef-font-display);
        font-size: 17px;
        font-weight: 800;
        color: var(--ef-ink-green);
        word-break: break-all;
        user-select: all;
      }

      .id button {
        padding: 7px 12px;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 700;
        color: var(--ef-ink-green);
        background: var(--ef-surface);
        border: 1px solid var(--ef-border);
      }

      .done__text--small {
        font-size: 12.5px;
      }
    `,
  ],
})
export class ActivateBookComponent {
  protected readonly catalog = inject(LevelCatalog);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  private readonly serialParam = inject(ActivatedRoute).snapshot.queryParamMap.get('serial') ?? '';
  /** The QR code already says which book this is, so the student need not retype it. */
  protected readonly serialFromQr = this.serialParam.length > 0;
  protected readonly minLength = PASSWORD_MIN_LENGTH;

  protected readonly form = this.fb.group({
    serial: [this.serialParam, [Validators.required, Validators.maxLength(20)]],
    code: ['', [Validators.required, Validators.maxLength(20)]],
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    password: [
      '',
      [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(PASSWORD_MAX_LENGTH)],
    ],
  });

  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly created = signal<User | null>(null);
  protected readonly copied = signal(false);

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

    this.auth.activateBook(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.created.set(user);
      },
      error: (error: ApiError) => {
        this.submitting.set(false);
        if (error.status === 429) {
          this.formError.set('Trop d’essais pour ce livre. Réessayez dans un quart d’heure.');
          return;
        }
        const unmatched = applyServerErrors(this.form, error.fieldErrors);
        this.formError.set(unmatched[0] ?? error.detail);
      },
    });
  }

  protected async copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.copied.set(true);
    } catch {
      // Clipboard refused (insecure context or permission): the text stays selectable
    }
  }

  protected enter(): void {
    void this.router.navigate(['/app']);
  }
}
