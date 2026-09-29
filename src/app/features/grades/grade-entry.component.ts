import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, concatMap, finalize, from, tap, throwError } from 'rxjs';
import { ApiError } from '../../core/models/api.model';
import { ModalComponent } from '../../shared/ui/modal.component';
import { GradesApi } from './grades.api';
import { GradebookRow, formatMark, parseMark } from './grades.model';

/** One assessment for the whole class (a partiel, an oral…): same label, scale and coefficient, one mark per student. */
@Component({
  selector: 'ef-grade-entry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent],
  template: `
    <ef-modal heading="Saisir des notes" (closed)="closed.emit()">
      <div class="ef-form">
        <label class="ef-f">
          <span class="ef-f__label">Évaluation</span>
          <input class="ef-field-input" maxlength="255" [ngModel]="label()" (ngModelChange)="label.set($event)" placeholder="ex. Partiel 1, Oral…" />
          @if (tried() && !label().trim()) { <span class="ef-f__err">Ce champ est obligatoire</span> }
        </label>
        <div class="ef-form-row">
          <label class="ef-f">
            <span class="ef-f__label">Noté sur</span>
            <input class="ef-field-input" inputmode="decimal" [ngModel]="max()" (ngModelChange)="max.set($event)" />
            @if (tried() && maxValue() === null) { <span class="ef-f__err">Doit être supérieur à 0</span> }
          </label>
          <label class="ef-f">
            <span class="ef-f__label">Coefficient</span>
            <input class="ef-field-input" inputmode="decimal" [ngModel]="weight()" (ngModelChange)="weight.set($event)" />
            @if (tried() && weightValue() === null) { <span class="ef-f__err">Doit être supérieur à 0</span> }
          </label>
        </div>

        <div class="ef-f">
          <span class="ef-f__label">Notes ({{ filled() }} / {{ open().length }})</span>
          <div class="ef-f__hint">Laissez vide pour ne rien enregistrer à un élève.</div>
          <div class="list">
            @for (r of rows(); track r.student.id) {
              @let already = existing(r);
              <div class="line" [class.line--bad]="tried() && invalid(r.student.id)">
                <span class="line__name">{{ r.student.fullName }}</span>
                @if (already !== null) {
                  <span class="line__done" title="Cet élève a déjà une note pour cette évaluation">{{ already }}</span>
                } @else if (r.student.status === 'DISABLED') {
                  <span class="line__done">Compte désactivé</span>
                } @else {
                  <input
                    class="ef-field-input line__input"
                    inputmode="decimal"
                    [ngModel]="scores()[r.student.id] ?? ''"
                    (ngModelChange)="setScore(r.student.id, $event)"
                    [attr.aria-label]="'Note de ' + r.student.fullName"
                  />
                  <span class="line__max">/ {{ max() || '?' }}</span>
                }
              </div>
            }
          </div>
          @if (tried() && badCount() > 0) {
            <span class="ef-f__err">{{ badCount() }} note(s) invalide(s) : nombre entre 0 et {{ max() }}.</span>
          }
        </div>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }
        <button type="button" class="ef-cta ef-form-submit" [disabled]="saving()" (click)="save()">
          {{ saving() ? 'Enregistrement… ' + done() + ' / ' + total() : 'Enregistrer ' + filled() + ' note(s)' }}
        </button>
      </div>
    </ef-modal>
  `,
  styles: `
    .list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; max-height: 42vh; overflow-y: auto; padding-right: 2px; }
    .line { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 10px; background: var(--ef-surface-2); border: 1px solid transparent; }
    .line--bad { border-color: var(--ef-ink-red); }
    .line__name { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: var(--ef-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .line__input { width: 72px; height: 32px; padding: 0 9px; text-align: right; }
    .line__max { width: 38px; font-size: 11.5px; color: var(--ef-text-muted); }
    .line__done { font-size: 11.5px; font-weight: 700; color: var(--ef-text-subtle); }
  `,
})
export class GradeEntryComponent {
  private readonly api = inject(GradesApi);

