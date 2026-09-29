import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, debounceTime, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api.model';
import { ToastService } from '../../core/services/toast.service';
import { PagerComponent } from '../../shared/ui/pager.component';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { coverFor } from '../courses/courses.model';
import { BlogApi } from './blog.api';
import { BlogCategory, BlogPost } from './blog.model';
import { CategoryManagerComponent } from './category-manager.component';
import { PostFormComponent, PostSaved } from './post-form.component';

const PAGE_SIZE = 12;

@Component({
  selector: 'ef-blog-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, RouterLink, SpinnerComponent, PagerComponent, PostFormComponent, CategoryManagerComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Blog</div>
          <div class="ef-page-sub">{{ isAdmin() ? 'Articles, brouillons et catégories' : 'Conseils, méthodes et vie de la section' }}</div>
        </div>
        @if (isAdmin()) {
          <div class="head-actions">
            <button type="button" class="ef-outline" (click)="managing.set(true)">Catégories</button>
            <button type="button" class="ef-cta" (click)="writing.set(true)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
              Écrire un article
            </button>
          </div>
        }
      </div>

      <div class="ef-search search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
        <input [ngModel]="query()" (ngModelChange)="setQuery($event)" placeholder="Rechercher un article…" />
      </div>
      @if (categories().length) {
        <div class="tags">
          <button type="button" class="tag" [class.tag--on]="categoryId() === null" (click)="setCategory(null)">Tous</button>
          @for (c of categories(); track c.id) {
            <button type="button" class="tag" [class.tag--on]="categoryId() === c.id" (click)="setCategory(c.id)">{{ c.name }}</button>
          }
        </div>
      }

      @if (loading() && !posts().length) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Impossible de charger le blog</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="reload()">Réessayer</button>
        </div>
      } @else if (!posts().length) {
        <div class="ef-empty">
          @if (query() || categoryId() !== null) {
            <div class="ef-empty__title">Aucun article ne correspond</div>
            <div class="ef-empty__text">Ajustez votre recherche ou votre catégorie.</div>
            <button type="button" class="ef-soft-btn" (click)="resetFilters()">Réinitialiser les filtres</button>
          } @else {
            <div class="ef-empty__title">Aucun article pour l'instant</div>
            <div class="ef-empty__text">
              {{ isAdmin() ? (categories().length ? 'Écrivez le premier article de la section.' : 'Créez d’abord une catégorie, puis écrivez votre premier article.') : 'Les articles publiés apparaîtront ici.' }}
            </div>
            @if (isAdmin()) {
              <button type="button" class="ef-soft-btn" (click)="categories().length ? writing.set(true) : managing.set(true)">
                {{ categories().length ? 'Écrire un article' : 'Créer une catégorie' }}
              </button>
            }
          }
        </div>
      } @else {
        <div class="grid" [class.grid--busy]="loading()">
          @for (p of posts(); track p.id; let i = $index) {
            <a class="card" [routerLink]="['/app/blog', p.id]">
              <div class="cover" [style.background]="cover(p, i)">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
                <span class="cover__tag">{{ p.category.name }}</span>
                @if (p.status === 'DRAFT') {
                  <span class="cover__draft">BROUILLON</span>
                }
              </div>
              <div class="body">
                <div class="title">{{ p.title }}</div>
                @if (p.excerpt) {
                  <div class="excerpt">{{ p.excerpt }}</div>
                }
                <div class="meta">
                  <span class="av">{{ p.author.initials }}</span>
                  <div class="meta__main">
                    <div class="meta__name">{{ p.author.fullName }}</div>
                    <div class="meta__sub">{{ p.publishedAt ? (p.publishedAt | date: 'd MMM y') : 'Non publié' }} · {{ p.readMinutes }} min de lecture</div>
                  </div>
                  <span class="views" title="Lectures">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    {{ p.viewCount }}
                  </span>
                </div>
              </div>
            </a>
          }
        </div>
        <ef-pager [page]="page()" [totalPages]="totalPages()" (go)="page.set($event)" />
      }
    </div>

    @if (writing()) {
      <ef-post-form [categories]="categories()" (closed)="writing.set(false)" (saved)="saved($event)" (manageCategories)="managing.set(true)" />
    }
    @if (managing()) {
      <ef-category-manager [categories]="categories()" (closed)="managing.set(false)" (changed)="categoriesChanged()" />
    }
  `,
  styles: `
    .head-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .search { max-width: 340px; flex: none; margin-bottom: 12px; }
    .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .tag { padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; color: var(--ef-text-muted); background: var(--ef-surface); border: 1px solid var(--ef-border); transition: transform 0.2s, background 0.2s, color 0.2s; }
    .tag:hover { transform: translateY(-2px); }
    .tag--on { color: #fff; background: var(--ef-gradient-brand); border-color: var(--ef-brand-700); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(285px, 1fr)); gap: 16px; transition: opacity 0.2s; }
    .grid--busy { opacity: 0.55; }
    .card {
      display: block;
      overflow: hidden;
      border-radius: 17px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      color: inherit;
      text-decoration: none;
      transition: transform 0.26s var(--ef-ease-spring), box-shadow 0.26s, border-color 0.26s;
      animation: ef-fade-up 0.45s ease backwards;
    }
    .card:hover { transform: translateY(-5px); box-shadow: 0 18px 38px rgba(6, 60, 30, 0.13); border-color: var(--ef-brand-500); }
    .cover { position: relative; height: 112px; display: flex; align-items: center; justify-content: center; }
    .cover__tag { position: absolute; top: 11px; left: 12px; padding: 4px 9px; border-radius: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; color: #fff; background: rgba(0, 0, 0, 0.26); backdrop-filter: blur(4px); }
    .cover__draft { position: absolute; top: 11px; right: 12px; padding: 4px 9px; border-radius: 7px; font-size: 10px; font-weight: 800; color: #854d0e; background: #fef08a; }
    .body { padding: 16px; }
    .title { margin-bottom: 7px; font-family: var(--ef-font-display); font-size: 14.5px; font-weight: 700; line-height: 1.35; color: var(--ef-text); }
    .excerpt { margin-bottom: 13px; font-size: 12.5px; line-height: 1.6; color: var(--ef-text-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .meta { display: flex; align-items: center; gap: 9px; }
    .av { width: 26px; height: 26px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 9.5px; font-weight: 800; color: #fff; background: var(--ef-gradient-brand); }
    .meta__main { flex: 1; min-width: 0; }
    .meta__name { font-size: 11.5px; font-weight: 700; color: var(--ef-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .meta__sub { font-size: 10.5px; color: var(--ef-text-muted); }
    .views { display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--ef-text-muted); }
  `,
})
export class BlogListComponent {
  private readonly api = inject(BlogApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly categories = signal<BlogCategory[]>([]);
  protected readonly posts = signal<BlogPost[]>([]);
  protected readonly totalPages = signal(0);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly query = signal('');
  protected readonly categoryId = signal<number | null>(null);
  protected readonly page = signal(0);
  private readonly reloads = signal(0);

  protected readonly writing = signal(false);
  protected readonly managing = signal(false);

  private readonly criteria = computed(() => ({
    categoryId: this.categoryId(),
    search: this.query().trim(),
    page: this.page(),
    reload: this.reloads(),
  }));

  constructor() {
    this.loadCategories();
    toObservable(this.criteria)
      .pipe(
        debounceTime(250),
        tap(() => {
          this.loading.set(true);
          this.error.set(null);
        }),
        switchMap((c) =>
          this.api.list({ categoryId: c.categoryId, search: c.search, page: c.page, size: PAGE_SIZE }).pipe(
            catchError((e: ApiError) => {
              this.error.set(e.detail);
              this.posts.set([]);
              this.loading.set(false);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((p) => {
        this.posts.set(p.content);
        this.totalPages.set(p.totalPages);
        this.loading.set(false);
      });
  }

  protected setQuery(v: string): void {
    this.query.set(v);
    this.page.set(0);
  }

  protected setCategory(id: number | null): void {
    this.categoryId.set(id);
    this.page.set(0);
  }

  protected resetFilters(): void {
    this.query.set('');
    this.setCategory(null);
  }

  protected reload(): void {
    this.reloads.update((n) => n + 1);
  }

  protected cover(p: BlogPost, i: number): string {
    return coverFor(p.category.color, i);
  }

  protected saved(r: PostSaved): void {
    this.writing.set(false);
    if (r.publishError) {
      this.toast.error(`Enregistré en brouillon, mais non publié : ${r.publishError}`);
    } else {
      this.toast.success(r.post.status === 'PUBLISHED' ? 'Article publié' : 'Brouillon enregistré');
    }
    this.reload();
  }

  protected categoriesChanged(): void {
    this.loadCategories();
    this.reload();
  }

  private loadCategories(): void {
    this.api.categories().subscribe({
      next: (list) => {
        this.categories.set(list);
        if (this.categoryId() !== null && !list.some((c) => c.id === this.categoryId())) {
          this.setCategory(null);
        }
      },
    });
  }
}
