import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiError } from '../../core/models/api.model';
import { SchoolLevel } from '../../core/models/level.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';
import { ToastService } from '../../core/services/toast.service';
import { LevelFormComponent } from './level-form.component';

/** Admin: the class years offered on the platform. Every level selector reads this list. */
@Component({
  selector: 'ef-levels-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LevelFormComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Niveaux</div>
          <div class="ef-page-sub">Les années proposées sur la plateforme, dans l'ordre d'affichage</div>
        </div>
        <button type="button" class="ef-cta" (click)="editing.set('new')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nouveau niveau
        </button>
      </div>

      @if (!catalog.all().length) {
        <div class="ef-empty">
          <div class="ef-empty__title">Aucun niveau</div>
          <div class="ef-empty__text">Créez un premier niveau pour pouvoir y rattacher des modules et des élèves.</div>
          <button type="button" class="ef-soft-btn" (click)="reload()">Réessayer</button>
        </div>
      } @else {
        <div class="list">
          @for (l of catalog.all(); track l.id) {
            <div class="row" [class.row--off]="!l.active">
              <span class="pos">{{ l.position }}</span>
              <div class="row__main">
                <div class="name">{{ l.name }}</div>
                <code class="code">{{ l.code }}</code>
              </div>
              <span class="ef-pill" [class]="l.active ? 'ef-pill--green' : 'ef-pill--red'">{{ l.active ? 'Ouvert' : 'Fermé' }}</span>
              <button type="button" class="btn" (click)="editing.set(l)">Modifier</button>
              <button type="button" class="btn" [class.btn--danger]="l.active" [disabled]="busy() === l.id" (click)="toggle(l)">
                {{ l.active ? 'Fermer' : 'Rouvrir' }}
              </button>
            </div>
          }
        </div>
        <div class="foot">
          Un niveau fermé n'accepte plus de nouveaux élèves, modules ou codes de classe. Ce qui y est déjà rattaché reste intact.
        </div>
      }
    </div>

    @if (editing(); as e) {
      <ef-level-form [level]="e === 'new' ? null : e" (closed)="editing.set(null)" (saved)="saved($event)" />
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
    .pos { min-width: 28px; font-size: 12px; font-weight: 700; color: var(--ef-text-subtle); }
    .name { font-family: var(--ef-font-display); font-size: 15px; font-weight: 800; color: var(--ef-ink-green); }
    .code { font-size: 12px; color: var(--ef-text-muted); }
    .btn { padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 700; color: var(--ef-text-muted); background: var(--ef-surface-2); }
    .btn:hover:not(:disabled) { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .btn--danger:hover:not(:disabled) { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    .btn:disabled { opacity: 0.6; }
    .foot { margin-top: 12px; font-size: 12px; color: var(--ef-text-subtle); }
    @media (max-width: 560px) { .row { flex-wrap: wrap; } }
  `,
})
export class LevelsPageComponent {
  protected readonly catalog = inject(LevelCatalog);
  private readonly toast = inject(ToastService);

  protected readonly editing = signal<SchoolLevel | 'new' | null>(null);
  protected readonly busy = signal<number | null>(null);

  protected reload(): void {
    this.catalog.load().subscribe();
  }

  protected saved(level: SchoolLevel): void {
    this.toast.success(this.editing() === 'new' ? `Niveau « ${level.name} » créé` : 'Niveau enregistré');
    this.editing.set(null);
    this.reload();
  }

  protected toggle(l: SchoolLevel): void {
    if (l.active && !confirm(`Fermer « ${l.name} » ? Il ne sera plus proposé aux nouveaux élèves.`)) {
      return;
    }
    this.busy.set(l.id);
    this.catalog.setActive(l.id, !l.active).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success(l.active ? 'Niveau fermé' : 'Niveau rouvert');
        this.reload();
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        this.toast.error(e.detail);
      },
    });
  }
}
