import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { Level } from '../../core/models/user.model';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { StudentsApi } from './students.api';
import { InviteStudentResponse } from './students.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';

@Component({
  selector: 'ef-invite-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal heading="Inviter un élève" (closed)="closed.emit()">
      <form class="ef-form" [formGroup]="form" (ngSubmit)="save()">
        <label class="ef-f">
          <span class="ef-f__label">Nom complet</span>
          <input class="ef-field-input" formControlName="fullName" placeholder="ex. Sara Benali" />
          @if (err('fullName'); as e) { <span class="ef-f__err">{{ e }}</span> }
        </label>
        <label class="ef-f">
          <span class="ef-f__label">Adresse e-mail</span>
          <input class="ef-field-input" type="email" formControlName="email" placeholder="eleve@exemple.com" />
          @if (err('email'); as e) { <span class="ef-f__err">{{ e }}</span> }
        </label>
        <label class="ef-f">
          <span class="ef-f__label">Niveau</span>
          <select class="ef-field-input" formControlName="level">
            @for (l of levels(); track l.value) {
              <option [value]="l.value">{{ l.label }}</option>
            }
          </select>
        </label>
        <div class="ef-f__hint">Le compte est créé tout de suite. Un mot de passe temporaire vous sera montré une seule fois.</div>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }
        <button type="submit" class="ef-cta ef-form-submit" [disabled]="saving()">
          {{ saving() ? 'Création…' : 'Créer le compte' }}
        </button>
      </form>
    </ef-modal>
  `,
})
export class InviteFormComponent implements OnInit {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(StudentsApi);
  private readonly fb = inject(FormBuilder);

  readonly defaultLevel = input.required<Level>();
  readonly closed = output<void>();
  readonly invited = output<InviteStudentResponse>();

  protected readonly levels = this.catalog.options;
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    level: this.fb.nonNullable.control<Level>(''),
  });

  ngOnInit(): void {
    this.form.controls.level.setValue(this.defaultLevel());
  }

  protected err(name: 'fullName' | 'email'): string | null {
    return errorMessageFor(this.form.controls[name]);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set(null);
    this.api.invite({ fullName: v.fullName.trim(), email: v.email.trim(), level: v.level }).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.invited.emit(r);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }
}
