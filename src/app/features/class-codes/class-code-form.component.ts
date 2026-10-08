import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { Level } from '../../core/models/user.model';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { ClassCodesApi } from './class-codes.api';
import { ClassCode } from './class-codes.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';

@Component({
  selector: 'ef-class-code-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal heading="Nouveau code de classe" (closed)="closed.emit()">
      <form class="ef-form" [formGroup]="form" (ngSubmit)="save()">
        <label class="ef-f">
          <span class="ef-f__label">Code</span>
          <input class="ef-field-input" formControlName="code" placeholder="ex. INFO2-2026" autocapitalize="characters" />
          @if (err('code'); as e) { <span class="ef-f__err">{{ e }}</span> }
          <span class="ef-f__hint">Lettres, chiffres et tirets. Les élèves le saisiront à la main.</span>
        </label>
        <label class="ef-f">
          <span class="ef-f__label">Niveau</span>
          <select class="ef-field-input" formControlName="level">
            @for (l of levels(); track l.value) {
              <option [value]="l.value">{{ l.label }}</option>
            }
          </select>
        </label>
        <label class="ef-f">
          <span class="ef-f__label">Libellé</span>
          <input class="ef-field-input" formControlName="label" placeholder="Facultatif — ex. Rentrée 2026" />
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }
        <button type="submit" class="ef-cta ef-form-submit" [disabled]="saving()">
          {{ saving() ? 'Création…' : 'Créer le code' }}
        </button>
      </form>
    </ef-modal>
  `,
})
export class ClassCodeFormComponent implements OnInit {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(ClassCodesApi);
  private readonly fb = inject(FormBuilder);

  readonly defaultLevel = input.required<Level>();
  readonly closed = output<void>();
  readonly saved = output<ClassCode>();

  protected readonly levels = this.catalog.options;
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.maxLength(40), Validators.pattern(/^[A-Za-z0-9-]+$/)]],
    level: this.fb.nonNullable.control<Level>(''),
    label: ['', Validators.maxLength(255)],
  });

  ngOnInit(): void {
    this.form.controls.level.setValue(this.defaultLevel());
  }

  protected err(name: 'code'): string | null {
    const ctrl = this.form.controls[name];
    if (ctrl.touched && ctrl.errors?.['pattern']) {
      return 'Uniquement des lettres, des chiffres et des tirets';
    }
    return errorMessageFor(ctrl);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set(null);
    this.api.create({ code: v.code.trim(), level: v.level, label: v.label.trim() || null }).subscribe({
      next: (c) => {
        this.saving.set(false);
        this.saved.emit(c);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }
}
