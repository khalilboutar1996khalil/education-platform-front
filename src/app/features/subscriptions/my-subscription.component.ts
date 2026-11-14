import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthApi } from '../../core/auth/auth.api';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api.model';
import { PaymentMethod } from '../../core/models/auth.model';
import { Level } from '../../core/models/user.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { SubscriptionsApi } from './subscriptions.api';
import { Offer, formatDay, formatDinars, formatDuration, receiptProblem, todayIso } from './subscriptions.model';

/** Whole days from one ISO date to another. */
function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}

/**
 * Student: how long their access lasts, the plans, and renewing — the same request as the public
 * form, sent with their own name and address, which the professor checks and accepts.
 */
@Component({
  selector: 'ef-my-subscription',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SpinnerComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Mon abonnement</div>
          <div class="ef-page-sub">Votre accès à EduFlow, et comment le renouveler</div>
        </div>
      </div>

      <section class="status" [class.status--soon]="state() === 'soon'" [class.status--none]="state() === 'none'">
        <div class="status__label">{{ levelName() }}</div>
        @switch (state()) {
          @case ('active') {
            <div class="status__main">Actif jusqu'au {{ day(until()) }}</div>
            <div class="status__sub">Encore {{ left() }} jours d'accès</div>
          }
          @case ('soon') {
            <div class="status__main">Se termine le {{ day(until()) }}</div>
            <div class="status__sub">Plus que {{ left() }} jour(s) : pensez à renouveler pour ne pas perdre l'accès</div>
          }
          @default {
            <div class="status__main">Accès sans date de fin</div>
          }
        }
      </section>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (sent()) {
        <section class="block done">
          <div class="done__title">Demande de renouvellement envoyée ✓</div>
          <p>
            Votre professeur va vérifier votre paiement, puis prolonger votre accès. Les jours qui vous
            restent sont conservés.
          </p>
        </section>
      } @else if (offer()?.plans?.length) {
        <section class="block">
          <h2 class="block__title">Renouveler mon abonnement</h2>

          <div class="plans" role="radiogroup" aria-label="Plan">
            @for (p of offer()!.plans; track p.level) {
              <label class="plan" [class.plan--on]="level() === p.level">
                <input type="radio" name="plan" [value]="p.level" [ngModel]="level()" (ngModelChange)="level.set($event)" />
                <span class="plan__name">{{ p.levelName }}</span>
                <span class="plan__price">{{ price(p.price) }} <small>/ {{ duration(p.durationDays) }}</small></span>
              </label>
            }
          </div>

          @if (!email()) {
            <p class="warn">
              Votre compte n'a pas d'adresse e-mail. Payez votre professeur et demandez-lui de prolonger
              votre accès depuis sa liste d'élèves.
            </p>
          } @else if (chosen()) {
            <div class="label">Comment avez-vous payé ?</div>
            <div class="methods" role="radiogroup" aria-label="Moyen de paiement">
              <label class="method" [class.method--on]="method() === 'D17'">
                <input type="radio" name="method" value="D17" [ngModel]="method()" (ngModelChange)="method.set($event)" /> D17
              </label>
              <label class="method" [class.method--on]="method() === 'VIREMENT'">
                <input type="radio" name="method" value="VIREMENT" [ngModel]="method()" (ngModelChange)="method.set($event)" /> Virement bancaire
              </label>
            </div>

            @if (method(); as m) {
              <div class="pay">
                @if (m === 'D17') {
                  @if (offer()?.payment?.d17Number) {
                    Envoyez <b>{{ price(chosen()!.price) }}</b> par D17 au numéro <b>{{ offer()?.payment?.d17Number }}</b>.
                  } @else {
                    Demandez le numéro D17 à votre professeur.
                  }
                } @else {
                  @if (offer()?.payment?.rib) {
                    Virez <b>{{ price(chosen()!.price) }}</b> — RIB <b>{{ offer()?.payment?.rib }}</b>
                    @if (offer()?.payment?.accountHolder) { , au nom de {{ offer()?.payment?.accountHolder }} }.
                  } @else {
                    Demandez le RIB à votre professeur.
                  }
                }
                @if (offer()?.payment?.instructions) {
                  <div class="pay__more">{{ offer()?.payment?.instructions }}</div>
                }
              </div>
              <div class="receipt">
                <div class="label">Reçu du paiement</div>
                <label class="receipt__pick">
                  <input type="file" accept="image/jpeg,image/png,application/pdf" (change)="pickReceipt($event)" />
                  <span class="receipt__btn">{{ receipt() ? 'Changer le fichier' : 'Joindre la photo ou le PDF du reçu' }}</span>
                  @if (receipt(); as f) {
                    <span class="receipt__name">{{ f.name }}</span>
                  }
                </label>
                @if (receiptError()) {
                  <div class="err">{{ receiptError() }}</div>
                }
              </div>
              <label class="field">
                <span>{{ receipt() ? 'Référence du paiement (facultatif)' : 'Référence du paiement (si vous n’avez pas de reçu)' }}</span>
                <input
                  class="ef-input"
                  maxlength="100"
                  [placeholder]="m === 'D17' ? 'Le numéro de la transaction D17' : 'La référence du virement'"
                  [ngModel]="reference()"
                  (ngModelChange)="reference.set($event)"
                />
              </label>
            }

            @if (error()) {
              <div class="err">{{ error() }}</div>
            }
            <div class="foot">
              <button type="button" class="ef-cta" [disabled]="!canSend() || sending()" (click)="send()">
                {{ sending() ? 'Envoi…' : 'Envoyer ma demande de renouvellement' }}
              </button>
            </div>
          }
        </section>
      } @else {
        <section class="block">
          <p class="muted">Pour renouveler votre accès, adressez-vous à votre professeur.</p>
        </section>
      }
    </div>
  `,
  styles: `
    .status { padding: 20px; border-radius: var(--ef-radius-lg); background: var(--ef-gradient-brand); color: #fff; margin-bottom: 18px; box-shadow: var(--ef-shadow-md); }
    .status--soon { background: linear-gradient(135deg, #f59e0b, #b45309); }
    .status--none { background: var(--ef-surface); color: var(--ef-text); border: 1px solid var(--ef-border); box-shadow: none; }
    .status__label { font-size: 12px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; opacity: 0.85; }
    .status__main { margin-top: 6px; font-family: var(--ef-font-display); font-size: 22px; font-weight: 800; }
    .status__sub { margin-top: 4px; font-size: 13px; opacity: 0.9; }
    .block { padding: 18px; border-radius: var(--ef-radius-lg); background: var(--ef-surface); border: 1px solid var(--ef-border); display: grid; gap: 12px; }
    .block__title { font-family: var(--ef-font-display); font-size: 15px; font-weight: 800; color: var(--ef-text); }
    .plans { display: grid; gap: 8px; }
    .plan { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--ef-border); background: var(--ef-surface-2); cursor: pointer; }
    .plan--on { border-color: var(--ef-brand-600); background: var(--ef-tint-green); }
    .plan input, .method input { accent-color: var(--ef-brand-600); margin: 0; }
    .plan__name { font-size: 13.5px; font-weight: 700; color: var(--ef-text); }
    .plan__price { font-family: var(--ef-font-display); font-size: 15px; font-weight: 800; color: var(--ef-text); white-space: nowrap; }
    .plan__price small { font-size: 11.5px; color: var(--ef-text-muted); }
    .label { font-size: 12.5px; font-weight: 700; color: var(--ef-text); }
    .methods { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .method { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; border: 1px solid var(--ef-border); background: var(--ef-surface-2); font-size: 13px; font-weight: 700; color: var(--ef-text); cursor: pointer; }
    .method--on { border-color: var(--ef-brand-600); background: var(--ef-tint-green); }
    .pay { padding: 10px 12px; border-radius: 10px; background: var(--ef-surface-2); font-size: 12.5px; line-height: 1.6; color: var(--ef-text); }
    .pay__more { margin-top: 6px; color: var(--ef-text-muted); white-space: pre-line; }
    .receipt { display: grid; gap: 6px; }
    .receipt__pick { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; cursor: pointer; }
    .receipt__pick input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .receipt__btn { padding: 9px 12px; border-radius: 10px; border: 1px dashed var(--ef-brand-600); font-size: 12.5px; font-weight: 700; color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .receipt__pick input:focus-visible + .receipt__btn { outline: 2px solid var(--ef-brand-600); outline-offset: 2px; }
    .receipt__name { font-size: 12px; color: var(--ef-text-muted); word-break: break-all; }
    .field { display: grid; gap: 5px; font-size: 12px; font-weight: 700; color: var(--ef-text-muted); }
    .foot { display: flex; justify-content: flex-end; }
    .ef-cta:disabled { opacity: 0.5; }
    .warn { font-size: 13px; line-height: 1.6; color: var(--ef-ink-amber); background: var(--ef-tint-amber); padding: 10px 12px; border-radius: 10px; }
    .err { font-size: 13px; color: var(--ef-ink-red); }
    .muted { font-size: 13px; color: var(--ef-text-muted); }
    .done__title { font-family: var(--ef-font-display); font-size: 16px; font-weight: 800; color: var(--ef-ink-green); }
    .done p { font-size: 13.5px; line-height: 1.6; color: var(--ef-text); }
    @media (max-width: 520px) { .methods { grid-template-columns: 1fr; } }
  `,
})
export class MySubscriptionComponent {
  private readonly auth = inject(AuthService);
  private readonly authApi = inject(AuthApi);
  private readonly catalog = inject(LevelCatalog);

  private readonly user = this.auth.user;
  protected readonly email = computed(() => this.user()?.email ?? null);
  protected readonly until = computed(() => this.user()?.accessUntil ?? null);
  protected readonly levelName = computed(() => {
    const level = this.user()?.level;
    return level ? this.catalog.label(level) : 'Votre accès';
  });
  protected readonly left = computed(() => (this.until() ? Math.max(daysBetween(todayIso(), this.until()!), 0) : 0));
  protected readonly state = computed<'active' | 'soon' | 'none'>(() => {
    if (!this.until()) {
      return 'none';
    }
    return this.left() <= 30 ? 'soon' : 'active';
  });

  protected readonly offer = signal<Offer | null>(null);
  protected readonly loading = signal(true);
  protected readonly level = signal<Level>((this.user()?.level ?? '') as Level);
  protected readonly method = signal<PaymentMethod | ''>('');
  protected readonly reference = signal('');
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly chosen = computed(() => this.offer()?.plans.find((p) => p.level === this.level()) ?? null);
  protected readonly receipt = signal<File | null>(null);
  protected readonly receiptError = signal<string | null>(null);
  /** Proof of payment: the receipt, or failing that the typed reference. */
  protected readonly canSend = computed(
    () => !!this.chosen() && !!this.method() && (!!this.receipt() || this.reference().trim().length > 0),
  );

  protected pickReceipt(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    const problem = file ? receiptProblem(file) : null;
    this.receiptError.set(problem);
    this.receipt.set(problem ? null : file);
  }

  constructor() {
    inject(SubscriptionsApi)
      .offer()
      .subscribe({
        next: (o) => {
          this.offer.set(o);
          // Default to the student's own level, or the first plan if theirs has none
          if (!o.plans.some((p) => p.level === this.level()) && o.plans.length) {
            this.level.set(o.plans[0].level);
          }
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  protected day(iso: string | null): string {
    return formatDay(iso);
  }

  protected price(value: number): string {
    return formatDinars(value);
  }

  protected duration(days: number): string {
    return formatDuration(days);
  }

  protected send(): void {
    const user = this.user();
    const method = this.method();
    if (!user?.email || !method || !this.canSend()) {
      return;
    }
    this.sending.set(true);
    this.error.set(null);
    this.authApi
      .submitAccessRequest({
        fullName: user.fullName,
        email: user.email,
        level: this.level(),
        message: 'Renouvellement depuis « Mon abonnement »',
        paymentMethod: method,
        ...(this.reference().trim() ? { paymentReference: this.reference().trim() } : {}),
      }, this.receipt())
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
        },
        error: (e: ApiError) => {
          this.sending.set(false);
          this.error.set(e.detail);
        },
      });
  }
}
