import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApi } from '../../../core/auth/auth.api';
import { ApiError } from '../../../core/models/api.model';
import { PaymentMethod } from '../../../core/models/auth.model';
import { Level } from '../../../core/models/user.model';
import { applyServerErrors, errorMessageFor } from '../../../shared/forms/form-errors';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { FormFieldComponent } from '../../../shared/ui/form-field.component';
import { AuthLayoutComponent } from '../components/auth-layout.component';
import { LevelCatalog } from '../../../core/services/level-catalog.service';
import { SubscriptionsApi } from '../../subscriptions/subscriptions.api';
import { Offer, formatDinars, formatDuration } from '../../subscriptions/subscriptions.model';

@Component({
  selector: 'ef-request-access',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, ButtonComponent, FormFieldComponent],
  template: `
    <ef-auth-layout
      heading="Demander un accès"
      subheading="Choisissez votre niveau : votre professeur valide chaque demande"
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
            @if (sentWithPlan()) {
              Votre professeur va vérifier votre paiement puis accepter votre demande. Si vous
              êtes déjà élève, votre accès sera prolongé ; sinon, vos identifiants de connexion
              vous seront remis.
            } @else {
              Votre professeur va examiner votre demande. Une fois acceptée, vos identifiants de
              connexion vous seront remis.
            }
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

          <ef-form-field
            label="E-mail"
            hint="Déjà élève ? Utilisez la même adresse pour renouveler votre abonnement"
            [error]="errorFor('email')"
          >
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

          @if (plan(); as p) {
            <section class="plan" aria-label="Abonnement">
              <div class="plan__head">
                <div>
                  <div class="plan__kicker">Abonnement annuel</div>
                  <div class="plan__level">{{ p.levelName }}</div>
                </div>
                <div class="plan__price">
                  {{ price(p.price) }}<span>/ {{ duration(p.durationDays) }}</span>
                </div>
              </div>
              <p class="plan__text">
                Tous les modules, vidéos, quiz et TP de votre niveau pendant {{ duration(p.durationDays) }},
                à partir du jour où votre professeur accepte la demande.
              </p>

              <div class="plan__label">Comment avez-vous payé ?</div>
              <div class="methods" role="radiogroup" aria-label="Moyen de paiement">
                @for (m of methods; track m.value) {
                  <label class="method" [class.method--on]="form.controls.paymentMethod.value === m.value">
                    <input type="radio" formControlName="paymentMethod" [value]="m.value" />
                    {{ m.label }}
                  </label>
                }
              </div>
              @if (errorFor('paymentMethod'); as e) {
                <div class="plan__err">Choisissez D17 ou virement bancaire</div>
              }

              @if (form.controls.paymentMethod.value; as m) {
                <div class="pay">
                  @if (m === 'D17') {
                    @if (payment()?.d17Number) {
                      Envoyez <b>{{ price(p.price) }}</b> par D17 au numéro <b>{{ payment()?.d17Number }}</b>
                      @if (payment()?.accountHolder) { ({{ payment()?.accountHolder }}) }.
                    } @else {
                      Demandez le numéro D17 à votre professeur.
                    }
                  } @else {
                    @if (payment()?.rib) {
                      Virez <b>{{ price(p.price) }}</b> sur le compte
                      @if (payment()?.bankName) { {{ payment()?.bankName }} }
                      — RIB <b>{{ payment()?.rib }}</b>
                      @if (payment()?.accountHolder) { , au nom de {{ payment()?.accountHolder }} }.
                    } @else {
                      Demandez le RIB à votre professeur.
                    }
                  }
                  @if (payment()?.instructions) {
                    <div class="pay__more">{{ payment()?.instructions }}</div>
                  }
                </div>

                <ef-form-field
                  label="Référence du paiement"
                  [hint]="m === 'D17' ? 'Le numéro de la transaction D17' : 'La référence du virement'"
                  [error]="errorFor('paymentReference')"
                >
                  <input
                    class="ef-input"
                    type="text"
                    [placeholder]="m === 'D17' ? 'Ex. 4815 2342' : 'Ex. VIR-20261113-01'"
                    formControlName="paymentReference"
                    [class.ef-input--invalid]="!!errorFor('paymentReference')"
                  />
                </ef-form-field>
              }
            </section>
          }

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

    .plan {
      display: grid;
      gap: 12px;
      padding: 16px;
      border-radius: var(--ef-radius-lg);
      border: 1.5px solid var(--ef-brand-600);
      background: var(--ef-surface);
      animation: ef-pop-in 0.3s var(--ef-ease-spring) both;
    }
    .plan__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .plan__kicker { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ef-ink-green); }
    .plan__level { font-size: 14px; font-weight: 700; color: var(--ef-text); margin-top: 2px; }
    .plan__price { font-family: var(--ef-font-display); font-size: 24px; font-weight: 800; color: var(--ef-text); white-space: nowrap; }
    .plan__price span { font-size: 12.5px; font-weight: 700; color: var(--ef-text-muted); margin-left: 4px; }
    .plan__text { font-size: 12.5px; line-height: 1.55; color: var(--ef-text-muted); }
    .plan__label { font-size: 12.5px; font-weight: 700; color: var(--ef-text); }
    .plan__err { font-size: 12px; color: var(--ef-ink-red); }
    .methods { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .method {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 11px;
      border: 1px solid var(--ef-border);
      background: var(--ef-surface-2);
      font-size: 13px;
      font-weight: 700;
      color: var(--ef-text);
      cursor: pointer;
    }
    .method--on { border-color: var(--ef-brand-600); background: var(--ef-tint-green); }
    .method input { accent-color: var(--ef-brand-600); }
    .pay { padding: 10px 12px; border-radius: 10px; background: var(--ef-surface-2); font-size: 12.5px; line-height: 1.6; color: var(--ef-text); }
    .pay__more { margin-top: 6px; color: var(--ef-text-muted); white-space: pre-line; }

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
    paymentMethod: ['' as PaymentMethod | ''],
    paymentReference: ['', [Validators.maxLength(100)]],
  });

  protected readonly methods: { value: PaymentMethod; label: string }[] = [
    { value: 'D17', label: 'D17' },
    { value: 'VIREMENT', label: 'Virement bancaire' },
  ];

  /** Plans on sale; while it loads, or if it fails, the form works as a free request. */
  private readonly offer = signal<Offer | null>(null);
  private readonly level = toSignal(this.form.controls.level.valueChanges, { initialValue: '' as Level });
  protected readonly plan = computed(() => this.offer()?.plans.find((p) => p.level === this.level()) ?? null);
  protected readonly payment = computed(() => this.offer()?.payment ?? null);
  protected readonly sentWithPlan = signal(false);

  constructor() {
    inject(SubscriptionsApi)
      .offer()
      .pipe(takeUntilDestroyed())
      .subscribe({ next: (o) => this.offer.set(o), error: () => this.offer.set(null) });
  }

  protected price(value: number): string {
    return formatDinars(value);
  }

  protected duration(days: number): string {
    return formatDuration(days);
  }

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
    // A level with a plan is paid for: how, and the reference the professor checks
    const paid = !!this.plan();
    const { paymentMethod: methodControl, paymentReference: referenceControl } = this.form.controls;
    methodControl.setValidators(paid ? [Validators.required] : []);
    referenceControl.setValidators(paid ? [Validators.required, Validators.maxLength(100)] : [Validators.maxLength(100)]);
    methodControl.updateValueAndValidity();
    referenceControl.updateValueAndValidity();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    const { fullName, email, level, message, paymentMethod, paymentReference } = this.form.getRawValue();

    this.api
      .submitAccessRequest({
        fullName,
        email,
        level,
        ...(message.trim() ? { message: message.trim() } : {}),
        ...(paid && paymentMethod ? { paymentMethod, paymentReference: paymentReference.trim() } : {}),
      })
      .subscribe({
        // The API answers 202 with an empty body whether or not the address is already known,
        // so the confirmation deliberately reveals nothing either way.
        next: () => {
          this.submitting.set(false);
          this.sentWithPlan.set(paid);
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
