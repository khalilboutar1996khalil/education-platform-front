import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, catchError, debounceTime, switchMap, tap } from 'rxjs';
import { ApiError } from '../../core/models/api.model';
import { User, UserStatus } from '../../core/models/user.model';
import { LevelService } from '../../core/services/level.service';
import { ToastService } from '../../core/services/toast.service';
import { PagerComponent } from '../../shared/ui/pager.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CredentialsDialogComponent } from './credentials-dialog.component';
import { InviteFormComponent } from './invite-form.component';
import { StudentsApi } from './students.api';
import { InviteStudentResponse, USER_STATUS_LABELS, USER_STATUS_PILL } from './students.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'ef-student-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SpinnerComponent, PagerComponent, InviteFormComponent, CredentialsDialogComponent],
  template: `
    <div class="ef-filters">
      <div class="ef-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        <input [ngModel]="query()" (ngModelChange)="setQuery($event)" placeholder="Rechercher par nom ou e-mail…" />
      </div>
      <select class="ef-select" [ngModel]="status()" (ngModelChange)="setStatus($event)">
        <option [ngValue]="null">Tous les statuts</option>
        @for (s of statuses; track s) {
          <option [ngValue]="s">{{ label(s) }}</option>
        }
      </select>
      <button type="button" class="ef-cta" (click)="inviting.set(true)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
        Inviter un élève
      </button>
    </div>

    @if (loading() && !students().length) {
      <div class="ef-loading"><ef-spinner [size]="26" /></div>
    } @else if (error()) {
      <div class="ef-empty">
        <div class="ef-empty__title">Impossible de charger les élèves</div>
        <div class="ef-empty__text">{{ error() }}</div>
        <button type="button" class="ef-soft-btn" (click)="retry()">Réessayer</button>
      </div>
    } @else if (!students().length) {
      <div class="ef-empty">
        @if (query() || status()) {
          <div class="ef-empty__title">Aucun élève ne correspond</div>
          <div class="ef-empty__text">Ajustez votre recherche ou le filtre de statut.</div>
        } @else {
          <div class="ef-empty__title">Aucun élève en {{ levelLabel() }}</div>
          <div class="ef-empty__text">Invitez un élève, ou partagez le code de classe pour qu'il demande l'accès.</div>
          <button type="button" class="ef-soft-btn" (click)="inviting.set(true)">Inviter un élève</button>
        }
      </div>
    } @else {
      <div class="table" [class.table--busy]="loading()">
        @for (u of students(); track u.id) {
          <div class="row">
            <div class="avatar">{{ u.initials }}</div>
            <div class="who">
              <div class="who__name">{{ u.fullName }}</div>
              <div class="who__mail">{{ u.email }}</div>
            </div>
            <span class="ef-pill" [class]="pill(u.status)">{{ label(u.status) }}</span>
            <button type="button" class="key" title="Nouveau mot de passe" [attr.aria-label]="'Nouveau mot de passe pour ' + u.fullName" [disabled]="busy() === u.id" (click)="resetPassword(u)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="4.5" /><path d="M10.7 12.3 21 2M16 7l3 3M18 5l2 2" /></svg>
            </button>
            <select class="ef-select act" [value]="u.status" [disabled]="busy() === u.id" (change)="change(u, $event)" aria-label="Changer le statut">
              @for (s of statuses; track s) {
                <option [value]="s">{{ label(s) }}</option>
              }
            </select>
          </div>
        }
      </div>
      <ef-pager [page]="page()" [totalPages]="totalPages()" (go)="page.set($event)" />
    }

    @if (inviting()) {
      <ef-invite-form [defaultLevel]="levels.current()" (closed)="inviting.set(false)" (invited)="invited($event)" />
    }
    @if (created(); as c) {
      <ef-credentials-dialog [heading]="c.heading" [name]="c.user.fullName" [email]="c.user.email" [password]="c.temporaryPassword" (closed)="created.set(null)" />
    }
  `,
  styles: `
    .table { display: flex; flex-direction: column; gap: 8px; transition: opacity 0.2s; }
    .table--busy { opacity: 0.55; }
    .row {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border-radius: 14px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      animation: ef-fade-up 0.35s ease backwards;
    }
    .avatar {
      width: 38px;
      height: 38px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 12.5px;
      font-weight: 800;
      color: #fff;
      background: var(--ef-gradient-brand);
    }
    .who { flex: 1; min-width: 0; }
    .who__name { font-size: 13.5px; font-weight: 700; color: var(--ef-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .who__mail { font-size: 11.5px; color: var(--ef-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .act { height: 32px; font-size: 12px; }
    .key { width: 32px; height: 32px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 9px; color: var(--ef-text-muted); background: var(--ef-surface-2); }
    .key:hover:not(:disabled) { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .key:disabled { opacity: 0.6; }
    @media (max-width: 640px) {
      .row { flex-wrap: wrap; }
      .who { flex-basis: calc(100% - 60px); }
    }
  `,
})
export class StudentListComponent {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(StudentsApi);
  private readonly toast = inject(ToastService);
  protected readonly levels = inject(LevelService);

