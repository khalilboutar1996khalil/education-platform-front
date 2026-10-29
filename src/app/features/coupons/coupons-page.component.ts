import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiError } from '../../core/models/api.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/ui/modal.component';
import { CouponBatchFormComponent } from './coupon-batch-form.component';
import { PageFormat, activationUrl, buildCouponPdf } from './coupon-pdf';
import { CouponsApi } from './coupons.api';
import { Coupon, CouponBatch, formatCode } from './coupons.model';

/**
 * Admin: the coupons printed in the books. A batch is one print run for one level; its PDF has a
 * page per copy, with the QR code and the activation code to cover with a scratch-off sticker.
 */
@Component({
  selector: 'ef-coupons-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ModalComponent, CouponBatchFormComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Coupons des livres</div>
          <div class="ef-page-sub">Un QR code et un code à gratter par exemplaire : l'acheteur active son livre et rejoint son niveau</div>
        </div>
        <button type="button" class="ef-cta" (click)="creating.set(true)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nouveau lot
        </button>
      </div>

      <div class="how">
        <div class="how__step"><span>1</span>Créez un lot : niveau et nombre d'exemplaires</div>
        <div class="how__step"><span>2</span>Téléchargez le PDF et imprimez une page par livre</div>
        <div class="how__step"><span>3</span>Collez un autocollant à gratter sur le code</div>
      </div>

      <div class="toolbar">
        <label class="fmt">
          Format des pages
          <select class="ef-select" [value]="format()" (change)="format.set($any($event.target).value)">
            <option value="a4">A4</option>
            <option value="a5">A5</option>
          </select>
        </label>
      </div>

      @if (loading() && !batches().length) {
        <div class="ef-empty"><div class="ef-empty__text">Chargement…</div></div>
      } @else if (!batches().length) {
        <div class="ef-empty">
          <div class="ef-empty__title">Aucun lot pour l'instant</div>
          <div class="ef-empty__text">Créez un lot pour générer les QR codes de vos livres.</div>
          <button type="button" class="ef-soft-btn" (click)="creating.set(true)">Créer un lot</button>
        </div>
      } @else {
        <div class="list">
          @for (b of batches(); track b.id) {
            <div class="row">
              <div class="row__main">
                <div class="name">{{ b.label || catalog.label(b.level) }}</div>
                <div class="meta">
                  Lot n° {{ b.id }} · {{ catalog.label(b.level) }} · créé le {{ b.createdAt | date: 'd MMM y' }}
                </div>
              </div>
              <div class="usage" [attr.aria-label]="b.redeemed + ' activés sur ' + b.quantity">
                <div class="usage__num"><strong>{{ b.redeemed }}</strong> / {{ b.quantity }} activés</div>
                <div class="bar"><div class="bar__fill" [style.width.%]="(b.redeemed / b.quantity) * 100"></div></div>
              </div>
              <button type="button" class="btn" (click)="open(b)">Voir les codes</button>
              <button type="button" class="btn btn--primary" [disabled]="printing() === b.id" (click)="download(b)">
                {{ printing() === b.id ? 'PDF en cours…' : 'Télécharger le PDF' }}
              </button>
            </div>
          }
        </div>
        <div class="foot">
          Le QR code mène à {{ siteHost }}/activer. Une fois les livres imprimés, cette adresse ne pourra plus changer.
        </div>
      }
    </div>

    @if (creating()) {
      <ef-coupon-batch-form (closed)="creating.set(false)" (saved)="created($event)" />
    }

    @if (viewing(); as b) {
      <ef-modal [heading]="b.label || catalog.label(b.level)" [subtitle]="'Lot n° ' + b.id + ' · ' + b.quantity + ' exemplaires'" [wide]="true" (closed)="viewing.set(null)">
        <div class="filters">
          @for (f of filters; track f.value) {
            <button type="button" class="chip" [class.chip--on]="filter() === f.value" (click)="filter.set(f.value)">{{ f.label }}</button>
          }
          <span class="count">{{ shown().length }} coupon(s)</span>
        </div>
        @if (!coupons().length) {
          <div class="ef-empty__text">Chargement…</div>
        } @else {
          <div class="codes">
            <div class="codes__head">
              <span>N° du livre</span><span>Code</span><span>État</span><span>Élève</span>
            </div>
            @for (c of shown(); track c.id) {
              <div class="codes__row">
                <span class="serial">{{ c.serial }}</span>
                <code>{{ code(c.code) }}</code>
                <span class="ef-pill" [class]="c.redeemed ? 'ef-pill--green' : 'ef-pill--amber'">{{ c.redeemed ? 'Activé' : 'Libre' }}</span>
                <span class="who">
                  @if (c.redeemed) {
                    {{ c.redeemedByName }} <small>{{ c.redeemedByUsername }} · {{ c.redeemedAt | date: 'd MMM y' }}</small>
                  } @else {
                    —
                  }
                </span>
              </div>
            }
          </div>
        }
      </ef-modal>
    }
  `,
  styles: `
    .how { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
    .how__step { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; background: var(--ef-tint-green); color: var(--ef-ink-green); font-size: 13px; font-weight: 600; }
    .how__step span { flex: none; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; background: var(--ef-surface); font-weight: 800; }
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 10px; }
    .fmt { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--ef-text-muted); }
    .list { display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px; background: var(--ef-surface); border: 1px solid var(--ef-border); animation: ef-fade-up 0.35s ease backwards; }
    .row__main { flex: 1; min-width: 0; }
    .name { font-family: var(--ef-font-display); font-size: 15px; font-weight: 800; color: var(--ef-ink-green); }
    .meta { font-size: 12px; color: var(--ef-text-muted); }
    .usage { width: 150px; }
    .usage__num { font-size: 12px; color: var(--ef-text-muted); margin-bottom: 5px; }
    .usage__num strong { color: var(--ef-text); }
    .bar { height: 6px; border-radius: 99px; background: var(--ef-surface-2); overflow: hidden; }
    .bar__fill { height: 100%; border-radius: 99px; background: var(--ef-brand-500); }
    .btn { padding: 8px 13px; border-radius: 9px; font-size: 12px; font-weight: 700; color: var(--ef-text-muted); background: var(--ef-surface-2); white-space: nowrap; }
    .btn:hover:not(:disabled) { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .btn--primary { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .btn:disabled { opacity: 0.6; }
    .foot { margin-top: 12px; font-size: 12px; color: var(--ef-text-subtle); }
    .filters { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .chip { padding: 6px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; color: var(--ef-text-muted); background: var(--ef-surface-2); }
    .chip--on { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .count { margin-left: auto; font-size: 12px; color: var(--ef-text-subtle); }
    .codes { display: flex; flex-direction: column; font-size: 13px; }
    .codes__head, .codes__row { display: grid; grid-template-columns: 90px 120px 80px 1fr; gap: 12px; align-items: center; padding: 9px 4px; }
    .codes__head { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ef-text-subtle); border-bottom: 1px solid var(--ef-border); }
    .codes__row { border-bottom: 1px solid var(--ef-border); }
    .serial { font-weight: 700; color: var(--ef-text); }
    code { font-family: var(--ef-font-display); font-weight: 700; letter-spacing: 0.06em; color: var(--ef-ink-green); }
    .who small { display: block; color: var(--ef-text-subtle); }
    @media (max-width: 720px) {
      .how { grid-template-columns: 1fr; }
      .row { flex-wrap: wrap; }
      .usage { width: 100%; order: 3; }
      .codes__head { display: none; }
      .codes__row { grid-template-columns: 80px 1fr auto; }
      .who { grid-column: 1 / -1; }
    }
  `,
})
export class CouponsPageComponent implements OnInit {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(CouponsApi);
  private readonly toast = inject(ToastService);

  protected readonly batches = signal<CouponBatch[]>([]);
  protected readonly loading = signal(false);
  protected readonly creating = signal(false);
  protected readonly printing = signal<number | null>(null);
  protected readonly format = signal<PageFormat>('a4');

  protected readonly viewing = signal<CouponBatch | null>(null);
  protected readonly coupons = signal<Coupon[]>([]);
  protected readonly filter = signal<'all' | 'used' | 'free'>('all');
  protected readonly filters = [
    { value: 'all' as const, label: 'Tous' },
    { value: 'used' as const, label: 'Activés' },
    { value: 'free' as const, label: 'Libres' },
  ];
  protected readonly shown = computed(() => {
    const f = this.filter();
    return this.coupons().filter((c) => f === 'all' || (f === 'used') === c.redeemed);
  });

  protected readonly siteHost = new URL(activationUrl('x')).host;

  ngOnInit(): void {
    this.load();
  }

  protected code(value: string): string {
    return formatCode(value);
  }

  protected created(batch: CouponBatch): void {
    this.creating.set(false);
    this.toast.success(`${batch.quantity} coupons générés. Téléchargez le PDF pour les imprimer.`);
    this.load();
  }

  protected open(batch: CouponBatch): void {
    this.viewing.set(batch);
    this.filter.set('all');
    this.coupons.set([]);
    this.api.listCoupons(batch.id).subscribe({
      next: (list) => this.coupons.set(list),
      error: (e: ApiError) => {
        this.viewing.set(null);
        this.toast.error(e.detail);
      },
    });
  }

  protected download(batch: CouponBatch): void {
    this.printing.set(batch.id);
    this.api.listCoupons(batch.id).subscribe({
      next: async (list) => {
        try {
          const blob = await buildCouponPdf(list, this.catalog.label(batch.level), this.format());
          saveFile(blob, `coupons-lot-${batch.id}-${this.format()}.pdf`);
        } catch {
          this.toast.error('Le PDF n’a pas pu être créé. Réessayez.');
        } finally {
          this.printing.set(null);
        }
      },
      error: (e: ApiError) => {
        this.printing.set(null);
        this.toast.error(e.detail);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.listBatches().subscribe({
      next: (page) => {
        this.batches.set(page.content);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.loading.set(false);
        this.toast.error(e.detail);
      },
    });
  }
}

function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
