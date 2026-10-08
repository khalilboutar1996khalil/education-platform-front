import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ApiError } from '../../core/models/api.model';

import { LevelService } from '../../core/services/level.service';
import { ToastService } from '../../core/services/toast.service';
import { saveBlob } from '../../shared/save-blob';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CoursesApi } from '../courses/courses.api';
import { AssignmentsApi } from './assignments.api';
import { AssignmentSummary, StoredFile, Submission, formatSize, isPending } from './assignments.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';

type Tab = 'PENDING' | 'GRADED' | 'ALL';

interface Row extends Submission {
  assignment: AssignmentSummary;
}

/** Module colour tones, cycled per course code so each module keeps one colour on the page. */
const TONES = ['green', 'teal', 'lime', 'emerald'] as const;

@Component({
  selector: 'ef-corrections',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, SpinnerComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Corrections</div>
          <div class="ef-page-sub">{{ pendingCount() }} travaux en attente de correction · {{ levelLabel() }}</div>
        </div>
      </div>

      <div class="ef-filters">
        <div class="tabs">
          @for (t of tabs; track t.value) {
            <button type="button" class="tab" [class.tab--on]="tab() === t.value" (click)="tab.set(t.value)">{{ t.label }}</button>
          }
        </div>
        <select class="ef-select" [ngModel]="assignmentFilter()" (ngModelChange)="assignmentFilter.set($event)">
          <option [ngValue]="null">Tous les travaux</option>
          @for (a of levelAssignments(); track a.id) {
            <option [ngValue]="a.id">{{ a.courseCode }} · {{ a.title }}</option>
          }
        </select>
      </div>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Impossible de charger les travaux</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
        </div>
      } @else if (!visible().length) {
        <div class="ef-empty">
          <div class="ef-empty__title">{{ tab() === 'PENDING' ? 'Rien à corriger' : 'Aucun travail déposé' }}</div>
          <div class="ef-empty__text">
            {{ tab() === 'PENDING' ? 'Tous les travaux déposés sont corrigés. 🎉' : 'Les dépôts des élèves apparaîtront ici.' }}
          </div>
        </div>
      } @else {
        <div class="list">
          @for (r of visible(); track r.id) {
            <div class="row">
              <div class="row__line">
                <div class="av" [class]="'av-' + tone(r.assignment.courseCode)">{{ r.student.initials }}</div>
                <div class="row__main">
                  <div class="row__top">
                    <span class="course" [class]="'tone-' + tone(r.assignment.courseCode)">{{ r.assignment.courseCode }}</span>
                    <span class="row__who">{{ r.student.fullName }}{{ r.partner ? ' & ' + r.partner.fullName : '' }}</span>
                    @if (r.status === 'LATE') { <span class="ef-pill ef-pill--red">En retard</span> }
                  </div>
                  <div class="row__meta">{{ r.assignmentTitle }} · déposé {{ r.submittedAt | date: 'd MMM · HH:mm' }}</div>
                </div>

                <div class="files">
                  @for (f of r.files; track f.id) {
                    <button type="button" class="file" [title]="'Télécharger ' + f.originalFilename" (click)="download(r, f)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                      <span class="file__name">{{ f.originalFilename }}</span>
                      <span class="file__size">{{ size(f.sizeBytes) }}</span>
                    </button>
                  } @empty {
                    <span class="nofile">Aucun fichier</span>
                  }
                </div>

                @if (isEditing(r)) {
                  <div class="mark">
                    <input
                      class="mark__input"
                      type="number"
                      min="0"
                      [max]="r.assignment.maxPoints"
                      step="0.25"
                      [placeholder]="'Note /' + r.assignment.maxPoints"
                      [ngModel]="draft(r).grade"
                      (ngModelChange)="setDraft(r, { grade: $event })"
                    />
                    <span class="mark__max">/ {{ r.assignment.maxPoints }}</span>
                    <button type="button" class="ef-cta mark__save" [disabled]="saving() === r.id" (click)="save(r)">
                      {{ saving() === r.id ? '…' : 'Enregistrer' }}
                    </button>
                  </div>
                } @else {
                  <button type="button" class="done" title="Modifier la note" (click)="startEdit(r)">
                    Corrigé · {{ r.grade }}/{{ r.assignment.maxPoints }}
                  </button>
                }
              </div>

              @if (r.comment) {
                <div class="comment"><strong>Commentaire de l'élève :</strong> {{ r.comment }}</div>
              }
              @if (isEditing(r)) {
                <textarea
                  class="ef-field-input feedback"
                  rows="2"
                  placeholder="Retour pour l'élève (facultatif)"
                  [ngModel]="draft(r).feedback"
                  (ngModelChange)="setDraft(r, { feedback: $event })"
                ></textarea>
              } @else if (r.feedback) {
                <div class="comment comment--fb"><strong>Votre retour :</strong> {{ r.feedback }}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .tabs { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }

    .tab {
      padding: 7px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      color: var(--ef-text-muted);
      background: var(--ef-surface-2);
      border: 1px solid var(--ef-border);
    }

    .tab--on {
      color: #fff;
      background: var(--ef-gradient-brand);
      border-color: var(--ef-brand-700);
    }

    .list { display: grid; gap: 11px; }

    .row {
      padding: 16px 18px;
      border-radius: 15px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      transition: border-color 0.22s, box-shadow 0.22s;
      animation: ef-fade-up 0.42s ease backwards;
    }

    .row:hover {
      border-color: var(--ef-brand-500);
      box-shadow: 0 10px 26px rgba(6, 60, 30, 0.1);
    }

    .row__line {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      min-width: 0;
    }

    .av {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      font-size: 11.5px;
      font-weight: 800;
      color: #fff;
    }

    .av-green { background: #15803d; }
    .av-teal { background: #0f766e; }
    .av-lime { background: #4d7c0f; }
    .av-emerald { background: #047857; }

    .tone-green { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .tone-teal { color: var(--ef-ink-teal); background: var(--ef-tint-teal); }
    .tone-lime { color: var(--ef-ink-lime); background: var(--ef-tint-lime); }
    .tone-emerald { color: var(--ef-ink-emerald); background: var(--ef-tint-emerald); }

    .row__main { flex: 1; min-width: 170px; }

    .row__top {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 3px;
    }

    .course {
      font-size: 10.5px;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 6px;
    }

    .row__who { font-size: 13.5px; font-weight: 700; color: var(--ef-text); }
    .row__meta { font-size: 11.5px; color: var(--ef-text-muted); }

    .files { display: flex; flex-direction: column; gap: 5px; max-width: 240px; }

    .file {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 11px;
      border-radius: 9px;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--ef-text-muted);
      background: var(--ef-surface-2);
      transition: color 0.2s, background 0.2s;
    }

    .file:hover { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .file svg { flex-shrink: 0; }
    .file__name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .file__size { flex-shrink: 0; font-weight: 600; opacity: 0.8; }

    .nofile { font-size: 11.5px; color: var(--ef-text-subtle); }

    .mark { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .mark__input {
      width: 84px;
      padding: 8px 10px;
      border-radius: 9px;
      border: 1px solid var(--ef-border);
      background: var(--ef-surface-2);
      font-size: 12.5px;
      color: var(--ef-text);
    }

    .mark__input:focus { border-color: var(--ef-brand-500); }
    .mark__max { font-size: 12px; font-weight: 700; color: var(--ef-text-muted); }
    .mark__save { padding: 9px 14px; font-size: 12px; box-shadow: none; }

    .done {
      flex-shrink: 0;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      white-space: nowrap;
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
    }

    .done:hover { box-shadow: 0 0 0 2px var(--ef-brand-500) inset; }

    .comment {
      margin: 12px 0 0 50px;
      padding: 9px 12px;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1.55;
      color: var(--ef-text-muted);
      background: var(--ef-surface-2);
    }

    .comment strong { color: var(--ef-text); }
    .comment--fb { background: var(--ef-tint-green); }

    .feedback {
      display: block;
      width: calc(100% - 50px);
      margin: 10px 0 0 50px;
      min-height: 60px;
    }

    @media (max-width: 640px) {
      .comment, .feedback { margin-left: 0; width: 100%; }
      .files { max-width: 100%; }
    }
  `,
})
export class CorrectionsComponent implements OnInit {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(AssignmentsApi);
  private readonly coursesApi = inject(CoursesApi);
  private readonly toast = inject(ToastService);
  private readonly levels = inject(LevelService);

  /** ?assignment=… from the TP & devoirs "Corriger" button. */
  readonly assignment = input<string | undefined>();

  protected readonly tabs: { value: Tab; label: string }[] = [
    { value: 'PENDING', label: 'À corriger' },
    { value: 'GRADED', label: 'Corrigés' },
    { value: 'ALL', label: 'Tous' },
  ];

  protected readonly levelAssignments = signal<AssignmentSummary[]>([]);
  private readonly rows = signal<Row[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tab = signal<Tab>('PENDING');
  protected readonly assignmentFilter = signal<number | null>(null);
  protected readonly saving = signal<number | null>(null);

  /** Work being marked (pending ones are always editable; graded ones after "Modifier"). */
  private readonly editing = signal<Set<number>>(new Set());
  private readonly drafts = signal<Record<number, { grade: number | null; feedback: string }>>({});

  protected readonly levelLabel = computed(() => this.catalog.label(this.levels.current()));
  protected readonly pendingCount = computed(() => this.rows().filter(isPending).length);

  protected readonly visible = computed(() =>
    this.rows().filter(
      (r) =>
        (this.assignmentFilter() == null || r.assignmentId === this.assignmentFilter()) &&
        (this.tab() === 'ALL' || (this.tab() === 'PENDING' ? isPending(r) : r.status === 'GRADED')),
    ),
  );

  private readonly toneByCode = computed(() => {
    const codes = [...new Set(this.levelAssignments().map((a) => a.courseCode))].sort();
    return Object.fromEntries(codes.map((c, i) => [c, TONES[i % TONES.length]]));
  });

  constructor() {
    effect(() => {
      this.levels.current();
      this.load();
    });
  }

  ngOnInit(): void {
    const id = Number(this.assignment());
    if (id) {
      this.assignmentFilter.set(id);
    }
  }

  protected load(): void {
    const level = this.levels.current();
    this.loading.set(true);
    this.error.set(null);
    forkJoin([this.coursesApi.list(level), this.api.list()])
      .pipe(
        switchMap(([courses, assignments]) => {
          const ids = new Set(courses.content.map((c) => c.id));
          const mine = assignments.content.filter((a) => ids.has(a.courseId) && a.status !== 'DRAFT');
          this.levelAssignments.set(mine);
          if (!mine.length) {
            return of([] as Row[]);
          }
          return forkJoin(
            mine.map((a) =>
              this.api.submissions(a.id).pipe(
                map((page) => page.content.filter((s) => s.status !== 'DRAFT').map((s) => ({ ...s, assignment: a }))),
                catchError(() => of([] as Row[])),
              ),
            ),
          ).pipe(map((lists) => lists.flat()));
        }),
      )
      .subscribe({
        next: (rows) => {
          // Oldest hand-ins first: the longest-waiting work gets marked first.
          rows.sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: (e: ApiError) => {
          this.error.set(e.detail);
          this.loading.set(false);
        },
      });
  }

  protected tone(code: string): string {
    return this.toneByCode()[code] ?? 'green';
  }

  protected size(bytes: number): string {
    return formatSize(bytes);
  }

  protected isEditing(r: Row): boolean {
    return isPending(r) || this.editing().has(r.id);
  }

  protected startEdit(r: Row): void {
    this.setDraft(r, { grade: r.grade, feedback: r.feedback ?? '' });
    this.editing.update((s) => new Set(s).add(r.id));
  }

  protected draft(r: Row): { grade: number | null; feedback: string } {
    return this.drafts()[r.id] ?? { grade: null, feedback: '' };
  }

  protected setDraft(r: Row, patch: Partial<{ grade: number | null; feedback: string }>): void {
    this.drafts.update((d) => ({ ...d, [r.id]: { ...this.draft(r), ...patch } }));
  }

  protected save(r: Row): void {
    const { grade, feedback } = this.draft(r);
    const max = Number(r.assignment.maxPoints);
    if (grade == null || isNaN(Number(grade)) || grade < 0 || grade > max) {
      this.toast.error(`Saisissez une note entre 0 et ${max}.`);
      return;
    }
    this.saving.set(r.id);
    this.api.grade(r.id, Number(grade), feedback.trim() || null).subscribe({
      next: (updated) => {
        this.saving.set(null);
        this.rows.update((list) => list.map((x) => (x.id === r.id ? { ...updated, assignment: r.assignment } : x)));
        this.editing.update((s) => {
          const next = new Set(s);
          next.delete(r.id);
          return next;
        });
        this.toast.success(`Note enregistrée pour ${r.student.fullName}`);
      },
      error: (e: ApiError) => {
        this.saving.set(null);
        this.toast.error(Object.values(e.fieldErrors)[0] ?? e.detail);
      },
    });
  }

  protected download(r: Row, f: StoredFile): void {
    this.api.fileBlob(r.id, f.id).subscribe({
      next: (blob) => saveBlob(blob, f.originalFilename),
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }
}