  readonly courseId = input.required<number>();
  readonly rows = input.required<GradebookRow[]>();
  readonly closed = output<void>();
  /** The whole batch went through; carries how many marks were written. */
  readonly saved = output<number>();
  /** The batch stopped part-way after writing some marks; the sheet should refresh while the form stays open. */
  readonly partial = output<void>();

  protected readonly label = signal('');
  protected readonly max = signal('20');
  protected readonly weight = signal('1');
  protected readonly scores = signal<Partial<Record<number, string>>>({});
  protected readonly tried = signal(false);
  protected readonly saving = signal(false);
  protected readonly done = signal(0);
  protected readonly total = signal(0);
  protected readonly formError = signal<string | null>(null);

  protected readonly maxValue = computed(() => positive(this.max()));
  protected readonly weightValue = computed(() => positive(this.weight()));

  protected readonly open = computed(() =>
    this.rows().filter((r) => r.student.status !== 'DISABLED' && this.existing(r) === null),
  );

  private readonly entries = computed(() => {
    const openIds = new Set(this.open().map((r) => r.student.id));
    return Object.entries(this.scores())
      .map(([id, text]) => ({ studentId: Number(id), text: text ?? '' }))
      .filter((e) => e.text.trim() !== '' && openIds.has(e.studentId));
  });

  protected readonly filled = computed(() => this.entries().length);
  protected readonly badCount = computed(() => this.entries().filter((e) => this.invalid(e.studentId)).length);

  /** A second mark under the same label would hide the first in the sheet, so those students are locked. */
  protected existing(row: GradebookRow): string | null {
    const key = this.label().trim().toLowerCase();
    if (!key) {
      return null;
    }
    const g = row.grades.find((x) => x.label.trim().toLowerCase() === key);
    return g ? `${formatMark(g.score)} / ${formatMark(g.maxScore)}` : null;
  }

  protected invalid(studentId: number): boolean {
    const text = this.scores()[studentId];
    if (!text?.trim()) {
      return false;
    }
    const v = parseMark(text);
    const max = this.maxValue();
    return v === null || (max !== null && v > max);
  }

  protected setScore(studentId: number, text: string): void {
    this.scores.update((s) => ({ ...s, [studentId]: text }));
  }

  protected save(): void {
    this.tried.set(true);
    this.formError.set(null);
    const label = this.label().trim();
    const maxScore = this.maxValue();
    const weight = this.weightValue();
    if (!label || maxScore === null || weight === null || this.badCount() > 0) {
      return;
    }
    const batch = this.entries();
    if (!batch.length) {
      this.formError.set('Saisissez au moins une note.');
      return;
    }

    const names = new Map(this.rows().map((r) => [r.student.id, r.student.fullName]));
    this.saving.set(true);
    this.done.set(0);
    this.total.set(batch.length);

    // One at a time; the first failure ends the batch. Written marks leave the form so a retry cannot duplicate them.
    from(batch)
      .pipe(
        concatMap((e) =>
          this.api.addManual(this.courseId(), { studentId: e.studentId, label, score: parseMark(e.text)!, maxScore, weight }).pipe(
            tap(() => {
              this.done.update((n) => n + 1);
              this.scores.update((s) => {
                const next = { ...s };
                delete next[e.studentId];
                return next;
              });
            }),
            catchError((err: ApiError) => {
              this.formError.set(`${this.done()} note(s) enregistrée(s). Échec pour ${names.get(e.studentId)} : ${err.detail}`);
              return throwError(() => err);
            }),
          ),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        complete: () => this.saved.emit(this.done()),
        error: () => {
          if (this.done() > 0) {
            this.partial.emit();
          }
        },
      });
  }
}

function positive(text: string): number | null {
  const v = parseMark(text);
  return v !== null && v > 0 ? v : null;
}
