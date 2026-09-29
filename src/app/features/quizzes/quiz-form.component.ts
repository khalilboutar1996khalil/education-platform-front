import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { CourseSummary } from '../courses/courses.model';
import { QuizzesApi } from './quizzes.api';
import { QuizDetail, fromLocalInput, toLocalInput } from './quizzes.model';

/** Create a quiz (as a draft) in one of `courses`, or edit the settings of `quiz`. */
@Component({
  selector: 'ef-quiz-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal [heading]="quiz() ? 'Paramètres du quiz' : 'Nouveau quiz'" (closed)="closed.emit()">
      <form class="ef-form" [formGroup]="form" (ngSubmit)="save()">
        <label class="ef-f">
          <span class="ef-f__label">Titre du quiz</span>
          <input class="ef-field-input" formControlName="title" placeholder="ex. Parcours de graphes" />
          @if (err('title'); as e) { <span class="ef-f__err">{{ e }}</span> }
        </label>

        @if (!quiz()) {
          <label class="ef-f">
            <span class="ef-f__label">Module</span>
            <select class="ef-field-input" formControlName="courseId">
              <option [ngValue]="null" disabled>Choisir un module</option>
              @for (c of courses(); track c.id) {
                <option [ngValue]="c.id">{{ c.code }} · {{ c.title }}</option>
              }
            </select>
            @if (err('courseId'); as e) { <span class="ef-f__err">{{ e }}</span> }
            @if (!courses().length) { <span class="ef-f__hint">Créez d'abord un module pour ce niveau.</span> }
          </label>
        }

        <label class="ef-f">
          <span class="ef-f__label">Description</span>
          <textarea class="ef-field-input" rows="2" formControlName="description" placeholder="Consignes visibles par les élèves"></textarea>
        </label>

        <div class="ef-form-row">
          <label class="ef-f">
            <span class="ef-f__label">Durée (minutes)</span>
            <input class="ef-field-input" type="number" min="1" formControlName="durationMinutes" placeholder="Sans limite" />
            @if (err('durationMinutes'); as e) { <span class="ef-f__err">{{ e }}</span> }
          </label>
          <label class="ef-f">
            <span class="ef-f__label">Tentatives autorisées</span>
            <input class="ef-field-input" type="number" min="1" formControlName="maxAttempts" />
            @if (err('maxAttempts'); as e) { <span class="ef-f__err">{{ e }}</span> }
          </label>
        </div>

        <div class="ef-form-row">
          <label class="ef-f">
            <span class="ef-f__label">Ouverture</span>
            <input class="ef-field-input" type="datetime-local" formControlName="opensAt" />
          </label>
          <label class="ef-f">
            <span class="ef-f__label">Date limite</span>
            <input class="ef-field-input" type="datetime-local" formControlName="deadline" />
            @if (err('deadline'); as e) { <span class="ef-f__err">{{ e }}</span> }
          </label>
        </div>

        <label class="ef-check">
          <input type="checkbox" formControlName="shuffleQuestions" />
          Mélanger l'ordre des questions
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }

        <button type="submit" class="ef-cta ef-form-submit" [disabled]="saving()">
          {{ saving() ? 'Enregistrement…' : quiz() ? 'Enregistrer' : 'Créer le quiz' }}
        </button>
      </form>
    </ef-modal>
  `,
})
export class QuizFormComponent implements OnInit {
  private readonly api = inject(QuizzesApi);
  private readonly fb = inject(FormBuilder);

  readonly quiz = input<QuizDetail | null>(null);
  readonly courses = input<CourseSummary[]>([]);
  readonly closed = output<void>();
  readonly saved = output<QuizDetail>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
    courseId: this.fb.control<number | null>(null),
    description: this.fb.nonNullable.control('', Validators.maxLength(2000)),
    durationMinutes: this.fb.control<number | null>(null, Validators.min(1)),
    maxAttempts: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    opensAt: this.fb.nonNullable.control(''),
    deadline: this.fb.nonNullable.control(''),
    shuffleQuestions: this.fb.nonNullable.control(false),
  });

  ngOnInit(): void {
    const q = this.quiz();
    if (q) {
      this.form.patchValue({
        title: q.title,
        courseId: q.courseId,
        description: q.description ?? '',
        durationMinutes: q.durationMinutes,
        maxAttempts: q.maxAttempts,
        opensAt: toLocalInput(q.opensAt),
        deadline: toLocalInput(q.deadline),
        shuffleQuestions: q.shuffleQuestions,
      });
    } else {
      this.form.controls.courseId.addValidators(Validators.required);
    }
  }

  protected err(name: 'title' | 'courseId' | 'durationMinutes' | 'maxAttempts' | 'deadline'): string | null {
    const ctrl = this.form.controls[name];
    if (ctrl.touched && ctrl.errors?.['min']) {
      return 'Doit être au moins 1';
    }
    return errorMessageFor(ctrl);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    if (v.opensAt && v.deadline && v.deadline <= v.opensAt) {
      this.form.controls.deadline.setErrors({ server: "Doit être après l'ouverture" });
      this.form.controls.deadline.markAsTouched();
      return;
    }
    const body = {
      title: v.title,
      description: v.description.trim() || null,
      durationMinutes: v.durationMinutes || null,
      maxAttempts: v.maxAttempts,
      opensAt: fromLocalInput(v.opensAt),
      deadline: fromLocalInput(v.deadline),
      shuffleQuestions: v.shuffleQuestions,
    };
    const existing = this.quiz();
    this.saving.set(true);
    this.formError.set(null);
    (existing ? this.api.update(existing.id, body) : this.api.create(v.courseId!, body)).subscribe({
      next: (quiz) => {
        this.saving.set(false);
        this.saved.emit(quiz);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }
}
