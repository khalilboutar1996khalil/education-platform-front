import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { CoursesApi } from './courses.api';
import { Chapter, CourseDetail } from './courses.model';

/** Add a chapter to a module, or edit one when `chapter` is given. */
@Component({
  selector: 'ef-chapter-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal [heading]="chapter() ? 'Modifier le chapitre' : 'Ajouter un chapitre'" (closed)="closed.emit()">
      <form class="form" [formGroup]="form" (ngSubmit)="save()">
        <label class="f">
          <span class="f__label">Titre du chapitre</span>
          <input class="ef-field-input" formControlName="title" placeholder="ex. Tables de hachage" />
          @if (err('title'); as e) { <span class="f__err">{{ e }}</span> }
        </label>
        <label class="f">
          <span class="f__label">Position</span>
          <select class="ef-field-input" formControlName="position">
            @if (!chapter()) {
              <option [ngValue]="null">À la fin du module</option>
            }
            @for (p of positions(); track p) {
              <option [ngValue]="p">{{ p === 1 ? 'En premier' : 'Position ' + p }}</option>
            }
          </select>
        </label>
        <label class="f">
          <span class="f__label">Résumé</span>
          <textarea class="ef-field-input" rows="3" formControlName="summary" placeholder="Une ou deux lignes visibles par les élèves"></textarea>
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }

        <button type="submit" class="ef-cta submit" [disabled]="saving()">
          {{ saving() ? 'Enregistrement…' : chapter() ? 'Enregistrer' : 'Ajouter le chapitre' }}
        </button>
      </form>
    </ef-modal>
  `,
  styles: `
    .form { display: grid; gap: 13px; }
    .f { display: flex; flex-direction: column; gap: 6px; }
    .f__label {
      font-size: 10.5px;
      font-weight: 800;
      color: var(--ef-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .f__err { font-size: 12px; font-weight: 600; color: var(--ef-ink-red); }
    .submit { justify-content: center; width: 100%; padding: 13px; font-size: 14px; margin-top: 3px; }
  `,
})
export class ChapterFormComponent implements OnInit {
  private readonly api = inject(CoursesApi);
  private readonly fb = inject(FormBuilder);

  readonly course = input.required<CourseDetail>();
  readonly chapter = input<Chapter | null>(null);
  readonly closed = output<void>();
  readonly saved = output<CourseDetail>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
    summary: this.fb.nonNullable.control('', Validators.maxLength(1000)),
    position: this.fb.control<number | null>(null),
  });

  /** New chapters can go anywhere up to count + 1; existing ones move among count slots. */
  protected positions(): number[] {
    const count = this.course().chapters.length + (this.chapter() ? 0 : 1);
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  ngOnInit(): void {
    const ch = this.chapter();
    if (ch) {
      this.form.setValue({ title: ch.title, summary: ch.summary ?? '', position: ch.position });
    }
  }

  protected err(name: 'title'): string | null {
    return errorMessageFor(this.form.controls[name]);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { title: v.title, summary: v.summary.trim() || null, position: v.position };
    const existing = this.chapter();
    this.saving.set(true);
    this.formError.set(null);
    (existing ? this.api.updateChapter(existing.id, body) : this.api.addChapter(this.course().id, body)).subscribe({
      next: (course) => {
        this.saving.set(false);
        this.saved.emit(course);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }
}
