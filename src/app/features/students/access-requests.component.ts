import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';

import { ToastService } from '../../core/services/toast.service';
import { PagerComponent } from '../../shared/ui/pager.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CredentialsDialogComponent } from './credentials-dialog.component';
import { RejectDialogComponent } from './reject-dialog.component';
import { StudentsApi } from './students.api';
import {
  AccessRequest,
  AccessRequestStatus,
  PAYMENT_METHOD_LABELS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_PILL,
} from './students.model';
import { formatDay, formatDinars, formatDuration } from '../subscriptions/subscriptions.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'ef-access-requests',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, SpinnerComponent, PagerComponent, CredentialsDialogComponent, RejectDialogComponent],
  template: `
    <div class="ef-filters">
      <select class="ef-select" [ngModel]="status()" (ngModelChange)="setStatus($event)">
        <option [ngValue]="null">Toutes les demandes</option>
        @for (s of statuses; track s) {
          <option [ngValue]="s">{{ statusLabel(s) }}</option>
        }
      </select>
    </div>

    @if (loading()) {
      <div class="ef-loading"><ef-spinner [size]="26" /></div>
    } @else if (error()) {
      <div class="ef-empty">
        <div class="ef-empty__title">Impossible de charger les demandes</div>
        <div class="ef-empty__text">{{ error() }}</div>
        <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
      </div>
    } @else if (!requests().length) {
      <div class="ef-empty">
        <div class="ef-empty__title">{{ status() === 'PENDING' ? 'Aucune demande en attente' : 'Aucune demande' }}</div>
        <div class="ef-empty__text">Les demandes envoyées depuis la page d'accueil apparaîtront ici.</div>
      </div>
    } @else {
      <div class="list">
        @for (r of requests(); track r.id) {
          <div class="card">
            <div class="card__top">
              <div class="who">
                <div class="who__name">{{ r.fullName }}</div>
                <div class="who__mail">{{ r.email }}</div>
              </div>
              @if (r.renewal) {
                <span class="ef-pill ef-pill--blue">Renouvellement</span>
              }
              <span class="ef-pill ef-pill--green">{{ level(r) }}</span>
              <span class="ef-pill" [class]="pill(r.status)">{{ statusLabel(r.status) }}</span>
            </div>
            @if (r.price != null) {
              <div class="pay">
                <span class="pay__plan">Abonnement {{ duration(r.durationDays) }} · <b>{{ price(r.price) }}</b></span>
                <span class="pay__sep">·</span>
                <span>
                  {{ method(r) }}
                  @if (r.paymentReference) {
                    — réf. <b class="pay__ref">{{ r.paymentReference }}</b>
                  }
                </span>
                @if (r.receiptName) {
                  <button type="button" class="pay__receipt" [disabled]="opening() === r.id" (click)="openReceipt(r)">
                    {{ opening() === r.id ? 'Ouverture…' : '📎 Voir le reçu' }}
                  </button>
                } @else {
                  <span class="pay__none">pas de reçu joint</span>
                }
                @if (r.status === 'PENDING') {
                  <span class="pay__check">Vérifiez ce paiement avant d'accepter</span>
                }
              </div>
            } @else {
              <div class="free">Demande sans abonnement (aucun plan pour ce niveau)</div>
            }
            @if (r.status === 'APPROVED' && r.createdUser?.accessUntil) {
              <div class="until">Accès jusqu'au {{ day(r.createdUser?.accessUntil) }}</div>
            }
            @if (r.message) {
              <div class="msg">« {{ r.message }} »</div>
            }
            <div class="card__foot">
              <div class="date">
                Reçue le {{ r.submittedAt | date: 'd MMM y, HH:mm' }}
                @if (r.reviewedBy) { · traitée par {{ r.reviewedBy.fullName }} }
              </div>
              @if (r.status === 'PENDING') {
                <div class="actions">
                  <button type="button" class="btn btn--no" [disabled]="busy() === r.id" (click)="rejecting.set(r)">Refuser</button>
                  <button type="button" class="ef-cta btn-yes" [disabled]="busy() === r.id" (click)="approve(r)">
                    {{ busy() === r.id ? 'Validation…' : r.renewal ? 'Accepter et prolonger' : 'Accepter' }}
                  </button>
                </div>
              }
            </div>
            @if (r.decisionNote) {
              <div class="note">Note : {{ r.decisionNote }}</div>
            }
          </div>
        }
      </div>
      <ef-pager [page]="page()" [totalPages]="totalPages()" (go)="go($event)" />
    }

    @if (rejecting(); as r) {
      <ef-reject-dialog [request]="r" (closed)="rejecting.set(null)" (rejected)="rejected()" />
    }
    @if (approved(); as a) {
      <ef-credentials-dialog
        heading="Demande acceptée"
        [name]="a.request.fullName"
        [email]="a.request.email"
        [password]="a.password"
        (closed)="approved.set(null)"
      />
    }
  `,
  styles: `
    .list { display: flex; flex-direction: column; gap: 10px; }
    .card { padding: 16px 18px; border-radius: 14px; background: var(--ef-surface); border: 1px solid var(--ef-border); animation: ef-fade-up 0.35s ease backwards; }
    .card__top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .who { flex: 1; min-width: 180px; }
    .who__name { font-size: 14px; font-weight: 700; color: var(--ef-text); }
    .who__mail { font-size: 12px; color: var(--ef-text-muted); }
    .msg { margin-top: 10px; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; line-height: 1.55; font-style: italic; color: var(--ef-text-muted); background: var(--ef-surface-2); white-space: pre-line; }
    .card__foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
    .date { font-size: 11.5px; color: var(--ef-text-subtle); }
    .actions { display: flex; gap: 8px; }
    .btn { padding: 9px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; }
    .btn--no { color: var(--ef-text-muted); background: var(--ef-surface-2); }
    .btn--no:hover:not(:disabled) { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    .btn:disabled { opacity: 0.6; }
    .btn-yes { padding: 9px 18px; }
    .note { margin-top: 10px; font-size: 12px; color: var(--ef-text-muted); }
    .pay { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin-top: 10px; padding: 9px 12px; border-radius: 10px; font-size: 12.5px; color: var(--ef-text); background: var(--ef-tint-green); }
    .pay__sep { color: var(--ef-text-subtle); }
    .pay__ref { font-family: ui-monospace, Menlo, monospace; letter-spacing: 0.02em; }
    .pay__receipt { padding: 5px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; color: #fff; background: var(--ef-brand-600); }
    .pay__receipt:disabled { opacity: 0.6; }
    .pay__none { font-size: 11.5px; color: var(--ef-text-subtle); }
    .pay__check { flex-basis: 100%; font-size: 11.5px; font-weight: 700; color: var(--ef-ink-amber); }
    .free { margin-top: 10px; font-size: 12px; color: var(--ef-text-subtle); }
    .until { margin-top: 8px; font-size: 12px; font-weight: 700; color: var(--ef-ink-green); }
  `,
})
export class AccessRequestsComponent {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(StudentsApi);
  private readonly toast = inject(ToastService);

