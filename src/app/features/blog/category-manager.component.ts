import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/ui/modal.component';
import { BlogApi } from './blog.api';
import { BlogCategory, CATEGORY_COLORS } from './blog.model';

@Component({
  selector: 'ef-category-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent],
  template: `
    <ef-modal heading="Catégories du blog" (closed)="closed.emit()">
      <div class="ef-form">
        @if (categories().length) {
          <div class="list">
            @for (c of categories(); track c.id) {
              <div class="row">
                <span class="dot" [style.background]="c.color || '#16A34A'"></span>
                <span class="row__name">{{ c.name }}</span>
                <button type="button" class="del" title="Supprimer" [disabled]="busy() === c.id" (click)="remove(c)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
                </button>
              </div>
            }
          </div>
          <div class="ef-f__hint">Une catégorie qui contient encore des articles ne peut pas être supprimée.</div>
        } @else {
          <div class="ef-f__hint">Créez au moins une catégorie : chaque article en a une.</div>
        }

        <div class="ef-f">
          <span class="ef-f__label">Nouvelle catégorie</span>
          <div class="add">
            <input class="ef-field-input" maxlength="255" [ngModel]="name()" (ngModelChange)="name.set($event)" placeholder="ex. Révision" (keydown.enter)="add()" />
            <button type="button" class="ef-cta" [disabled]="saving()" (click)="add()">Ajouter</button>
          </div>
          <div class="swatches" role="radiogroup" aria-label="Couleur">
            @for (c of colors; track c) {
              <button type="button" class="sw" role="radio" [attr.aria-checked]="color() === c" [class.sw--on]="color() === c" [style.background]="c" (click)="color.set(c)"></button>
            }
          </div>
          @if (error()) { <span class="ef-f__err">{{ error() }}</span> }
        </div>
      </div>
    </ef-modal>
  `,
  styles: `
    .list { display: flex; flex-direction: column; gap: 6px; }
    .row { display: flex; align-items: center; gap: 10px; padding: 8px 11px; border-radius: 10px; background: var(--ef-surface-2); }
    .dot { width: 12px; height: 12px; border-radius: 4px; flex-shrink: 0; }
    .row__name { flex: 1; font-size: 13px; font-weight: 700; color: var(--ef-text); }
    .del { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: var(--ef-text-muted); }
    .del:hover:not(:disabled) { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    .add { display: flex; gap: 8px; }
    .add .ef-field-input { flex: 1; }
    .swatches { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 8px; }
    .sw { width: 24px; height: 24px; border-radius: 8px; border: 2px solid transparent; transition: transform 0.15s; }
    .sw:hover { transform: scale(1.1); }
    .sw--on { border-color: var(--ef-text); }
  `,
})
export class CategoryManagerComponent {
  private readonly api = inject(BlogApi);
  private readonly toast = inject(ToastService);

  readonly categories = input.required<BlogCategory[]>();
  readonly closed = output<void>();
  readonly changed = output<void>();

  protected readonly colors = CATEGORY_COLORS;
  protected readonly name = signal('');
  protected readonly color = signal(CATEGORY_COLORS[0]);
  protected readonly saving = signal(false);
  protected readonly busy = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);

  protected add(): void {
    const name = this.name().trim();
    if (!name) {
      this.error.set('Donnez un nom à la catégorie');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.api.createCategory({ name, color: this.color() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.name.set('');
        this.changed.emit();
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        this.error.set(e.status === 409 ? 'Une catégorie porte déjà ce nom' : (Object.values(e.fieldErrors)[0] ?? e.detail));
      },
    });
  }

  protected remove(c: BlogCategory): void {
    if (!confirm(`Supprimer la catégorie « ${c.name} » ?`)) {
      return;
    }
    this.busy.set(c.id);
    this.api.deleteCategory(c.id).subscribe({
      next: () => {
        this.busy.set(null);
        this.changed.emit();
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        this.toast.error(e.status === 422 ? 'Cette catégorie contient encore des articles' : e.detail);
      },
    });
  }
}
