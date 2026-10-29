import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { CouponsApi } from './coupons.api';
import { CouponBatch } from './coupons.model';

/** Generates one coupon per printed copy of a book. */
@Component({
  selector: 'ef-coupon-batch-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal heading="Nouveau lot de coupons" subtitle="Un coupon par exemplaire imprimé" (closed)="closed.emit()">
      <form class="ef-form" [formGroup]="form" (ngSubmit)="save()">
        <label class="ef-f">
          <span class="ef-f__label">Niveau du livre</span>
          <select class="ef-field-input" formControlName="level">
            <option value="" disabled>Choisissez le niveau</option>
            @for (o of catalog.options(); track o.value) {
              <option [value]="o.value">{{ o.label }}</option>
            }
          </select>
          @if (err('level'); as e) { <span class="ef-f__err">{{ e }}</span> }
          <span class="ef-f__hint">L'élève qui active un de ces livres est inscrit dans ce niveau.</span>
        </label>
        <label class="ef-f">
          <span class="ef-f__label">Nombre d'exemplaires</span>
          <input class="ef-field-input" type="number" min="1" max="2000" formControlName="quantity" placeholder="ex. 200" />
          @if (err('quantity'); as e) { <span class="ef-f__err">{{ e }}</span> }
          <span class="ef-f__hint">Entre 1 et 2000. Chaque exemplaire reçoit son propre QR code et son propre code.</span>
        </label>
        <label class="ef-f">
          <span class="ef-f__label">Titre du livre <span class="opt">(facultatif)</span></span>
          <input class="ef-field-input" formControlName="label" maxlength="255" placeholder="ex. Cours de 7e année" />
          <span class="ef-f__hint">Affiché encadré en haut de chaque page, avec l'année scolaire. Vide : « Cours de » + le niveau.</span>
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }
        <button type="submit" class="ef-cta ef-form-submit" [disabled]="saving()">
          {{ saving() ? 'Génération…' : 'Générer les coupons' }}
        </button>
      </form>
    </ef-modal>
  `,
  styles: `
    .opt { font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--ef-text-subtle); }
  `,
})
export class CouponBatchFormComponent {
  protected readonly catalog = inject(LevelCatalog);
  private readonly api = inject(CouponsApi);
  private readonly fb = inject(FormBuilder);

  readonly closed = output<void>();
  readonly saved = output<CouponBatch>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    level: this.fb.nonNullable.control('', [Validators.required]),
    quantity: this.fb.control<number | null>(null, [Validators.required, Validators.min(1), Validators.max(2000)]),
    label: this.fb.nonNullable.control(''),
  });

  protected err(name: 'level' | 'quantity'): string | null {
    const ctrl = this.form.controls[name];
    if (ctrl.touched && (ctrl.errors?.['min'] || ctrl.errors?.['max'])) {
      return 'Entre 1 et 2000 exemplaires';
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
    this.api.createBatch({ level: v.level, quantity: v.quantity ?? 0, label: v.label.trim() || null }).subscribe({
      next: (batch) => {
        this.saving.set(false);
        this.saved.emit(batch);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }
}
