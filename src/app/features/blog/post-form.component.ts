import { ChangeDetectionStrategy, Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { BlogApi } from './blog.api';
import { BlogCategory, BlogPost, BlogPostRequest } from './blog.model';

export interface PostSaved {
  post: BlogPost;
  /** Set when the article was saved but publishing it failed. */
  publishError?: string;
}

@Component({
  selector: 'ef-post-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal [heading]="post() ? 'Modifier l’article' : 'Écrire un article'" [wide]="true" (closed)="closed.emit()">
      <form class="ef-form" [formGroup]="form" (ngSubmit)="save(!isPublished())">
        <label class="ef-f">
          <span class="ef-f__label">Titre de l'article</span>
          <input class="ef-field-input" formControlName="title" maxlength="255" placeholder="ex. Méthode de révision efficace" />
          @if (err('title'); as e) { <span class="ef-f__err">{{ e }}</span> }
          @if (post(); as p) { <span class="ef-f__hint">Adresse : /blog/{{ p.slug }} — elle ne change pas si vous modifiez le titre.</span> }
        </label>

        <label class="ef-f">
          <span class="ef-f__label">Catégorie</span>
          @if (categories().length) {
            <select class="ef-field-input" formControlName="categoryId">
              <option [ngValue]="null" disabled>Choisir une catégorie</option>
              @for (c of categories(); track c.id) {
                <option [ngValue]="c.id">{{ c.name }}</option>
              }
            </select>
          } @else {
            <span class="ef-f__hint">Aucune catégorie pour l'instant.</span>
          }
          @if (err('categoryId'); as e) { <span class="ef-f__err">{{ e }}</span> }
          <button type="button" class="link" (click)="manageCategories.emit()">Gérer les catégories</button>
        </label>

        <label class="ef-f">
          <span class="ef-f__label">Accroche</span>
          <input class="ef-field-input" formControlName="excerpt" maxlength="500" placeholder="Une ligne affichée sur la carte (facultatif)" />
          @if (err('excerpt'); as e) { <span class="ef-f__err">{{ e }}</span> }
        </label>

        <label class="ef-f">
          <span class="ef-f__label">Contenu</span>
          <textarea class="ef-field-input content" formControlName="content" rows="14" placeholder="Rédigez votre article… Laissez une ligne vide entre deux paragraphes."></textarea>
          @if (err('content'); as e) { <span class="ef-f__err">{{ e }}</span> }
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }

        <div class="actions">
          @if (isPublished()) {
            <button type="submit" class="ef-cta" [disabled]="saving()">{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button>
          } @else {
            <button type="button" class="ef-outline" [disabled]="saving()" (click)="save(false)">Enregistrer le brouillon</button>
            <button type="submit" class="ef-cta" [disabled]="saving()">{{ saving() ? 'Envoi…' : 'Publier l’article' }}</button>
          }
        </div>
      </form>
    </ef-modal>
  `,
  styles: `
    .content { min-height: 260px; resize: vertical; line-height: 1.65; }
    .link { align-self: flex-start; margin-top: 2px; font-size: 11.5px; font-weight: 700; color: var(--ef-ink-green); }
    .link:hover { text-decoration: underline; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
  `,
})
export class PostFormComponent implements OnInit {
  private readonly api = inject(BlogApi);
  private readonly fb = inject(FormBuilder);

  /** Full article (with content); null to write a new one. */
  readonly post = input<BlogPost | null>(null);
  readonly categories = input<BlogCategory[]>([]);
  readonly closed = output<void>();
  readonly saved = output<PostSaved>();
  readonly manageCategories = output<void>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
    categoryId: this.fb.control<number | null>(null, Validators.required),
    excerpt: this.fb.nonNullable.control('', Validators.maxLength(500)),
    content: this.fb.nonNullable.control('', Validators.required),
  });

  ngOnInit(): void {
    const p = this.post();
    if (p) {
      this.form.setValue({ title: p.title, categoryId: p.category.id, excerpt: p.excerpt ?? '', content: p.content ?? '' });
    } else if (this.categories().length === 1) {
      this.form.controls.categoryId.setValue(this.categories()[0].id);
    }
  }

  protected isPublished(): boolean {
    return this.post()?.status === 'PUBLISHED';
  }

  protected err(name: 'title' | 'categoryId' | 'excerpt' | 'content'): string | null {
    return errorMessageFor(this.form.controls[name]);
  }

  protected save(publish: boolean): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: BlogPostRequest = {
      title: v.title.trim(),
      excerpt: v.excerpt.trim() || null,
      content: v.content.trim(),
      categoryId: v.categoryId!,
    };
    const existing = this.post();
    this.saving.set(true);
    this.formError.set(null);
    (existing ? this.api.update(existing.id, body) : this.api.create(body)).subscribe({
      next: (post) => {
        if (!publish) {
          this.done({ post });
          return;
        }
        // The article exists now; a failed publish must not let a retry create it twice.
        this.api.publish(post.id).subscribe({
          next: (published) => this.done({ post: published }),
          error: (e: ApiError) => this.done({ post, publishError: e.detail }),
        });
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }

  private done(result: PostSaved): void {
    this.saving.set(false);
    this.saved.emit(result);
  }
}
