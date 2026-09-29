import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { ModalComponent } from '../../shared/ui/modal.component';
import { StudentsApi } from './students.api';
import { AccessRequest } from './students.model';

@Component({
  selector: 'ef-reject-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent],
  template: `
    <ef-modal heading="Refuser la demande" (closed)="closed.emit()">
      <div class="ef-form">
        <div class="ef-f__hint">
          Demande de <strong>{{ request().fullName }}</strong> ({{ request().email }}). Aucun compte ne sera créé.
        </div>
        <label class="ef-f">
          <span class="ef-f__label">Note (pour vous seulement)</span>
          <textarea class="ef-field-input" rows="3" maxlength="1000" [ngModel]="note()" (ngModelChange)="note.set($event)" placeholder="Facultatif — pourquoi la demande est refusée"></textarea>
        </label>
        @if (error()) {
          <div class="ef-alert ef-alert--error">{{ error() }}</div>
        }
        <button type="button" class="ef-cta ef-form-submit" [disabled]="saving()" (click)="reject()">
          {{ saving() ? 'Envoi…' : 'Refuser la demande' }}
        </button>
      </div>
    </ef-modal>
  `,
})
export class RejectDialogComponent {
  private readonly api = inject(StudentsApi);

  readonly request = input.required<AccessRequest>();
  readonly closed = output<void>();
  readonly rejected = output<AccessRequest>();

  protected readonly note = signal('');
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected reject(): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.reject(this.request().id, this.note().trim() || null).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.rejected.emit(r);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        this.error.set(e.detail);
      },
    });
  }
}
