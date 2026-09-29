import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { CoursesApi } from './courses.api';
import { Chapter, Lesson, LESSON_TYPE_LABELS, LessonType } from './courses.model';

/** Add a lesson to a chapter, or edit one when `lesson` is given. */
@Component({
  selector: 'ef-lesson-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal [heading]="lesson() ? 'Modifier la leçon' : 'Ajouter une leçon'" (closed)="closed.emit()">
      <form class="form" [formGroup]="form" (ngSubmit)="save()">
        <div class="hint">Chapitre {{ chapter().position }} · {{ chapter().title }}</div>
        <label class="f">
          <span class="f__label">Titre de la leçon</span>
          <input class="ef-field-input" formControlName="title" placeholder="ex. Parcours en largeur (BFS)" />
          @if (err('title'); as e) { <span class="f__err">{{ e }}</span> }
        </label>
        <div class="two">
          <label class="f">
            <span class="f__label">Type</span>
            <select class="ef-field-input" formControlName="type">
              @for (t of types; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </label>
          <label class="f">
            <span class="f__label">Durée (minutes)</span>
            <input class="ef-field-input" type="number" min="1" formControlName="durationMinutes" placeholder="20" />
            @if (err('durationMinutes'); as e) { <span class="f__err">{{ e }}</span> }
          </label>
        </div>
        <label class="f">
          <span class="f__label">{{ form.controls.type.value === 'VIDEO' ? 'Lien de la vidéo' : 'Lien du contenu' }}</span>
          <input class="ef-field-input" formControlName="contentUrl" placeholder="https://…" />
          @if (err('contentUrl'); as e) { <span class="f__err">{{ e }}</span> }
        </label>
        <label class="f">
          <span class="f__label">Contenu / consignes</span>
          <textarea class="ef-field-input" rows="4" formControlName="content" placeholder="Texte de la leçon, facultatif"></textarea>
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }

        <button type="submit" class="ef-cta submit" [disabled]="saving()">
          {{ saving() ? 'Enregistrement…' : lesson() ? 'Enregistrer' : 'Ajouter la leçon' }}
        </button>
      </form>
    </ef-modal>
  `,
  styles: `
    .form { display: grid; gap: 13px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .hint {
      font-size: 12px;
      font-weight: 700;
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
      padding: 7px 11px;
      border-radius: 9px;
    }
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
    @media (max-width: 480px) { .two { grid-template-columns: 1fr; } }
  `,
})
export class LessonFormComponent implements OnInit {
  private readonly api = inject(CoursesApi);
  private readonly fb = inject(FormBuilder);

  readonly chapter = input.required<Chapter>();
  readonly lesson = input<Lesson | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Chapter>();

  protected readonly types = (Object.keys(LESSON_TYPE_LABELS) as LessonType[]).map((value) => ({
    value,
    label: LESSON_TYPE_LABELS[value],
  }));
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
    type: this.fb.nonNullable.control<LessonType>('VIDEO'),
    durationMinutes: this.fb.control<number | null>(null, Validators.min(1)),
    contentUrl: this.fb.nonNullable.control('', Validators.maxLength(255)),
    content: this.fb.nonNullable.control('', Validators.maxLength(10000)),
  });

  ngOnInit(): void {
    const l = this.lesson();
    if (l) {
      this.form.setValue({
        title: l.title,
        type: l.type,
        durationMinutes: l.durationMinutes,
        contentUrl: l.contentUrl ?? '',
        content: l.content ?? '',
      });
    }
  }

  protected err(name: 'title' | 'durationMinutes' | 'contentUrl'): string | null {
    const ctrl = this.form.controls[name];
    if (ctrl.touched && ctrl.errors?.['min']) {
      return 'Doit être supérieur à 0';
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
      type: v.type,
      durationMinutes: v.durationMinutes || null,
      contentUrl: v.contentUrl.trim() || null,
      content: v.content.trim() || null,
    };
    const existing = this.lesson();
    this.saving.set(true);
    this.formError.set(null);
    (existing
      ? this.api.updateLesson(existing.id, { ...body, position: existing.position })
      : this.api.addLesson(this.chapter().id, body)
    ).subscribe({
      next: (chapter) => {
        this.saving.set(false);
        this.saved.emit(chapter);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }
}
