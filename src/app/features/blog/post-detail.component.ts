import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api.model';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { coverFor } from '../courses/courses.model';
import { BlogApi } from './blog.api';
import { BlogCategory, BlogPost } from './blog.model';
import { CategoryManagerComponent } from './category-manager.component';
import { PostFormComponent, PostSaved } from './post-form.component';

@Component({
  selector: 'ef-post-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, SpinnerComponent, PostFormComponent, CategoryManagerComponent],
  template: `
    <div class="ef-page wrap">
      <a routerLink="/app/blog" class="back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        Blog
      </a>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Article introuvable</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <a class="ef-soft-btn" routerLink="/app/blog">Retour au blog</a>
        </div>
      } @else if (post()) {
        @let p = post()!;
        <article>
          <div class="hero" [style.background]="cover()">
            <span class="hero__tag">{{ p.category.name }}</span>
            @if (p.status === 'DRAFT') {
              <span class="hero__draft">BROUILLON</span>
            }
            <h1 class="hero__title">{{ p.title }}</h1>
            <div class="hero__meta">
              <span class="av">{{ p.author.initials }}</span>
              <span>{{ p.author.fullName }}</span>
              <span>·</span>
              <span>{{ p.publishedAt ? (p.publishedAt | date: 'd MMMM y') : 'Non publié' }}</span>
              <span>·</span>
              <span>{{ p.readMinutes }} min de lecture</span>
              @if (isAdmin()) {
                <span>·</span>
                <span>{{ p.viewCount }} lecture{{ p.viewCount === 1 ? '' : 's' }}</span>
              }
            </div>
          </div>

          @if (isAdmin()) {
            <div class="tools">
              <button type="button" class="ef-outline" (click)="editing.set(true)">Modifier</button>
              @if (p.status === 'DRAFT') {
                <button type="button" class="ef-cta" [disabled]="busy()" (click)="publish(p)">Publier</button>
              } @else {
                <button type="button" class="ef-outline" [disabled]="busy()" (click)="unpublish(p)">Repasser en brouillon</button>
              }
              <button type="button" class="danger" [disabled]="busy()" (click)="remove(p)">Supprimer</button>
            </div>
          }

          <div class="paper">
            @if (p.excerpt) {
              <p class="lead">{{ p.excerpt }}</p>
            }
            @for (para of paragraphs(); track $index) {
              <p>{{ para }}</p>
            }
          </div>
        </article>
      }
    </div>

    @if (editing() && post(); as p) {
      <ef-post-form [post]="p" [categories]="categories()" (closed)="editing.set(false)" (saved)="saved($event)" (manageCategories)="managing.set(true)" />
    }
    @if (managing()) {
      <ef-category-manager [categories]="categories()" (closed)="managing.set(false)" (changed)="loadCategories()" />
    }
  `,
  styles: `
    .wrap { max-width: 820px; }
    .back { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 14px; font-size: 12.5px; font-weight: 700; color: var(--ef-text-muted); }
    .back:hover { color: var(--ef-ink-green); }
    .hero { position: relative; padding: 46px 28px 24px; border-radius: 20px; color: #fff; }
    .hero__tag { position: absolute; top: 16px; left: 18px; padding: 4px 10px; border-radius: 7px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.05em; background: rgba(0, 0, 0, 0.26); backdrop-filter: blur(4px); }
    .hero__draft { position: absolute; top: 16px; right: 18px; padding: 4px 10px; border-radius: 7px; font-size: 10.5px; font-weight: 800; color: #854d0e; background: #fef08a; }
    .hero__title { margin: 8px 0 14px; font-family: var(--ef-font-display); font-size: 26px; font-weight: 800; line-height: 1.25; letter-spacing: -0.5px; }
    .hero__meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 12px; font-weight: 600; opacity: 0.92; }
    .av { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 7px; font-size: 9.5px; font-weight: 800; background: rgba(255, 255, 255, 0.22); }
    .tools { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0 0; }
    .danger { padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 700; color: var(--ef-text-muted); background: var(--ef-surface-2); }
    .danger:hover:not(:disabled) { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    .paper { margin-top: 16px; padding: 26px 28px; border-radius: 18px; background: var(--ef-surface); border: 1px solid var(--ef-border); }
    .paper p { margin: 0 0 14px; font-size: 14.5px; line-height: 1.8; color: var(--ef-text); white-space: pre-line; overflow-wrap: anywhere; }
    .paper p:last-child { margin-bottom: 0; }
    .paper .lead { font-size: 15.5px; font-weight: 600; color: var(--ef-text-muted); }
    @media (max-width: 560px) {
      .hero { padding: 44px 18px 20px; }
      .hero__title { font-size: 21px; }
      .paper { padding: 20px 18px; }
    }
  `,
})
export class PostDetailComponent {
  private readonly api = inject(BlogApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly id = input.required<string>();

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly post = signal<BlogPost | null>(null);
  protected readonly categories = signal<BlogCategory[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly editing = signal(false);
  protected readonly managing = signal(false);

  protected readonly cover = computed(() => coverFor(this.post()?.category.color ?? null, 0));
  protected readonly paragraphs = computed(() =>
    (this.post()?.content ?? '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
  );

  constructor() {
    effect(() => {
      const id = Number(this.id());
      untracked(() => this.load(id));
    });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    // The admin reads by id so their own visits are not counted; a student goes through the slug, which counts the view.
    const request = this.isAdmin() ? this.api.get(id) : this.api.get(id).pipe(switchMap((p) => this.api.read(p.slug)));
    request.subscribe({
      next: (p) => {
        this.post.set(p);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail);
        this.loading.set(false);
      },
    });
    if (this.isAdmin()) {
      this.loadCategories();
    }
  }

  protected loadCategories(): void {
    this.api.categories().subscribe({ next: (list) => this.categories.set(list) });
  }

  protected saved(r: PostSaved): void {
    this.editing.set(false);
    this.post.set(r.post);
    this.toast.success('Article enregistré');
  }

  protected publish(p: BlogPost): void {
    this.act(this.api.publish(p.id), 'Article publié');
  }

  protected unpublish(p: BlogPost): void {
    if (!confirm('Repasser cet article en brouillon ? Les élèves ne le verront plus. Son adresse et ses lectures sont conservées.')) {
      return;
    }
    this.act(this.api.unpublish(p.id), 'Article repassé en brouillon');
  }

  protected remove(p: BlogPost): void {
    if (!confirm(`Supprimer définitivement « ${p.title} » ?`)) {
      return;
    }
    this.busy.set(true);
    this.api.delete(p.id).subscribe({
      next: () => {
        this.toast.success('Article supprimé');
        this.router.navigate(['/app/blog']);
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        this.toast.error(e.detail);
      },
    });
  }

  private act(request: ReturnType<BlogApi['publish']>, message: string): void {
    this.busy.set(true);
    request.subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.post.set(updated);
        this.toast.success(message);
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        this.toast.error(e.detail);
      },
    });
  }
}