  /** Lets the page know a student was added, so counters elsewhere stay right. */
  readonly changed = output<void>();

  protected readonly statuses: UserStatus[] = ['ACTIVE', 'PAUSED', 'DISABLED'];

  protected readonly query = signal('');
  protected readonly status = signal<UserStatus | null>(null);
  protected readonly page = signal(0);
  private readonly reload = signal(0);

  protected readonly students = signal<User[]>([]);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<number | null>(null);
  protected readonly inviting = signal(false);
  protected readonly created = signal<(InviteStudentResponse & { heading: string }) | null>(null);

  protected readonly levelLabel = computed(() => this.catalog.label(this.levels.current()));

  private readonly criteria = computed(() => ({
    level: this.levels.current(),
    status: this.status(),
    search: this.query().trim(),
    page: this.page(),
    reload: this.reload(),
  }));

  constructor() {
    // Created before the request stream so a level switch resets the page first.
    effect(() => {
      this.levels.current();
      untracked(() => this.page.set(0));
    });

    toObservable(this.criteria)
      .pipe(
        debounceTime(200),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((c) =>
          this.api.students({ level: c.level, status: c.status, search: c.search, page: c.page, size: PAGE_SIZE }).pipe(
            catchError((e: ApiError) => {
              this.error.set(e.detail);
              this.students.set([]);
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.students.set(result.content);
        this.totalPages.set(result.totalPages);
        this.loading.set(false);
      });
  }

  protected setQuery(value: string): void {
    this.query.set(value);
    this.page.set(0);
  }

  protected setStatus(value: UserStatus | null): void {
    this.status.set(value);
    this.page.set(0);
  }

  protected retry(): void {
    this.reload.update((n) => n + 1);
  }

  protected label(s: UserStatus): string {
    return USER_STATUS_LABELS[s];
  }

  protected pill(s: UserStatus): string {
    return USER_STATUS_PILL[s];
  }

  protected change(user: User, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const next = select.value as UserStatus;
    if (next === user.status) {
      return;
    }
    if (next === 'DISABLED' && !confirm(`Désactiver le compte de ${user.fullName} ? Ses sessions en cours seront fermées.`)) {
      select.value = user.status;
      return;
    }
    this.busy.set(user.id);
    this.api.setStatus(user.id, next).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.students.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
        this.toast.success(`${updated.fullName} : ${USER_STATUS_LABELS[updated.status].toLowerCase()}`);
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        select.value = user.status;
        this.toast.error(e.detail);
      },
    });
  }

  protected resetPassword(user: User): void {
    if (!confirm(`Créer un nouveau mot de passe pour ${user.fullName} ? L'ancien ne fonctionnera plus et ses sessions en cours seront fermées.`)) {
      return;
    }
    this.busy.set(user.id);
    this.api.resetPassword(user.id).subscribe({
      next: (result) => {
        this.busy.set(null);
        this.created.set({ ...result, heading: 'Nouveau mot de passe' });
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        this.toast.error(e.detail);
      },
    });
  }

  protected invited(result: InviteStudentResponse): void {
    this.inviting.set(false);
    this.created.set({ ...result, heading: 'Compte créé' });
    this.changed.emit();
    this.reload.update((n) => n + 1);
  }
}
