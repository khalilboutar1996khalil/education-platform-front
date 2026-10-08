import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { SchoolLevel } from '../../core/models/level.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';

/** Creates a level, or renames / reorders one. The code is fixed once created. */
@Component({
  selector: 'ef-level-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal [heading]="level() ? 'Modifier le niveau' : 'Nouveau niveau'" (closed)="closed.emit()">
      <form class="ef-form" [formGroup]="form" (ngSubmit)="save()">
        <label class="ef-f">
          <span class="ef-f__label">Nom</span>
          <input class="ef-field-input" formControlName="name" placeholder="ex. 5ᵉ année de base informatique" />
          @if (err('name'); as e) { <span class="ef-f__err">{{ e }}</span> }
        </label>
        <label class="ef-f">
          <span class="ef-f__label">Code</span>
          <input class="ef-field-input" formControlName="code" placeholder="ex. FIFTH_BASE" autocapitalize="characters" />
          @if (err('code'); as e) { <span class="ef-f__err">{{ e }}</span> }
          <span class="ef-f__hint">
            {{ level() ? 'Le code ne change plus : élèves, modules et codes de classe y sont rattachés.'
                       : 'Lettres, chiffres et _. Il ne pourra plus être modifié.' }}
          </span>
        </label>
        <label class="ef-f">
          <span class="ef-f__label">Ordre d'affichage</span>
          <input class="ef-field-input" type="number" formControlName="position" placeholder="Vide : à la fin" />
          <span class="ef-f__hint">Les niveaux sont triés par ce nombre, du plus petit au plus grand.</span>
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }
        <button type="submit" class="ef-cta ef-form-submit" [disabled]="saving()">
          {{ saving() ? 'Enregistrement…' : level() ? 'Enregistrer' : 'Créer le niveau' }}
        </button>
      </form>
    </ef-modal>
  `,
})
export class LevelFormComponent implements OnInit {
  private readonly catalog = inject(LevelCatalog);
  private readonly fb = inject(FormBuilder);

  /** The level to edit; absent when creating one. */
  readonly level = input<SchoolLevel | null>(null);
  readonly closed = output<void>();
  readonly saved = output<SchoolLevel>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
    code: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9_]+$/)]),
    position: this.fb.control<number | null>(null),
  });

  ngOnInit(): void {
    const level = this.level();
    if (level) {
      this.form.patchValue({ name: level.name, code: level.code, position: level.position });
      this.form.controls.code.disable();
    }
  }

  protected err(name: 'name' | 'code'): string | null {
    const ctrl = this.form.controls[name];
    if (ctrl.touched && ctrl.errors?.['pattern']) {
      return 'Uniquement des lettres, des chiffres et _';
    }
    return errorMessageFor(ctrl);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const level = this.level();
    const request = level
      ? this.catalog.update(level.id, { name: v.name.trim(), position: v.position ?? level.position })
      : this.catalog.create({ code: v.code.trim().toUpperCase(), name: v.name.trim(), position: v.position });
    this.saving.set(true);
    this.formError.set(null);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.saved.emit(saved);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }
}
