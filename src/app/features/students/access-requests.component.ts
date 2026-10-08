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
import { AccessRequest, AccessRequestStatus, REQUEST_STATUS_LABELS, REQUEST_STATUS_PILL } from './students.model';
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
              <span class="ef-pill ef-pill--green">{{ level(r) }}</span>
              <span class="ef-pill" [class]="pill(r.status)">{{ statusLabel(r.status) }}</span>
            </div>
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
                    {{ busy() === r.id ? 'Création…' : 'Accepter' }}
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
        [password]="a.temporaryPassword"
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
  protected readonly approved = signal<{ request: AccessRequest; temporaryPassword: string } | null>(null);

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

  protected level(r: AccessRequest): string {
    return this.catalog.short(r.level);
  }

  protected approve(r: AccessRequest): void {
    this.busy.set(r.id);
    this.api.approve(r.id).subscribe({
      next: (result) => {
        this.busy.set(null);
        this.approved.set(result);
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
