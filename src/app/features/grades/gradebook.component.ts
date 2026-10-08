import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, forkJoin, map, merge, switchMap, tap } from 'rxjs';
import { ApiError } from '../../core/models/api.model';
import { User } from '../../core/models/user.model';
import { LevelService } from '../../core/services/level.service';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CoursesApi } from '../courses/courses.api';
import { CourseSummary } from '../courses/courses.model';
import { StudentsApi } from '../students/students.api';
import { GradeEntryComponent } from './grade-entry.component';
import { GradesApi } from './grades.api';
import { GRADE_KIND_LABELS, Grade, GradeKind, GradebookRow, bandOf, formatMark } from './grades.model';
import { StudentGradesComponent } from './student-grades.component';
import { LevelCatalog } from '../../core/services/level-catalog.service';

interface Column {
  label: string;
  kind: GradeKind;
  first: string;
}

@Component({
  selector: 'ef-gradebook',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, SpinnerComponent, GradeEntryComponent, StudentGradesComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Notes</div>
          <div class="ef-page-sub">{{ course() ? course()!.code + ' · ' + course()!.title : levelLabel() }}</div>
        </div>
        @if (course()) {
          <button type="button" class="ef-cta" [disabled]="!table().length" (click)="entering.set(true)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Saisir des notes
          </button>
        }
      </div>

      @if (loadingLevel()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (levelError()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Impossible de charger les notes</div>
          <div class="ef-empty__text">{{ levelError() }}</div>
          <button type="button" class="ef-soft-btn" (click)="reloadLevel()">Réessayer</button>
        </div>
      } @else if (!courses().length) {
        <div class="ef-empty">
          <div class="ef-empty__title">Aucun module en {{ levelLabel() }}</div>
          <div class="ef-empty__text">Le carnet de notes se remplit module par module.</div>
          <a class="ef-soft-btn" routerLink="/app/courses">Créer un module</a>
        </div>
      } @else {
        <div class="ef-filters">
          <select class="ef-select" [ngModel]="courseId()" (ngModelChange)="courseId.set($event)" aria-label="Module">
            @for (c of courses(); track c.id) {
              <option [ngValue]="c.id">{{ c.code }} · {{ c.title }}</option>
            }
          </select>
          <div class="ef-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            <input [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Rechercher un élève…" />
          </div>
        </div>

        @if (loadingBook()) {
          <div class="ef-loading"><ef-spinner [size]="26" /></div>
        } @else if (bookError()) {
          <div class="ef-empty">
            <div class="ef-empty__title">Impossible de charger le carnet</div>
            <div class="ef-empty__text">{{ bookError() }}</div>
            <button type="button" class="ef-soft-btn" (click)="reloadBook()">Réessayer</button>
          </div>
        } @else if (!table().length) {
          <div class="ef-empty">
            <div class="ef-empty__title">Aucun élève en {{ levelLabel() }}</div>
            <div class="ef-empty__text">Les élèves inscrits à ce niveau apparaîtront ici avec leurs notes.</div>
            <a class="ef-soft-btn" routerLink="/app/students">Gérer les élèves</a>
          </div>
        } @else {
          @if (!columns().length) {
            <div class="hint">
              Aucune note pour l'instant. Elles arrivent d'elles-mêmes avec les quiz corrigés et les TP notés, ou avec « Saisir des notes ».
            </div>
          }
          <div class="sheet">
            <table>
              <thead>
                <tr>
                  <th class="col-name">Élève</th>
                  @for (c of columns(); track c.label) {
                    <th [title]="c.label">
                      <span class="th__label">{{ c.label }}</span>
                      <span class="th__kind">{{ kindLabel(c.kind) }}</span>
                    </th>
                  }
                  <th class="col-avg">Moyenne</th>
                </tr>
              </thead>
              <tbody>
                @for (r of visible(); track r.student.id) {
                  <tr (click)="openStudent.set(r.student.id)" tabindex="0" (keydown.enter)="openStudent.set(r.student.id)">
                    <td class="col-name">
                      <div class="who">
                        <span class="av">{{ r.student.initials }}</span>
                        <span class="who__name">{{ r.student.fullName }}</span>
                      </div>
                    </td>
                    @for (c of columns(); track c.label) {
                      @let g = cell(r, c);
                      <td>
                        @if (g) {
                          <span class="m" [class]="'m m--' + band(g.outOfTwenty)" [title]="detail(g)">{{ mark(g.outOfTwenty) }}</span>
                        } @else {
                          <span class="m m--none">—</span>
                        }
                      </td>
                    }
                    <td class="col-avg">
                      @if (r.average !== null) {
                        <span class="avg" [class]="'avg avg--' + band(r.average)">{{ mark(r.average) }}</span>
                      } @else {
                        <span class="m m--none">—</span>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr class="empty-row"><td [attr.colspan]="columns().length + 2">Aucun élève ne correspond à « {{ query() }} ».</td></tr>
                }
              </tbody>
              @if (columns().length) {
                <tfoot>
                  <tr>
                    <td class="col-name">Moyenne de la classe</td>
                    @for (c of columns(); track c.label) {
                      <td>{{ classMean(c) }}</td>
                    }
                    <td class="col-avg">{{ classAverage() }}</td>
                  </tr>
                </tfoot>
              }
            </table>
          </div>
          <div class="legend">
            <span><i class="sw sw--good"></i>16 et plus · Bien</span>
            <span><i class="sw sw--mid"></i>12 à 16 · Moyen</span>
            <span><i class="sw sw--low"></i>Moins de 12</span>
            <span class="legend__note">Notes ramenées sur 20 · cliquez sur un élève pour le détail</span>
          </div>
        }
      }
    </div>

    @if (entering() && course(); as c) {
      <ef-grade-entry
        [courseId]="c.id"
        [rows]="table()"
        (closed)="entering.set(false)"
        (saved)="entered($event)"
        (partial)="reloadBook()"
      />
    }
    @if (selectedRow(); as r) {
      <ef-student-grades
        [row]="r"
        [courseLabel]="course() ? course()!.code + ' · ' + course()!.title : ''"
        (closed)="openStudent.set(null)"
        (changed)="reloadBook()"
      />
    }
  `,
  styles: `
    .hint { margin-bottom: 12px; padding: 11px 14px; border-radius: 12px; font-size: 12.5px; color: var(--ef-text-muted); background: var(--ef-tint-green); }
    .sheet { overflow-x: auto; border-radius: 16px; background: var(--ef-surface); border: 1px solid var(--ef-border); animation: ef-fade-up 0.4s ease backwards; }
    table { width: 100%; min-width: 560px; border-collapse: collapse; }
    th {
      padding: 11px 12px;
      text-align: left;
      vertical-align: bottom;
      font-size: 10.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: var(--ef-text-muted);
      border-bottom: 1px solid var(--ef-border);
      max-width: 130px;
    }
    .th__label { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .th__kind { display: block; margin-top: 2px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: none; color: var(--ef-text-subtle); }
    td { padding: 11px 12px; font-size: 12.5px; border-bottom: 1px solid var(--ef-border); color: var(--ef-text); }
    tbody tr { cursor: pointer; transition: background 0.18s; }
    tbody tr:hover, tbody tr:focus-visible { background: var(--ef-surface-2); outline: none; }
    .col-name { position: sticky; left: 0; z-index: 1; min-width: 190px; background: var(--ef-surface); }
    tbody tr:hover .col-name, tbody tr:focus-visible .col-name { background: var(--ef-surface-2); }
    .col-avg { width: 90px; }
    .who { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .av { width: 29px; height: 29px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 9px; font-size: 10px; font-weight: 800; color: #fff; background: var(--ef-gradient-brand); }
    .who__name { font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .m { font-weight: 700; }
    .m--good { color: var(--ef-ink-green); }
    .m--mid { color: var(--ef-ink-amber); }
    .m--low { color: var(--ef-ink-red); }
    .m--none { color: var(--ef-text-subtle); font-weight: 500; }
    .avg { display: inline-block; font-size: 13px; font-weight: 800; padding: 4px 11px; border-radius: 8px; }
    .avg--good { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .avg--mid { color: var(--ef-ink-amber); background: var(--ef-tint-amber); }
    .avg--low { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    tfoot td { font-size: 12px; font-weight: 800; color: var(--ef-text-muted); border-bottom: none; background: var(--ef-surface-2); }
    tfoot .col-name { background: var(--ef-surface-2); }
    .empty-row td { text-align: center; color: var(--ef-text-muted); cursor: default; }
    .legend { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin-top: 12px; font-size: 11.5px; font-weight: 600; color: var(--ef-text-muted); }
    .legend span { display: flex; align-items: center; gap: 6px; }
    .sw { width: 10px; height: 10px; border-radius: 3px; }
    .sw--good { background: var(--ef-tint-green); border: 1px solid var(--ef-ink-green); }
    .sw--mid { background: var(--ef-tint-amber); border: 1px solid var(--ef-ink-amber); }
    .sw--low { background: var(--ef-tint-red); border: 1px solid var(--ef-ink-red); }
    .legend__note { margin-left: auto; font-weight: 500; color: var(--ef-text-subtle); }
  `,
})
export class GradebookComponent {
  protected readonly catalog = inject(LevelCatalog);
  private readonly coursesApi = inject(CoursesApi);
  private readonly studentsApi = inject(StudentsApi);
  private readonly api = inject(GradesApi);
  private readonly toast = inject(ToastService);
  private readonly levels = inject(LevelService);

  protected readonly courses = signal<CourseSummary[]>([]);
  private readonly students = signal<User[]>([]);
  protected readonly courseId = signal<number | null>(null);
  private readonly rows = signal<GradebookRow[]>([]);

  protected readonly loadingLevel = signal(true);
  protected readonly levelError = signal<string | null>(null);
  protected readonly loadingBook = signal(false);
  protected readonly bookError = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly entering = signal(false);
  protected readonly openStudent = signal<number | null>(null);

  private loadedFor: number | null = null;
  private readonly levelRetry = new Subject<void>();
  private readonly bookRetry = new Subject<void>();

  protected readonly levelLabel = computed(() => this.catalog.label(this.levels.current()));
  protected readonly course = computed(() => this.courses().find((c) => c.id === this.courseId()) ?? null);

  /** The API only lists students who already have a mark, so the level's roster fills in the rest. */
  protected readonly table = computed(() => {
    const byId = new Map(this.rows().map((r) => [r.student.id, r]));
    const list: GradebookRow[] = this.students().map((s) => byId.get(s.id) ?? { student: s, grades: [], average: null });
    const known = new Set(this.students().map((s) => s.id));
    list.push(...this.rows().filter((r) => !known.has(r.student.id)));
    return list.sort((a, b) => a.student.fullName.localeCompare(b.student.fullName, 'fr'));
  });

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.table().filter((r) => `${r.student.fullName} ${r.student.email}`.toLowerCase().includes(q)) : this.table();
  });

  /** One column per assessment label, oldest first. A pair's partner gets a hand-entered copy of the TP mark, so labels, not kinds, define a column. */
  protected readonly columns = computed(() => {
    const cols = new Map<string, Column>();
    for (const r of this.rows()) {
      for (const g of r.grades) {
        const c = cols.get(g.label);
        if (!c) {
          cols.set(g.label, { label: g.label, kind: g.kind, first: g.recordedAt });
        } else {
          if (c.kind === 'MANUAL' && g.kind !== 'MANUAL') {
            c.kind = g.kind;
          }
          if (g.recordedAt < c.first) {
            c.first = g.recordedAt;
          }
        }
      }
    }
    return [...cols.values()].sort((a, b) => a.first.localeCompare(b.first));
  });

  protected readonly classAverage = computed(() =>
    meanOf(this.table().map((r) => r.average).filter((v): v is number => v !== null)),
  );

  protected readonly selectedRow = computed(() => this.table().find((r) => r.student.id === this.openStudent()) ?? null);

  constructor() {
    merge(toObservable(this.levels.current), this.levelRetry.pipe(map(() => this.levels.current())))
      .pipe(
        tap(() => {
          this.loadingLevel.set(true);
          this.levelError.set(null);
          this.query.set('');
        }),
        switchMap((level) =>
          forkJoin([
            this.coursesApi.list(level),
            this.studentsApi.students({ level, status: null, search: '', page: 0, size: 500 }),
          ]).pipe(
            catchError((e: ApiError) => {
              this.levelError.set(e.detail);
              this.loadingLevel.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(([courses, students]) => {
        const list = [...courses.content].sort((a, b) => a.code.localeCompare(b.code));
        this.courses.set(list);
        this.students.set(students.content);
        this.courseId.set(list[0]?.id ?? null);
        this.loadingLevel.set(false);
      });

    merge(toObservable(this.courseId), this.bookRetry.pipe(map(() => this.courseId())))
      .pipe(
        switchMap((id) => {
          this.bookError.set(null);
          if (id === null) {
            this.rows.set([]);
            return EMPTY;
          }
          // A refresh of the same module keeps the sheet on screen; only a module switch shows the spinner.
          this.loadingBook.set(id !== this.loadedFor);
          return this.api.gradebook(id).pipe(
            map((rows) => ({ id, rows })),
            catchError((e: ApiError) => {
              this.bookError.set(e.detail);
              this.loadingBook.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ id, rows }) => {
        this.rows.set(rows);
        this.loadedFor = id;
        this.loadingBook.set(false);
      });
  }

  protected reloadLevel(): void {
    this.levelRetry.next();
  }

  protected reloadBook(): void {
    this.bookRetry.next();
  }

  protected entered(count: number): void {
    this.entering.set(false);
    this.toast.success(`${count} note(s) enregistrée(s)`);
    this.reloadBook();
  }

  protected cell(row: GradebookRow, col: Column): Grade | null {
    let found: Grade | null = null;
    for (const g of row.grades) {
      if (g.label === col.label) {
        found = g;
      }
    }
    return found;
  }

  protected classMean(col: Column): string {
    const values = this.table()
      .map((r) => this.cell(r, col)?.outOfTwenty)
      .filter((v): v is number => v !== undefined);
    return meanOf(values);
  }

  protected kindLabel(k: GradeKind): string {
    return GRADE_KIND_LABELS[k];
  }

  protected band(v: number) {
    return bandOf(v);
  }

  protected mark(v: number): string {
    return formatMark(v);
  }

  protected detail(g: Grade): string {
    const coef = g.weight !== 1 ? ` · coef. ${formatMark(g.weight)}` : '';
    return `${formatMark(g.score)} / ${formatMark(g.maxScore)}${coef}`;
  }
}

function meanOf(values: number[]): string {
  return values.length ? formatMark(Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100) : '—';
}
