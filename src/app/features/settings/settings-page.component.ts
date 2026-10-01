import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api.model';
import { LEVEL_LABELS, ROLE_LABELS } from '../../core/models/user.model';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';

function matchesNew(group: AbstractControl): ValidationErrors | null {
  const confirm = group.get('confirm')?.value;
  return confirm && confirm !== group.get('newPassword')?.value ? { mismatch: true } : null;
}

@Component({
  selector: 'ef-settings-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="ef-page wrap">
      <div class="ef-page-head">
        <div class="ef-page-title">Paramètres</div>
      </div>

      <section class="card">
        <div class="card__title">Profil</div>
        <div class="who">
          <div class="who__av">{{ user()?.initials }}</div>
          <div>
            <div class="who__name">{{ user()?.fullName }}</div>
            <div class="who__role">{{ roleLine() }}</div>
          </div>
        </div>
        <form class="grid" [formGroup]="profile" (ngSubmit)="saveProfile()">
          <label class="ef-f">
            <span class="ef-f__label">Nom complet</span>
            <input class="ef-field-input" formControlName="fullName" maxlength="255" autocomplete="name" />
            @if (err(profile.controls.fullName); as e) { <span class="ef-f__err">{{ e }}</span> }
          </label>
          <label class="ef-f">
            <span class="ef-f__label">E-mail</span>
            <input class="ef-field-input" [value]="user()?.email ?? ''" readonly aria-readonly="true" />
            <span class="ef-f__hint">L'adresse de connexion ne se modifie pas ici.</span>
          </label>
          <div class="foot">
            <button type="submit" class="ef-cta" [disabled]="savingProfile() || profile.pristine">
              {{ savingProfile() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </form>
      </section>

      <section class="card">
        <div class="card__title">Mot de passe</div>
        <form class="grid" [formGroup]="password" (ngSubmit)="savePassword()">
          <label class="ef-f span">
            <span class="ef-f__label">Mot de passe actuel</span>
            <input class="ef-field-input" type="password" formControlName="currentPassword" autocomplete="current-password" />
            @if (err(password.controls.currentPassword); as e) { <span class="ef-f__err">{{ e }}</span> }
          </label>
          <label class="ef-f">
            <span class="ef-f__label">Nouveau mot de passe</span>
            <input class="ef-field-input" type="password" formControlName="newPassword" autocomplete="new-password" />
            @if (err(password.controls.newPassword); as e) {
              <span class="ef-f__err">{{ e }}</span>
            } @else {
              <span class="ef-f__hint">Au moins 10 caractères.</span>
            }
          </label>
          <label class="ef-f">
            <span class="ef-f__label">Confirmer</span>
            <input class="ef-field-input" type="password" formControlName="confirm" autocomplete="new-password" />
            @if (err(password.controls.confirm); as e) {
              <span class="ef-f__err">{{ e }}</span>
            } @else if (password.controls.confirm.touched && password.hasError('mismatch')) {
              <span class="ef-f__err">Les deux mots de passe ne correspondent pas</span>
            }
          </label>
          @if (passwordError()) {
            <div class="ef-alert ef-alert--error span">{{ passwordError() }}</div>
          }
          <div class="foot">
            <span class="ef-f__hint">Vos autres appareils seront déconnectés.</span>
            <button type="submit" class="ef-cta" [disabled]="savingPassword()">
              {{ savingPassword() ? 'Modification…' : 'Changer le mot de passe' }}
            </button>
          </div>
        </form>
      </section>

      <section class="card">
        <div class="card__title">Accessibilité</div>
        <div class="row">
          <div>
            <div class="row__label">Réduire les animations</div>
            <div class="row__sub">Limite les animations dans toute l'interface</div>
          </div>
          <button type="button" class="switch" role="switch" [attr.aria-checked]="theme.reduceMotion()" [class.switch--on]="theme.reduceMotion()" (click)="theme.toggleReduceMotion()" aria-label="Réduire les animations">
            <span class="switch__knob"></span>
          </button>
        </div>
        <div class="ef-f__hint">Ces réglages sont propres à ce navigateur.</div>
      </section>
    </div>
  `,
  styles: `
    .wrap {
      max-width: 1180px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 16px;
      align-items: start;
    }
    .wrap > .ef-page-head, .wrap > .card:last-child { grid-column: 1 / -1; }
    .wrap > .card { margin-bottom: 16px; }
    .wrap > .card:nth-of-type(1), .wrap > .card:nth-of-type(2) { height: calc(100% - 16px); }
    @media (max-width: 900px) { .wrap { grid-template-columns: 1fr; } }
    .card { margin-bottom: 14px; padding: 22px; border-radius: 16px; background: var(--ef-surface); border: 1px solid var(--ef-border); animation: ef-fade-up 0.4s ease backwards; }
    .card__title { margin-bottom: 16px; font-family: var(--ef-font-display); font-size: 14.5px; font-weight: 700; color: var(--ef-text); }
    .who { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
    .who__av { width: 58px; height: 58px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 17px; font-family: var(--ef-font-display); font-size: 20px; font-weight: 800; color: #fff; background: var(--ef-gradient-brand); }
    .who__name { font-family: var(--ef-font-display); font-size: 15.5px; font-weight: 700; color: var(--ef-text); }
    .who__role { font-size: 12.5px; color: var(--ef-text-muted); }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
    @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
    .span, .foot { grid-column: 1 / -1; }
    .foot { display: flex; justify-content: flex-end; align-items: center; gap: 12px; flex-wrap: wrap; }
    input[readonly] { color: var(--ef-text-muted); cursor: default; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--ef-border); }
    .row:last-of-type { border-bottom: none; margin-bottom: 6px; }
    .row__label { font-size: 13.5px; font-weight: 700; color: var(--ef-text); }
    .row__sub { font-size: 12px; color: var(--ef-text-muted); }
    .switch { position: relative; width: 44px; height: 25px; flex-shrink: 0; border-radius: 20px; background: var(--ef-border); transition: background 0.25s; }
    .switch--on { background: var(--ef-gradient-brand); }
    .switch__knob { position: absolute; top: 3px; left: 3px; width: 19px; height: 19px; border-radius: 50%; background: #fff; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); transition: transform 0.25s var(--ef-ease-spring); }
    .switch--on .switch__knob { transform: translateX(19px); }
  `,
})
export class SettingsPageComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly theme = inject(ThemeService);

  protected readonly user = this.auth.user;
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  protected readonly roleLine = computed(() => {
    const u = this.user();
    if (!u) {
      return '';
    }
    return u.level ? `${ROLE_LABELS[u.role]} · ${LEVEL_LABELS[u.level]}` : ROLE_LABELS[u.role];
  });

  protected readonly profile = this.fb.nonNullable.group({
    fullName: [this.auth.user()?.fullName ?? '', [Validators.required, Validators.maxLength(255)]],
  });

  protected readonly password = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(100)]],
      confirm: ['', Validators.required],
    },
    { validators: matchesNew },
  );

  protected err(control: AbstractControl): string | null {
    return errorMessageFor(control);
  }

  protected saveProfile(): void {
    if (this.profile.invalid) {
      this.profile.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    this.auth.updateProfile(this.profile.getRawValue().fullName.trim()).subscribe({
      next: (u) => {
        this.savingProfile.set(false);
        this.profile.reset({ fullName: u.fullName });
        this.toast.success('Profil mis à jour');
      },
      error: (e: ApiError) => {
        this.savingProfile.set(false);
        const rest = applyServerErrors(this.profile, e.fieldErrors);
        this.toast.error(rest[0] ?? e.detail);
      },
    });
  }

  protected savePassword(): void {
    this.passwordError.set(null);
    if (this.password.invalid) {
      this.password.markAllAsTouched();
      return;
    }
    const v = this.password.getRawValue();
    if (v.newPassword === v.currentPassword) {
      this.password.controls.newPassword.setErrors({ server: 'Choisissez un mot de passe différent de l’actuel' });
      this.password.controls.newPassword.markAsTouched();
      return;
    }
    this.savingPassword.set(true);
    this.auth.changePassword(v.currentPassword, v.newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.password.reset();
        this.toast.success('Mot de passe modifié');
      },
      error: (e: ApiError) => {
        this.savingPassword.set(false);
        if (e.status === 401) {
          this.password.controls.currentPassword.setErrors({ server: 'Mot de passe actuel incorrect' });
          this.password.controls.currentPassword.markAsTouched();
          return;
        }
        const rest = applyServerErrors(this.password, e.fieldErrors);
        this.passwordError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }
}
