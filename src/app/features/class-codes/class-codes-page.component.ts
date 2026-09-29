import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiError } from '../../core/models/api.model';
import { LEVEL_LABELS } from '../../core/models/user.model';
import { LevelService } from '../../core/services/level.service';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { ClassCodeFormComponent } from './class-code-form.component';
import { ClassCodesApi } from './class-codes.api';
import { ClassCode } from './class-codes.model';

@Component({
  selector: 'ef-class-codes-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SpinnerComponent, ClassCodeFormComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Codes de classe</div>
          <div class="ef-page-sub">Les codes que les élèves présentent pour s'inscrire · {{ levelLabel() }}</div>
        </div>
        <button type="button" class="ef-cta" (click)="creating.set(true)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nouveau code
        </button>
      </div>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Impossible de charger les codes</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
        </div>
      } @else if (!visible().length) {
        <div class="ef-empty">
          <div class="ef-empty__title">Aucun code pour ce niveau</div>
          <div class="ef-empty__text">Créez un code et donnez-le à vos élèves : ils en ont besoin pour demander l'accès.</div>
          <button type="button" class="ef-soft-btn" (click)="creating.set(true)">Créer un code</button>
        </div>
      } @else {
        <div class="list">
          @for (c of visible(); track c.id) {
            <div class="row" [class.row--off]="!c.active">
              <div class="row__main">
                <code class="code">{{ c.code }}</code>
                <div class="row__label">{{ c.label || 'Sans libellé' }}</div>
              </div>
              <span class="ef-pill" [class]="c.active ? 'ef-pill--green' : 'ef-pill--red'">{{ c.active ? 'Actif' : 'Désactivé' }}</span>
              <button type="button" class="btn" (click)="copy(c)">Copier</button>
              @if (c.active) {
                <button type="button" class="btn btn--danger" [disabled]="busy() === c.id" (click)="deactivate(c)">Désactiver</button>
              }
            </div>
          }
        </div>
        <div class="foot">Désactiver un code n'affecte pas les comptes déjà inscrits avec lui.</div>
      }
    </div>

    @if (creating()) {
      <ef-class-code-form [defaultLevel]="levels.current()" (closed)="creating.set(false)" (saved)="created($event)" />
    }
  `,
  styles: `
    .list { display: flex; flex-direction: column; gap: 8px; }
    .row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      border-radius: 14px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      animation: ef-fade-up 0.35s ease backwards;
    }
    .row--off { opacity: 0.6; }
    .row__main { flex: 1; min-width: 0; }
    .code { font-family: var(--ef-font-display); font-size: 16px; font-weight: 800; letter-spacing: 0.05em; color: var(--ef-ink-green); user-select: all; }
    .row__label { font-size: 12px; color: var(--ef-text-muted); margin-top: 2px; }
    .btn { padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 700; color: var(--ef-text-muted); background: var(--ef-surface-2); }
    .btn:hover:not(:disabled) { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .btn--danger:hover:not(:disabled) { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    .btn:disabled { opacity: 0.6; }
    .foot { margin-top: 12px; font-size: 12px; color: var(--ef-text-subtle); }
    @media (max-width: 560px) { .row { flex-wrap: wrap; } }
  `,
})
export class ClassCodesPageComponent {
  private readonly api = inject(ClassCodesApi);
  private readonly toast = inject(ToastService);
  protected readonly levels = inject(LevelService);

  private readonly codes = signal<ClassCode[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<number | null>(null);
  protected readonly creating = signal(false);

  protected readonly levelLabel = computed(() => LEVEL_LABELS[this.levels.current()]);
  protected readonly visible = computed(() => this.codes().filter((c) => c.level === this.levels.current()));

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list().subscribe({
      next: (list) => {
        this.codes.set(list);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail);
        this.loading.set(false);
      },
    });
  }

  protected created(code: ClassCode): void {
    this.creating.set(false);
    this.toast.success(`Code ${code.code} créé`);
    if (code.level !== this.levels.current()) {
      this.levels.current.set(code.level);
    }
    this.load();
  }

  protected async copy(c: ClassCode): Promise<void> {
    try {
      await navigator.clipboard.writeText(c.code);
      this.toast.success('Code copié');
    } catch {
      this.toast.error('Copie impossible : sélectionnez le code à la main');
    }
  }

  protected deactivate(c: ClassCode): void {
    if (!confirm(`Désactiver le code ${c.code} ? Il ne permettra plus de s'inscrire.`)) {
      return;
    }
    this.busy.set(c.id);
    this.api.deactivate(c.id).subscribe({
      next: (updated) => {
        this.busy.set(null);
        this.codes.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        this.toast.success('Code désactivé');
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        this.toast.error(e.detail);
      },
    });
  }
}