  /** Fires after a request is decided, so the tab badge can recount. */
  readonly changed = output<void>();

  protected readonly statuses: AccessRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
  protected readonly status = signal<AccessRequestStatus | null>('PENDING');
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly requests = signal<AccessRequest[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<number | null>(null);
  protected readonly rejecting = signal<AccessRequest | null>(null);
  protected readonly approved = signal<{ request: AccessRequest; password: string } | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.accessRequests(this.status(), this.page(), PAGE_SIZE).subscribe({
      next: (p) => {
        this.requests.set(p.content);
        this.totalPages.set(p.totalPages);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail);
        this.loading.set(false);
      },
    });
  }

  protected setStatus(s: AccessRequestStatus | null): void {
    this.status.set(s);
    this.go(0);
  }

  protected go(page: number): void {
    this.page.set(page);
    this.load();
  }

  protected statusLabel(s: AccessRequestStatus): string {
    return REQUEST_STATUS_LABELS[s];
  }

  protected pill(s: AccessRequestStatus): string {
    return REQUEST_STATUS_PILL[s];
  }

  protected readonly opening = signal<number | null>(null);

  /** Fetched with the admin's session, then shown in a new tab. */
  protected openReceipt(r: AccessRequest): void {
    // Opened now, during the click, so the browser does not block it as a pop-up
    const tab = window.open('', '_blank');
    this.opening.set(r.id);
    this.api.receipt(r.id).subscribe({
      next: (blob) => {
        this.opening.set(null);
        const url = URL.createObjectURL(blob);
        if (tab) {
          tab.location.href = url;
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = r.receiptName ?? 'recu';
          link.click();
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (e: ApiError) => {
        this.opening.set(null);
        tab?.close();
        this.toast.error(e.detail ?? 'Impossible d’ouvrir le reçu');
      },
    });
  }

  protected price(value: number | null): string {
    return formatDinars(value);
  }

  protected duration(days: number | null): string {
    return formatDuration(days);
  }

  protected day(iso: string | null | undefined): string {
    return formatDay(iso);
  }

  protected method(r: AccessRequest): string {
    return r.paymentMethod ? PAYMENT_METHOD_LABELS[r.paymentMethod] : '';
  }

  protected level(r: AccessRequest): string {
    return this.catalog.short(r.level);
  }

  protected approve(r: AccessRequest): void {
    this.busy.set(r.id);
    this.api.approve(r.id).subscribe({
      next: (result) => {
        this.busy.set(null);
        if (result.temporaryPassword) {
          this.approved.set({ request: result.request, password: result.temporaryPassword });
        } else {
          // A renewal: same account, same password, a later end
          const until = formatDay(result.request.createdUser?.accessUntil);
          this.toast.success(`Abonnement de ${result.request.fullName} prolongé jusqu'au ${until}`);
        }
        this.changed.emit();
        this.load();
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        this.toast.error(e.detail);
      },
    });
  }

  protected rejected(): void {
    this.rejecting.set(null);
    this.toast.success('Demande refusée');
    this.changed.emit();
    this.load();
  }
}
