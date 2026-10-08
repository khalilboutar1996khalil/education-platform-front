import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../core/models/api.model';

import { LevelService } from '../../core/services/level.service';
import { ToastService } from '../../core/services/toast.service';
import { saveBlob } from '../../shared/save-blob';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CoursesApi } from '../courses/courses.api';
import { CourseSummary } from '../courses/courses.model';
import { DashboardApi } from '../dashboard/dashboard.api';
import { AssignmentFormComponent } from './assignment-form.component';
import { AssignmentsApi } from './assignments.api';
import {
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_TONE,
  AssignmentDetail,
  AssignmentStatus,
  AssignmentSummary,
  MODE_LABELS,
  TYPE_LABELS,
  isPending,
} from './assignments.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';

type Tab = 'ALL' | 'TP' | 'DEVOIR';

interface Counts {
  handedIn: number;
  pending: number;
}

const ICON_TP = 'M16 18l6-6-6-6M8 6l-6 6 6 6';
const ICON_DEVOIR = 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6';

@Component({
  selector: 'ef-assignment-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, SpinnerComponent, AssignmentFormComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">TP &amp; devoirs</div>
          <div class="ef-page-sub">Tout se dépose et se corrige en ligne · {{ levelLabel() }}</div>
          <div class="legend">
            <strong class="legend__tp">TP</strong> — travail pratique, souvent en binôme, code ou fichier à déposer.
            &nbsp;<strong class="legend__dv">Devoir</strong> — travail individuel, rédaction ou exercices à déposer.
          </div>
        </div>
        <button type="button" class="ef-cta" (click)="openForm(null)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nouveau TP / devoir
        </button>
      </div>

      <div class="tabs">
        @for (t of tabs; track t.value) {
          <button type="button" class="tab" [class.tab--on]="tab() === t.value" (click)="tab.set(t.value)">{{ t.label }}</button>
        }
      </div>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Impossible de charger les travaux</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
        </div>
      } @else if (!rows().length) {
        <div class="ef-empty">
          <div class="ef-empty__title">Aucun travail{{ tab() === 'ALL' ? '' : ' de ce type' }} pour ce niveau</div>
          <div class="ef-empty__text">Créez un TP ou un devoir, puis publiez-le pour ouvrir les dépôts.</div>
          <button type="button" class="ef-soft-btn" (click)="openForm(null)">Nouveau TP / devoir</button>
        </div>
      } @else {
        <div class="list">
          @for (a of rows(); track a.id) {
            <div class="row">
              <div class="row__icon" [class.row__icon--dv]="a.type === 'DEVOIR'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="a.type === 'TP' ? iconTp : iconDevoir" /></svg>
              </div>

              <div class="row__main">
                <div class="row__top">
                  <span class="kind" [class.kind--dv]="a.type === 'DEVOIR'">{{ a.typeLabel }}</span>
                  <span class="row__title">{{ a.title }}</span>
                </div>
                <div class="row__meta">
                  {{ a.courseCode }} · {{ a.modeLabel }} · {{ a.deadline ? 'Échéance ' + (a.deadline | date: 'd MMM · HH:mm') : 'Sans échéance' }}
                  {{ a.allowLate ? '· retards acceptés' : '' }}
                </div>
              </div>

              <div class="row__prog">
                <div class="row__prog-top"><span>Rendus</span><span>{{ a.handedIn }}/{{ classSize() }}</span></div>
                <div class="ef-track"><div class="ef-track__fill" [style.width.%]="a.pct" [class.fill--dv]="a.type === 'DEVOIR'"></div></div>
              </div>

              <a class="grade" [routerLink]="['/app/corrections']" [queryParams]="{ assignment: a.id }">
                Corriger {{ a.pending }}
              </a>

              <span class="ef-pill" [class]="'ef-pill--' + a.tone">{{ a.statusLabel }}</span>

              <div class="tools">
                @switch (a.status) {
                  @case ('DRAFT') {
                    <button type="button" class="tool tool--go" title="Publier" (click)="setStatus(a, 'OPEN')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                  }
                  @case ('OPEN') {
                    <button type="button" class="tool" title="Clôturer les dépôts" (click)="setStatus(a, 'CLOSED')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    </button>
                  }
                  @case ('CLOSED') {
                    <button type="button" class="tool" title="Rouvrir les dépôts" (click)="setStatus(a, 'OPEN')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 9.9-1" /></svg>
                    </button>
                  }
                }
                <button type="button" class="tool" title="Modifier" (click)="edit(a)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
                </button>
                <button type="button" class="tool" title="Télécharger le sujet" (click)="downloadBrief(a)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </button>
                <button type="button" class="tool tool--danger" title="Supprimer" (click)="remove(a)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (form(); as f) {
      <ef-assignment-form [assignment]="f.assignment" [courses]="courses()" (closed)="form.set(null)" (saved)="saved($event, f.assignment)" />
    }
  `,
  styles: `
    .legend {
      max-width: 560px;
      margin-top: 6px;
      font-size: 12px;
      line-height: 1.55;
      color: var(--ef-text-muted);
    }

    .legend__tp { color: var(--ef-ink-green); }
    .legend__dv { color: var(--ef-ink-teal); }

    .tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .tab {
      padding: 7px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      color: var(--ef-text-muted);
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      transition: transform 0.2s;
    }

    .tab:hover { transform: translateY(-2px); }

    .tab--on {
      color: #fff;
      background: var(--ef-gradient-brand);
      border-color: var(--ef-brand-700);
    }

    .list {
      display: grid;
      gap: 11px;
    }

    .row {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      padding: 16px 18px;
      border-radius: 15px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s;
      animation: ef-fade-up 0.42s ease backwards;
    }

    .row:hover {
      transform: translateX(4px);
      box-shadow: 0 10px 26px rgba(6, 60, 30, 0.1);
      border-color: var(--ef-brand-500);
    }

    .row__icon {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      color: var(--ef-brand-600);
      background: var(--ef-tint-green);
    }

    .row__icon--dv {
      color: #0d7a70;
      background: var(--ef-tint-teal);
    }

    .row__main {
      flex: 1;
      min-width: 170px;
    }

    .row__top {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 3px;
    }

    .kind {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 3px 9px;
      border-radius: 6px;
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
    }

    .kind--dv {
      color: var(--ef-ink-teal);
      background: var(--ef-tint-teal);
    }

    .row__title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--ef-text);
    }

    .row__meta {
      font-size: 11.5px;
      color: var(--ef-text-muted);
    }

    .row__prog {
      width: 150px;
      flex-shrink: 0;
    }

    .row__prog-top {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 10.5px;
      font-weight: 700;
      color: var(--ef-text-muted);
    }

    .fill--dv { background: #0d9488; }

    .grade {
      flex-shrink: 0;
      padding: 9px 14px;
      border-radius: 9px;
      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      color: var(--ef-ink-green);
      background: var(--ef-surface-2);
      transition: background 0.2s;
    }

    .grade:hover {
      color: var(--ef-ink-green);
      background: rgba(34, 197, 94, 0.18);
    }

    .tools {
      display: flex;
      gap: 2px;
      flex-shrink: 0;
    }

    .tool {
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      color: var(--ef-text-muted);
      transition: background 0.2s, color 0.2s;
    }

    .tool:hover,
    .tool--go {
      background: var(--ef-tint-green);
      color: var(--ef-ink-green);
    }

    .tool--danger:hover {
      background: var(--ef-tint-red);
      color: var(--ef-ink-red);
    }
  `,
})
export class AssignmentListComponent {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(AssignmentsApi);
  private readonly coursesApi = inject(CoursesApi);
  private readonly dashboard = inject(DashboardApi);
  private readonly toast = inject(ToastService);
  private readonly levels = inject(LevelService);

  protected readonly iconTp = ICON_TP;
  protected readonly iconDevoir = ICON_DEVOIR;
  protected readonly tabs: { value: Tab; label: string }[] = [
    { value: 'ALL', label: 'Tous' },
    { value: 'TP', label: 'TP' },
    { value: 'DEVOIR', label: 'Devoirs' },
  ];

  protected readonly courses = signal<CourseSummary[]>([]);
  private readonly assignments = signal<AssignmentSummary[]>([]);
  private readonly counts = signal<Record<number, Counts>>({});
  protected readonly classSize = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('ALL');
  protected readonly form = signal<{ assignment: AssignmentDetail | null } | null>(null);

  protected readonly levelLabel = computed(() => this.catalog.label(this.levels.current()));

  protected readonly rows = computed(() => {
    const ids = new Set(this.courses().map((c) => c.id));
    const size = Math.max(this.classSize(), 1);
    return this.assignments()
      .filter((a) => ids.has(a.courseId) && (this.tab() === 'ALL' || a.type === this.tab()))
      .map((a) => {
        const c = this.counts()[a.id] ?? { handedIn: 0, pending: 0 };
        return {
          ...a,
          ...c,
          pct: Math.min(100, Math.round((c.handedIn / size) * 100)),
          typeLabel: TYPE_LABELS[a.type],
          modeLabel: `À rendre en ligne · ${MODE_LABELS[a.mode]}`,
          statusLabel: ASSIGNMENT_STATUS_LABELS[a.status],
          tone: ASSIGNMENT_STATUS_TONE[a.status],
        };
      });
  });

  constructor() {
    effect(() => {
      this.levels.current();
      this.load();
    });
  }

  protected load(): void {
    const level = this.levels.current();
    this.loading.set(true);
    this.error.set(null);
    forkJoin([this.coursesApi.list(level), this.api.list(), this.dashboard.admin()])
      .pipe(
        switchMap(([courses, assignments, dash]) => {
          this.courses.set(courses.content);
          this.assignments.set(assignments.content);
          this.classSize.set(dash.studentsByLevel.find((r) => r.level === level)?.count ?? 0);
          const ids = new Set(courses.content.map((c) => c.id));
          const mine = assignments.content.filter((a) => ids.has(a.courseId) && a.status !== 'DRAFT');
          if (!mine.length) {
            return of({} as Record<number, Counts>);
          }
          return forkJoin(
            mine.map((a) =>
              this.api.submissions(a.id).pipe(
                map((page) => [
                  a.id,
                  {
                    handedIn: page.content.filter((s) => s.status !== 'DRAFT').length,
                    pending: page.content.filter(isPending).length,
                  },
                ] as const),
                catchError(() => of([a.id, { handedIn: 0, pending: 0 }] as const)),
              ),
            ),
          ).pipe(map((pairs) => Object.fromEntries(pairs) as Record<number, Counts>));
        }),
      )
      .subscribe({
        next: (counts) => {
          this.counts.set(counts);
          this.loading.set(false);
        },
        error: (e: ApiError) => {
          this.error.set(e.detail);
          this.loading.set(false);
        },
      });
  }

  protected openForm(assignment: AssignmentDetail | null): void {
    this.form.set({ assignment });
  }

  protected edit(a: AssignmentSummary): void {
    this.api.get(a.id).subscribe({
      next: (detail) => this.openForm(detail),
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }

  protected saved(a: AssignmentDetail, previous: AssignmentDetail | null): void {
    this.form.set(null);
    this.toast.success(previous ? 'Travail mis à jour' : 'Travail créé en brouillon — publiez-le pour ouvrir les dépôts');
    this.load();
  }

  protected setStatus(a: AssignmentSummary, status: AssignmentStatus): void {
    if (status === 'CLOSED' && !confirm(`Clôturer « ${a.title} » ? Plus aucun dépôt ne sera accepté.`)) {
      return;
    }
    this.api.setStatus(a.id, status).subscribe({
      next: () => {
        this.toast.success(status === 'CLOSED' ? 'Dépôts clôturés' : a.status === 'DRAFT' ? 'Travail publié' : 'Dépôts rouverts');
        this.assignments.update((list) => list.map((x) => (x.id === a.id ? { ...x, status } : x)));
        if (a.status === 'DRAFT') {
          this.load();
        }
      },
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }

  protected downloadBrief(a: AssignmentSummary): void {
    this.api.get(a.id).subscribe({
      next: (detail) => {
        if (!detail.brief) {
          this.toast.info("Aucun sujet n'est joint à ce travail.");
          return;
        }
        const name = detail.brief.originalFilename;
        this.api.briefBlob(a.id).subscribe({
          next: (blob) => saveBlob(blob, name),
          error: (e: ApiError) => this.toast.error(e.detail),
        });
      },
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }

  protected remove(a: AssignmentSummary): void {
    if (!confirm(`Supprimer « ${a.title} » avec tous les travaux déposés ?`)) {
      return;
    }
    this.api.delete(a.id).subscribe({
      next: () => {
        this.toast.success('Travail supprimé');
        this.assignments.update((list) => list.filter((x) => x.id !== a.id));
      },
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }
}
