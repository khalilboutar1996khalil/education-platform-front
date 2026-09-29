import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api.model';
import { LEVEL_LABELS } from '../../core/models/user.model';
import { LevelService } from '../../core/services/level.service';
import { ToastService } from '../../core/services/toast.service';
import { saveBlob } from '../../shared/save-blob';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { formatSize } from '../assignments/assignments.model';
import { CoursesApi } from '../courses/courses.api';
import { CourseSummary } from '../courses/courses.model';
import { ResourceFormComponent } from './resource-form.component';
import { ResourcesApi } from './resources.api';
import { RESOURCE_LOOK, RESOURCE_SHORT, Resource, ResourceType } from './resources.model';

@Component({
  selector: 'ef-resource-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, SpinnerComponent, ResourceFormComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Bibliothèque de ressources</div>
          <div class="ef-page-sub">Supports de cours, vidéos et codes sources{{ isAdmin() ? ' · ' + levelLabel() : '' }}</div>
        </div>
        @if (isAdmin()) {
          <button type="button" class="ef-cta" (click)="form.set({ resource: null })">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.4 18.4A5 5 0 0 0 18 9h-1.3A8 8 0 1 0 3 16.3" /></svg>
            Téléverser
          </button>
        }
      </div>

      <div class="ef-filters">
        <div class="ef-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Rechercher un support…" />
        </div>
        <select class="ef-select" [ngModel]="courseFilter()" (ngModelChange)="courseFilter.set($event)">
          <option [ngValue]="null">Tous les modules</option>
          @for (c of levelCourses(); track c.id) {
            <option [ngValue]="c.id">{{ c.code }}</option>
          }
        </select>
        <select class="ef-select" [ngModel]="typeFilter()" (ngModelChange)="typeFilter.set($event)">
          <option [ngValue]="null">Tous les types</option>
          @for (t of types; track t) {
            <option [ngValue]="t">{{ short(t) }}</option>
          }
        </select>
      </div>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Impossible de charger la bibliothèque</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
        </div>
      } @else if (!visible().length) {
        <div class="ef-empty">
          @if (levelResources().length) {
            <div class="ef-empty__title">Aucune ressource ne correspond</div>
            <div class="ef-empty__text">Ajustez votre recherche ou vos filtres.</div>
            <button type="button" class="ef-soft-btn" (click)="reset()">Réinitialiser les filtres</button>
          } @else {
            <div class="ef-empty__title">La bibliothèque est vide</div>
            <div class="ef-empty__text">
              {{ isAdmin() ? 'Ajoutez des cours PDF, des vidéos ou des codes sources pour vos élèves.' : 'Les supports de cours apparaîtront ici.' }}
            </div>
            @if (isAdmin()) {
              <button type="button" class="ef-soft-btn" (click)="form.set({ resource: null })">Téléverser une ressource</button>
            }
          }
        </div>
      } @else {
        <div class="grid">
          @for (r of visible(); track r.id) {
            <div class="card">
              <div class="card__top">
                <div class="card__icon" [style.background]="look(r.type).color">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="look(r.type).icon" /></svg>
                </div>
                <div class="card__main">
                  <div class="card__name" [title]="r.title">{{ r.title }}</div>
                  <div class="card__meta">{{ meta(r) }}</div>
                </div>
                @if (isAdmin()) {
                  <div class="card__tools">
                    <button type="button" class="tool" title="Modifier" (click)="form.set({ resource: r })">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
                    </button>
                    <button type="button" class="tool tool--danger" title="Supprimer" (click)="remove(r)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
                    </button>
                  </div>
                }
              </div>
              @if (r.description) {
                <div class="card__desc">{{ r.description }}</div>
              }
              <div class="card__actions">
                @if (r.type === 'LINK') {
                  <a class="btn" [href]="r.externalUrl" target="_blank" rel="noopener">Ouvrir le lien ↗</a>
                } @else {
                  <button type="button" class="btn" [disabled]="busy() === r.id" (click)="preview(r)">
                    {{ r.type === 'VIDEO' ? 'Regarder' : 'Aperçu' }}
                  </button>
                  <button type="button" class="btn" [disabled]="busy() === r.id" (click)="download(r)">Télécharger</button>
                }
              </div>
              @if (isAdmin()) {
                <div class="card__count">{{ r.downloadCount }} téléchargement(s)</div>
              }
            </div>
          }
        </div>
      }
    </div>

    @if (form(); as f) {
      <ef-resource-form
        [resource]="f.resource"
        [courses]="allCourses()"
        [defaultLevel]="levels.current()"
        (closed)="form.set(null)"
        (saved)="saved(f.resource)"
      />
    }
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 14px;
    }

    .card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 17px;
      border-radius: 16px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      transition: transform 0.25s var(--ef-ease-spring), box-shadow 0.25s, border-color 0.25s;
      animation: ef-fade-up 0.45s ease backwards;
    }

    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 34px rgba(6, 60, 30, 0.12);
      border-color: var(--ef-brand-500);
    }

    .card__top { display: flex; align-items: center; gap: 12px; }

    .card__icon {
      width: 42px;
      height: 42px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
    }

    .card__main { flex: 1; min-width: 0; }

    .card__name {
      font-size: 13px;
      font-weight: 700;
      color: var(--ef-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .card__meta { font-size: 11px; color: var(--ef-text-muted); margin-top: 2px; }

    .card__desc {
      font-size: 12px;
      line-height: 1.55;
      color: var(--ef-text-muted);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card__tools { display: flex; gap: 2px; flex-shrink: 0; }

    .card__actions { display: flex; gap: 8px; }

    .btn {
      flex: 1;
      padding: 8px;
      border-radius: 9px;
      text-align: center;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--ef-text-muted);
      background: var(--ef-surface-2);
      transition: background 0.2s, color 0.2s;
    }

    .btn:hover:not(:disabled) {
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
    }

    .btn:disabled { opacity: 0.6; }

    .card__count { font-size: 10.5px; font-weight: 600; color: var(--ef-text-subtle); margin-top: -4px; }

    .tool {
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      color: var(--ef-text-muted);
    }

    .tool:hover { background: var(--ef-tint-green); color: var(--ef-ink-green); }
    .tool--danger:hover { background: var(--ef-tint-red); color: var(--ef-ink-red); }
  `,
})
export class ResourceListComponent {
  private readonly api = inject(ResourcesApi);
  private readonly coursesApi = inject(CoursesApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly levels = inject(LevelService);

  protected readonly types: ResourceType[] = ['PDF', 'VIDEO', 'ZIP', 'LINK'];

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly allCourses = signal<CourseSummary[]>([]);
  private readonly resources = signal<Resource[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<number | null>(null);
  protected readonly form = signal<{ resource: Resource | null } | null>(null);

  protected readonly query = signal('');
  protected readonly courseFilter = signal<number | null>(null);
  protected readonly typeFilter = signal<ResourceType | null>(null);

  protected readonly levelLabel = computed(() => LEVEL_LABELS[this.levels.current()]);

  protected readonly levelCourses = computed(() =>
    this.isAdmin() ? this.allCourses().filter((c) => c.level === this.levels.current()) : this.allCourses(),
  );

  /** The API has no level filter; for the admin, keep this level's resources and the ones shared with every level. */
  protected readonly levelResources = computed(() => {
    if (!this.isAdmin()) {
      return this.resources();
    }
    const level = this.levels.current();
    return this.resources().filter((r) => r.level === null || r.level === level);
  });

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.levelResources().filter(
      (r) =>
        (!q || `${r.title} ${r.description ?? ''} ${r.courseCode ?? ''}`.toLowerCase().includes(q)) &&
        (this.courseFilter() == null || r.courseId === this.courseFilter() || r.courseId === null) &&
        (this.typeFilter() == null || r.type === this.typeFilter()),
    );
  });

  constructor() {
    this.load();
    effect(() => {
      this.levels.current();
      this.courseFilter.set(null);
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin([this.api.list(), this.coursesApi.list()]).subscribe({
      next: ([resources, courses]) => {
        this.resources.set(resources.content);
        this.allCourses.set(courses.content);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail);
        this.loading.set(false);
      },
    });
  }

  protected reset(): void {
    this.query.set('');
    this.courseFilter.set(null);
    this.typeFilter.set(null);
  }

  protected look(t: ResourceType) {
    return RESOURCE_LOOK[t];
  }

  protected short(t: ResourceType): string {
    return RESOURCE_SHORT[t];
  }

  protected meta(r: Resource): string {
    const where = r.courseCode ?? 'Tous modules';
    const level = r.level ? LEVEL_LABELS[r.level].replace(' informatique', '') : 'Tous niveaux';
    const size = r.file ? formatSize(r.file.sizeBytes) : RESOURCE_SHORT[r.type];
    return this.isAdmin() ? `${size} · ${where} · ${level}` : `${size} · ${where}`;
  }

  protected preview(r: Resource): void {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the blob.
    const tab = window.open('', '_blank');
    this.fetch(r, (blob) => {
      const url = URL.createObjectURL(blob);
      if (tab) {
        tab.location.href = url;
      } else {
        saveBlob(blob, r.file?.originalFilename ?? r.title);
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }, () => tab?.close());
  }

  protected download(r: Resource): void {
    this.fetch(r, (blob) => saveBlob(blob, r.file?.originalFilename ?? r.title));
  }

  private fetch(r: Resource, done: (blob: Blob) => void, failed?: () => void): void {
    this.busy.set(r.id);
    this.api.download(r.id).subscribe({
      next: (blob) => {
        this.busy.set(null);
        this.resources.update((list) => list.map((x) => (x.id === r.id ? { ...x, downloadCount: x.downloadCount + 1 } : x)));
        done(blob);
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        failed?.();
        this.toast.error(e.detail);
      },
    });
  }

  protected saved(previous: Resource | null): void {
    this.form.set(null);
    this.toast.success(previous ? 'Ressource mise à jour' : 'Ressource ajoutée');
    this.load();
  }

  protected remove(r: Resource): void {
    if (!confirm(`Supprimer « ${r.title} » ? Le fichier sera effacé.`)) {
      return;
    }
    this.api.delete(r.id).subscribe({
      next: () => {
        this.toast.success('Ressource supprimée');
        this.resources.update((list) => list.filter((x) => x.id !== r.id));
      },
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }
}
