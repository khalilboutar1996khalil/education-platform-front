import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { SchoolLevel } from '../../core/models/level.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { SubscriptionsApi } from './subscriptions.api';
import { PaymentSettings, Plan, formatDinars } from './subscriptions.model';

/** What the admin is editing on one level's row. */
interface Draft {
  price: string;
  active: boolean;
}

const EMPTY_PAYMENT: PaymentSettings = {
  d17Number: null,
  bankName: null,
  rib: null,
  accountHolder: null,
  instructions: null,
};

/**
 * Admin: the yearly price of each level, and where students pay. A level with a plan on sale asks
 * for the payment in the access form; the admin checks it and accepts or refuses the request.
 */
@Component({
  selector: 'ef-subscriptions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SpinnerComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Abonnements</div>
          <div class="ef-page-sub">Le prix d'un an d'accès pour chaque niveau, et où vos élèves vous paient</div>
        </div>
      </div>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else {
        <section class="block">
          <h2 class="block__title">Prix par niveau</h2>
          <p class="block__hint">
            Un an = 365 jours à partir du jour où vous acceptez la demande. Un élève qui renouvelle
            avant la fin garde les jours qui lui restaient.
          </p>
          <div class="list">
            @for (l of levels(); track l.code) {
              <div class="row">
                <div class="row__main">
                  <div class="name">{{ l.name }}</div>
                  <div class="state">
                    @if (planOf(l.code); as p) {
                      @if (p.active) {
                        <span class="ef-pill ef-pill--green">En vente · {{ price(p.price) }} / an</span>
                      } @else {
                        <span class="ef-pill ef-pill--amber">Pas en vente</span>
                      }
                    } @else {
                      <span class="ef-pill ef-pill--muted">Pas de plan : demande gratuite</span>
                    }
                  </div>
                </div>
                <label class="price">
                  <input
                    class="ef-input price__input"
                    type="number"
                    min="0"
                    step="0.5"
                    inputmode="decimal"
                    placeholder="100"
                    [attr.aria-label]="'Prix annuel en dinars pour ' + l.name"
                    [ngModel]="draft(l.code).price"
                    (ngModelChange)="setDraft(l.code, { price: $event })"
                  />
                  <span class="price__unit">DT / an</span>
                </label>
                <label class="toggle">
                  <input type="checkbox" [ngModel]="draft(l.code).active" (ngModelChange)="setDraft(l.code, { active: $event })" />
                  En vente
                </label>
                <button
                  type="button"
                  class="ef-cta save"
                  [disabled]="!changed(l.code) || saving() === l.code"
                  (click)="savePlan(l.code)"
                >
                  {{ saving() === l.code ? '…' : 'Enregistrer' }}
                </button>
              </div>
            }
          </div>
        </section>

        <section class="block">
          <h2 class="block__title">Où vos élèves paient</h2>
          <p class="block__hint">Affiché sur le formulaire « Demander un accès » quand l'élève choisit D17 ou le virement.</p>
          <div class="grid">
            <label class="field">
              <span>Numéro D17</span>
              <input class="ef-input" [(ngModel)]="payment.d17Number" placeholder="Ex. 22 123 456" maxlength="40" />
            </label>
            <label class="field">
              <span>Titulaire</span>
              <input class="ef-input" [(ngModel)]="payment.accountHolder" placeholder="Votre nom ou celui du centre" maxlength="120" />
            </label>
            <label class="field">
              <span>Banque</span>
              <input class="ef-input" [(ngModel)]="payment.bankName" placeholder="Ex. BIAT" maxlength="120" />
            </label>
            <label class="field">
              <span>RIB</span>
              <input class="ef-input" [(ngModel)]="payment.rib" placeholder="20 chiffres" maxlength="40" />
            </label>
            <label class="field field--wide">
              <span>Consignes (facultatif)</span>
              <textarea class="ef-input" rows="2" [(ngModel)]="payment.instructions" maxlength="1000" placeholder="Ex. Indiquez le nom de l'élève dans le motif du virement."></textarea>
            </label>
          </div>
          <div class="foot">
            <button type="button" class="ef-cta" [disabled]="savingPayment()" (click)="savePayment()">
              {{ savingPayment() ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .block { margin-bottom: 22px; padding: 18px; border-radius: var(--ef-radius-lg); background: var(--ef-surface); border: 1px solid var(--ef-border); }
    .block__title { font-family: var(--ef-font-display); font-size: 15px; font-weight: 800; color: var(--ef-text); }
    .block__hint { margin-top: 4px; font-size: 12.5px; line-height: 1.55; color: var(--ef-text-muted); }
    .list { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; background: var(--ef-surface-2); flex-wrap: wrap; }
    .row__main { flex: 1; min-width: 180px; }
    .name { font-size: 13.5px; font-weight: 700; color: var(--ef-text); }
    .state { margin-top: 4px; }
    .ef-pill--muted { color: var(--ef-text-muted); background: var(--ef-surface); border: 1px solid var(--ef-border); }
    .price { display: flex; align-items: center; gap: 6px; }
    .price__input { width: 96px; text-align: right; }
    .price__unit { font-size: 12px; font-weight: 700; color: var(--ef-text-muted); white-space: nowrap; }
    .toggle { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: var(--ef-text); cursor: pointer; }
    .toggle input { accent-color: var(--ef-brand-600); }
    .save { padding: 8px 14px; }
    .save:disabled { opacity: 0.5; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
    .field { display: grid; gap: 5px; font-size: 12px; font-weight: 700; color: var(--ef-text-muted); }
    .field--wide { grid-column: 1 / -1; }
    .foot { display: flex; justify-content: flex-end; margin-top: 14px; }
    @media (max-width: 640px) {
      .grid { grid-template-columns: 1fr; }
      .row__main { flex-basis: 100%; }
    }
  `,
})
export class SubscriptionsPageComponent {
  private readonly api = inject(SubscriptionsApi);
  private readonly toast = inject(ToastService);
  private readonly catalog = inject(LevelCatalog);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly levels = computed<SchoolLevel[]>(() => this.catalog.active());
  protected readonly plans = signal<Plan[]>([]);
  private readonly drafts = signal<Record<string, Draft>>({});
  protected readonly loading = signal(true);
  protected readonly saving = signal<string | null>(null);
  protected readonly savingPayment = signal(false);
  protected payment: PaymentSettings = { ...EMPTY_PAYMENT };

  constructor() {
    this.api.plans().subscribe({
      next: (list) => {
        this.plans.set(list);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.toast.error(e.detail);
        this.loading.set(false);
      },
    });
    this.api.paymentSettings().subscribe({
      next: (p) => {
        // A plain object for ngModel: tell OnPush the fields changed
        this.payment = { ...p };
        this.cdr.markForCheck();
      },
    });
  }

  protected planOf(level: string): Plan | undefined {
    return this.plans().find((p) => p.level === level);
  }

  protected price(value: number): string {
    return formatDinars(value);
  }

  /** The row as edited, or as saved when untouched. */
  protected draft(level: string): Draft {
    const edited = this.drafts()[level];
    if (edited) {
      return edited;
    }
    const plan = this.planOf(level);
    return { price: plan ? String(plan.price) : '', active: plan ? plan.active : true };
  }

  protected setDraft(level: string, change: Partial<Draft>): void {
    const next = { ...this.draft(level), ...change };
    this.drafts.update((all) => ({ ...all, [level]: { price: String(next.price ?? ''), active: next.active } }));
  }

  protected changed(level: string): boolean {
    const edited = this.drafts()[level];
    if (!edited || edited.price === '') {
      return false;
    }
    const plan = this.planOf(level);
    return !plan || Number(edited.price) !== plan.price || edited.active !== plan.active;
  }

  protected savePlan(level: string): void {
    const d = this.draft(level);
    const price = Number(d.price);
    if (!Number.isFinite(price) || price < 0) {
      this.toast.error('Entrez un prix valide, en dinars.');
      return;
    }
    this.saving.set(level);
    this.api.savePlan(level, { price, active: d.active }).subscribe({
      next: (saved) => {
        this.saving.set(null);
        this.plans.update((list) => [...list.filter((p) => p.level !== level), saved]);
        this.drafts.update((all) => {
          const { [level]: _done, ...rest } = all;
          return rest;
        });
        this.toast.success(`${saved.levelName} : ${formatDinars(saved.price)} / an${saved.active ? '' : ' (pas en vente)'}`);
      },
      error: (e: ApiError) => {
        this.saving.set(null);
        this.toast.error(e.detail);
      },
    });
  }

  protected savePayment(): void {
    this.savingPayment.set(true);
    this.api.savePaymentSettings(this.payment).subscribe({
      next: (saved) => {
        this.savingPayment.set(false);
        this.payment = { ...saved };
        this.cdr.markForCheck();
        this.toast.success('Coordonnées de paiement enregistrées');
      },
      error: (e: ApiError) => {
        this.savingPayment.set(false);
        this.toast.error(e.detail);
      },
    });
  }
}
