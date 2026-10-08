import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { Level } from '../../core/models/user.model';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { CoursesApi } from './courses.api';
import { COURSE_COLORS, CourseDetail } from './courses.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';

/** Create a module, or edit one when `course` is given. */
@Component({
  selector: 'ef-course-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal [heading]="course() ? 'Modifier le module' : 'Nouveau module'" (closed)="closed.emit()">
      <form class="form" [formGroup]="form" (ngSubmit)="save()">
        <label class="f">
          <span class="f__label">Intitulé du module</span>
          <input class="ef-field-input" formControlName="title" placeholder="ex. Algorithmique et programmation" />
          @if (err('title'); as e) { <span class="f__err">{{ e }}</span> }
        </label>
        <label class="f">
          <span class="f__label">Code du module</span>
          <input class="ef-field-input" formControlName="code" placeholder="ex. INF201" (input)="upper()" />
          @if (err('code'); as e) { <span class="f__err">{{ e }}</span> } @else {
            <span class="f__hint">Majuscules, chiffres et tirets uniquement.</span>
          }
        </label>
        <label class="f">
          <span class="f__label">Niveau</span>
          <select class="ef-field-input" formControlName="level">
            @for (opt of levels(); track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        </label>
        <div class="f">
          <span class="f__label">Couleur</span>
          <div class="swatches">
            @for (c of colors; track c) {
              <button
                type="button"
                class="swatch"
                [class.swatch--on]="form.controls.color.value === c"
                [style.background]="c"
                [title]="c"
                (click)="form.controls.color.setValue(c)"
              ></button>
            }
          </div>
        </div>
        <label class="f">
          <span class="f__label">Description</span>
          <textarea class="ef-field-input" rows="3" formControlName="description" placeholder="Que vont apprendre les élèves ?"></textarea>
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }

        <button type="submit" class="ef-cta submit" [disabled]="saving()">
          {{ saving() ? 'Enregistrement…' : course() ? 'Enregistrer' : 'Créer le module' }}
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
    .f__hint { font-size: 11.5px; color: var(--ef-text-subtle); }
    .swatches { display: flex; gap: 8px; flex-wrap: wrap; }
    .swatch {
      width: 28px;
      height: 28px;
      border-radius: 9px;
      border: 3px solid transparent;
      transition: transform 0.15s;
    }
    .swatch:hover { transform: translateY(-2px); }
    .swatch--on { border-color: var(--ef-surface); box-shadow: 0 0 0 2px var(--ef-brand-500); }
    .submit { justify-content: center; width: 100%; padding: 13px; font-size: 14px; margin-top: 3px; }
  `,
})
export class CourseFormComponent implements OnInit {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(CoursesApi);
  private readonly fb = inject(FormBuilder);

  readonly course = input<CourseDetail | null>(null);
  readonly defaultLevel = input<Level>('');
  readonly closed = output<void>();
  readonly saved = output<CourseDetail>();

  protected readonly levels = this.catalog.options;
  protected readonly colors = COURSE_COLORS;
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    code: ['', [Validators.required, Validators.maxLength(20), Validators.pattern(/^[A-Z0-9-]+$/)]],
    level: ['' as Level, Validators.required],
    color: [COURSE_COLORS[0]],
    description: ['', Validators.maxLength(2000)],
  });

  ngOnInit(): void {
    const c = this.course();
    if (c) {
      this.form.setValue({
        title: c.title,
        code: c.code,
        level: c.level,
        color: c.color || COURSE_COLORS[0],
        description: c.description ?? '',
      });
    } else {
      this.form.controls.level.setValue(this.defaultLevel());
    }
  }

  protected upper(): void {
    const ctrl = this.form.controls.code;
    ctrl.setValue(ctrl.value.toUpperCase(), { emitEvent: false });
  }

  protected err(name: keyof typeof this.form.controls): string | null {
    const ctrl = this.form.controls[name];
    if (name === 'code' && ctrl.touched && ctrl.errors?.['pattern']) {
      return 'Majuscules, chiffres et tirets uniquement';
    }
    return errorMessageFor(ctrl);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body = { ...v, description: v.description.trim() || null };
    const existing = this.course();
    this.saving.set(true);
    this.formError.set(null);
    (existing ? this.api.update(existing.id, body) : this.api.create(body)).subscribe({
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
