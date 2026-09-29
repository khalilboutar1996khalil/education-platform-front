import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';
import { ApiError } from '../../core/models/api.model';
import { fromLocalInput, toLocalInput } from '../../shared/datetime';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { CourseSummary } from '../courses/courses.model';
import { AssignmentsApi } from './assignments.api';
import { AssignmentDetail, AssignmentType, WorkMode, formatSize } from './assignments.model';

/** Create a TP / devoir (as a draft), or edit `assignment`. The subject sheet is uploaded right after saving. */
@Component({
  selector: 'ef-assignment-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal [heading]="assignment() ? 'Modifier le travail' : 'Nouveau travail'" (closed)="closed.emit()">
      <form class="ef-form" [formGroup]="form" (ngSubmit)="save()">
        <div class="ef-form-row">
          <label class="ef-f">
            <span class="ef-f__label">Type</span>
            <select class="ef-field-input" formControlName="type" (change)="typeChanged()">
              <option value="TP">TP — travail pratique</option>
              <option value="DEVOIR">Devoir</option>
            </select>
          </label>
          <label class="ef-f">
            <span class="ef-f__label">Organisation</span>
            <select class="ef-field-input" formControlName="mode">
              <option value="INDIVIDUAL">Individuel</option>
              <option value="PAIR">En binôme</option>
            </select>
          </label>
        </div>

        <label class="ef-f">
          <span class="ef-f__label">Intitulé</span>
          <input class="ef-field-input" formControlName="title" placeholder="ex. Implémenter un tri fusion" />
          @if (err('title'); as e) { <span class="ef-f__err">{{ e }}</span> }
        </label>

        @if (!assignment()) {
          <label class="ef-f">
            <span class="ef-f__label">Module</span>
            <select class="ef-field-input" formControlName="courseId">
              <option [ngValue]="null" disabled>Choisir un module</option>
              @for (c of courses(); track c.id) {
                <option [ngValue]="c.id">{{ c.code }} · {{ c.title }}</option>
              }
            </select>
            @if (err('courseId'); as e) { <span class="ef-f__err">{{ e }}</span> }
          </label>
        }

        <div class="ef-form-row">
          <label class="ef-f">
            <span class="ef-f__label">Date de remise</span>
            <input class="ef-field-input" type="datetime-local" formControlName="deadline" />
          </label>
          <label class="ef-f">
            <span class="ef-f__label">Note maximale</span>
            <input class="ef-field-input" type="number" min="1" step="0.5" formControlName="maxPoints" />
            @if (err('maxPoints'); as e) { <span class="ef-f__err">{{ e }}</span> }
          </label>
        </div>

        <label class="ef-f">
          <span class="ef-f__label">Consignes</span>
          <textarea class="ef-field-input" rows="4" formControlName="instructions" placeholder="Que doivent rendre les élèves ?"></textarea>
        </label>

        <div class="ef-f">
          <span class="ef-f__label">Sujet (facultatif)</span>
          <label class="drop">
            <input type="file" hidden (change)="pick($event)" />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.4 18.4A5 5 0 0 0 18 9h-1.3A8 8 0 1 0 3 16.3" /></svg>
            @if (file(); as f) {
              <span><strong>{{ f.name }}</strong> · {{ size(f.size) }}</span>
            } @else if (assignment()?.brief) {
              <span>Actuel : <strong>{{ assignment()!.brief!.originalFilename }}</strong> — cliquer pour remplacer</span>
            } @else {
              <span>Joindre la fiche du sujet (PDF, ZIP…)</span>
            }
          </label>
        </div>

        <label class="ef-check">
          <input type="checkbox" formControlName="allowLate" />
          Accepter les rendus après la date limite
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }

        <button type="submit" class="ef-cta ef-form-submit" [disabled]="saving()">
          {{ saving() ? 'Enregistrement…' : assignment() ? 'Enregistrer' : 'Créer le travail' }}
        </button>
      </form>
    </ef-modal>
  `,
  styles: `
    .drop {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px;
      border-radius: 12px;
      border: 2px dashed var(--ef-border);
      background: var(--ef-surface-2);
      font-size: 12.5px;
      color: var(--ef-text-muted);
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .drop:hover { border-color: var(--ef-brand-500); background: var(--ef-tint-green); }
    .drop strong { color: var(--ef-text); }
    .drop svg { flex-shrink: 0; color: var(--ef-brand-600); }
  `,
})
export class AssignmentFormComponent implements OnInit {
  private readonly api = inject(AssignmentsApi);
  private readonly fb = inject(FormBuilder);

  readonly assignment = input<AssignmentDetail | null>(null);
  readonly courses = input<CourseSummary[]>([]);
  readonly closed = output<void>();
  readonly saved = output<AssignmentDetail>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly file = signal<File | null>(null);

  protected readonly form = this.fb.group({
    type: this.fb.nonNullable.control<AssignmentType>('TP'),
    mode: this.fb.nonNullable.control<WorkMode>('PAIR'),
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
    courseId: this.fb.control<number | null>(null),
    deadline: this.fb.nonNullable.control(''),
    maxPoints: this.fb.nonNullable.control(20, [Validators.required, Validators.min(0.01)]),
    instructions: this.fb.nonNullable.control('', Validators.maxLength(10000)),
    allowLate: this.fb.nonNullable.control(false),
  });

  ngOnInit(): void {
    const a = this.assignment();
    if (a) {
      this.form.patchValue({
        type: a.type,
        mode: a.mode,
        title: a.title,
        courseId: a.courseId,
        deadline: toLocalInput(a.deadline),
        maxPoints: Number(a.maxPoints),
        instructions: a.instructions ?? '',
        allowLate: a.allowLate,
      });
    } else {
      this.form.controls.courseId.addValidators(Validators.required);
    }
  }

  /** TP defaults to pairs and devoirs to individual work, as in the design; the admin can override. */
  protected typeChanged(): void {
    this.form.controls.mode.setValue(this.form.controls.type.value === 'TP' ? 'PAIR' : 'INDIVIDUAL');
  }

  protected pick(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
  }

  protected size(bytes: number): string {
    return formatSize(bytes);
  }

  protected err(name: 'title' | 'courseId' | 'maxPoints'): string | null {
    const ctrl = this.form.controls[name];
    if (ctrl.touched && ctrl.errors?.['min']) {
      return 'Doit être supérieure à 0';
    }
    return errorMessageFor(ctrl);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = {
      title: v.title,
      instructions: v.instructions.trim() || null,
      type: v.type,
      mode: v.mode,
      deadline: fromLocalInput(v.deadline),
      maxPoints: v.maxPoints,
      allowLate: v.allowLate,
    };
    const existing = this.assignment();
    const file = this.file();
    this.saving.set(true);
    this.formError.set(null);
    (existing ? this.api.update(existing.id, body) : this.api.create(v.courseId!, body))
      .pipe(switchMap((a): Observable<AssignmentDetail> => (file ? this.api.attachBrief(a.id, file) : of(a))))
      .subscribe({
        next: (a) => {
          this.saving.set(false);
          this.saved.emit(a);
        },
        error: (e: ApiError) => {
          this.saving.set(false);
          const rest = applyServerErrors(this.form, e.fieldErrors);
          this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
        },
      });
  }
}
