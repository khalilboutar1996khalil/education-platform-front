import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api.model';
import { LEVEL_LABELS } from '../../core/models/user.model';
import { LevelService } from '../../core/services/level.service';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CourseFormComponent } from './course-form.component';
import { CoursesApi } from './courses.api';
import { CourseDetail, CourseSummary, coverFor } from './courses.model';

@Component({
  selector: 'ef-course-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SpinnerComponent, CourseFormComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">{{ heading() }}</div>
          <div class="ef-page-sub">{{ subtitle() }}</div>
        </div>
        @if (isAdmin()) {
          <button type="button" class="ef-cta" (click)="creating.set(true)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Créer un module
          </button>
        }
      </div>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Impossible de charger les modules</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
        </div>
      } @else if (!cards().length) {
        <div class="ef-empty">
          <div class="ef-empty__title">Aucun module pour ce niveau</div>
          <div class="ef-empty__text">
            {{ isAdmin() ? 'Créez le premier module de ' + levelLabel() + '.' : 'Vos modules apparaîtront ici.' }}
          </div>
          @if (isAdmin()) {
            <button type="button" class="ef-soft-btn" (click)="creating.set(true)">Créer un module</button>
          }
        </div>
      } @else {
        <div class="grid">
          @for (c of cards(); track c.id) {
            <a class="card" [routerLink]="['/app/courses', c.id]">
              <div class="card__cover" [style.background]="c.cover">
                <span class="card__level">{{ c.levelShort }}</span>
                <span class="card__code">{{ c.code }}</span>
              </div>
              <div class="card__body">
                <div class="card__title">{{ c.title }}</div>
                <div class="card__meta">
                  <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    {{ c.chapterCount }} chapitres
                  </span>
                  <span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    {{ c.lessonCount }} leçons
                  </span>
                </div>
                <div class="ef-track"><div class="ef-track__fill" [style.width.%]="c.progress" [style.background]="c.barColor"></div></div>
                <div class="card__foot">
                  <span>{{ c.progressLabel }}</span>
                  <span class="card__open">Ouvrir →</span>
                </div>
              </div>
            </a>
          }
        </div>
      }
    </div>

    @if (creating()) {
      <ef-course-form [defaultLevel]="levels.current()" (closed)="creating.set(false)" (saved)="created($event)" />
    }
  `,
  styles: `
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
      gap: 15px;
    }

    .card {
      display: block;
      overflow: hidden;
      border-radius: 17px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      color: inherit;
      transition: transform 0.26s var(--ef-ease-spring), box-shadow 0.26s, border-color 0.26s;
      animation: ef-fade-up 0.45s ease backwards;
    }

    .card:hover {
      color: inherit;
      transform: translateY(-5px);
      box-shadow: 0 18px 38px rgba(6, 60, 30, 0.13);
      border-color: var(--ef-brand-500);
    }

    .card__cover {
      position: relative;
      height: 78px;
      display: flex;
      align-items: flex-end;
      padding: 12px 15px;
    }

    .card__level {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #fff;
      background: rgba(0, 0, 0, 0.25);
      backdrop-filter: blur(4px);
      padding: 3px 9px;
      border-radius: 7px;
    }

    .card__code {
      position: absolute;
      top: 10px;
      right: 12px;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      color: rgba(255, 255, 255, 0.9);
    }

    .card__body {
      padding: 16px;
    }

    .card__title {
      font-family: var(--ef-font-display);
      font-size: 14.5px;
      font-weight: 700;
      line-height: 1.3;
      color: var(--ef-text);
      margin-bottom: 9px;
    }

    .card__meta {
      display: flex;
      gap: 13px;
      flex-wrap: wrap;
      margin-bottom: 13px;
    }

    .card__meta span {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    .ef-track {
      margin-bottom: 7px;
    }

    .card__foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    .card__open {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--ef-ink-green);
    }
  `,
})
export class CourseListComponent {
  private readonly api = inject(CoursesApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly levels = inject(LevelService);

  protected readonly courses = signal<CourseSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly creating = signal(false);

  protected readonly isAdmin = this.auth.isAdmin;
  protected readonly levelLabel = computed(() => LEVEL_LABELS[this.levels.current()]);

  protected readonly heading = computed(() => (this.isAdmin() ? `Modules · ${this.levelLabel()}` : 'Mes modules'));

  protected readonly subtitle = computed(() => {
    const list = this.courses();
    const lessons = list.reduce((n, c) => n + c.lessonCount, 0);
    return `${list.length} module(s) · ${lessons} leçons`;
  });

  protected readonly cards = computed(() =>
    this.courses().map((c, i) => {
      const progress = (this.isAdmin() ? c.classAveragePercent : c.progressPercent) ?? 0;
      return {
        ...c,
        cover: coverFor(c.color, i),
        barColor: c.color || 'var(--ef-brand-500)',
        levelShort: LEVEL_LABELS[c.level].replace('informatique', 'info'),
        progress,
        progressLabel: this.isAdmin() ? `${progress}% · moyenne de la classe` : `${progress}% terminé`,
      };
    }),
  );

  constructor() {
    // Admins follow the header's level; a student's list is already scoped by the backend.
    effect(() => {
      this.levels.current();
      this.load();
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list(this.isAdmin() ? this.levels.current() : undefined).subscribe({
      next: (page) => {
        this.courses.set(page.content);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail);
        this.loading.set(false);
      },
    });
  }

  protected created(course: CourseDetail): void {
    this.creating.set(false);
    this.toast.success('Module créé');
    if (course.level !== this.levels.current()) {
      this.levels.current.set(course.level);
    }
    this.router.navigate(['/app/courses', course.id]);
  }
}
