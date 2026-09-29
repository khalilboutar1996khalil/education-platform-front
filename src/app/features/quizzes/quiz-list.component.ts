import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiError } from '../../core/models/api.model';
import { LEVEL_LABELS } from '../../core/models/user.model';
import { LevelService } from '../../core/services/level.service';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CoursesApi } from '../courses/courses.api';
import { CourseSummary } from '../courses/courses.model';
import { QuizFormComponent } from './quiz-form.component';
import { QuizzesApi } from './quizzes.api';
import { QUIZ_STATUS_LABELS, QUIZ_STATUS_TONE, QuizDetail, QuizStatus, QuizSummary } from './quizzes.model';

@Component({
  selector: 'ef-quiz-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, FormsModule, RouterLink, SpinnerComponent, QuizFormComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Quiz</div>
          <div class="ef-page-sub">Créer, publier et suivre les évaluations · {{ levelLabel() }}</div>
        </div>
        <button type="button" class="ef-cta" (click)="creating.set(true)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Créer un quiz
        </button>
      </div>

      <div class="ef-filters">
        <div class="ef-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input [ngModel]="query()" (ngModelChange)="query.set($event)" placeholder="Rechercher un quiz…" />
        </div>
        <select class="ef-select" [ngModel]="courseFilter()" (ngModelChange)="courseFilter.set($event)">
          <option [ngValue]="null">Tous les modules</option>
          @for (c of courses(); track c.id) {
            <option [ngValue]="c.id">{{ c.code }}</option>
          }
        </select>
        <select class="ef-select" [ngModel]="statusFilter()" (ngModelChange)="statusFilter.set($event)">
          <option [ngValue]="null">Tous les statuts</option>
          @for (s of statuses; track s.value) {
            <option [ngValue]="s.value">{{ s.label }}</option>
          }
        </select>
        <span class="count">{{ visible().length }} quiz affiché(s)</span>
      </div>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Impossible de charger les quiz</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
        </div>
      } @else if (!visible().length) {
        <div class="ef-empty">
          @if (levelQuizzes().length) {
            <div class="ef-empty__title">Aucun quiz ne correspond</div>
            <div class="ef-empty__text">Ajustez votre recherche ou vos filtres.</div>
            <button type="button" class="ef-soft-btn" (click)="reset()">Réinitialiser les filtres</button>
          } @else {
            <div class="ef-empty__title">Aucun quiz pour ce niveau</div>
            <div class="ef-empty__text">Créez un quiz, ajoutez-y des questions puis publiez-le.</div>
            <button type="button" class="ef-soft-btn" (click)="creating.set(true)">Créer un quiz</button>
          }
        </div>
      } @else {
        <div class="grid">
          @for (q of visible(); track q.id) {
            <a class="card" [routerLink]="['/app/quizzes', q.id]">
              <div class="card__top">
                <div class="card__head">
                  <div class="card__title">{{ q.title }}</div>
                  <div class="card__course">{{ q.courseCode }} · {{ courseTitle(q.courseId) }}</div>
                </div>
                <span class="ef-pill" [class]="'ef-pill--' + tone(q.status)">{{ label(q.status) }}</span>
              </div>
              <div class="card__meta">
                <span>{{ q.questionCount }} questions</span>
                <span>{{ q.durationMinutes ? q.durationMinutes + ' min' : 'Sans limite' }}</span>
                <span>{{ q.deadline ? 'Échéance ' + (q.deadline | date: 'd MMM') : 'Sans échéance' }}</span>
              </div>
              <div class="card__foot">
                <span class="card__pts">{{ q.totalPoints }} pts · {{ q.maxAttempts }} tentative(s)</span>
                <span class="card__cta">{{ q.status === 'DRAFT' ? 'Préparer' : 'Résultats' }}</span>
              </div>
            </a>
          }
        </div>
      }
    </div>

    @if (creating()) {
      <ef-quiz-form [courses]="courses()" (closed)="creating.set(false)" (saved)="created($event)" />
    }
  `,
  styles: `
    .count {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--ef-text-muted);
      white-space: nowrap;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 14px;
    }

    .card {
      display: block;
      padding: 18px;
      border-radius: 16px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      color: inherit;
      transition: transform 0.25s var(--ef-ease-spring), box-shadow 0.25s, border-color 0.25s;
      animation: ef-fade-up 0.45s ease backwards;
    }

    .card:hover {
      color: inherit;
      transform: translateY(-4px);
      box-shadow: 0 16px 34px rgba(6, 60, 30, 0.12);
      border-color: var(--ef-brand-500);
    }

    .card__top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 12px;
    }

    .card__head {
      min-width: 0;
    }

    .card__title {
      font-family: var(--ef-font-display);
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
      color: var(--ef-text);
    }

    .card__course {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ef-text-muted);
      margin-top: 3px;
    }

    .card__meta {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-bottom: 13px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    .card__foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--ef-border);
    }

    .card__pts {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    .card__cta {
      font-size: 12px;
      font-weight: 700;
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
      padding: 6px 13px;
      border-radius: 9px;
    }
  `,
})
export class QuizListComponent {
  private readonly api = inject(QuizzesApi);
  private readonly coursesApi = inject(CoursesApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly levels = inject(LevelService);

  protected readonly statuses = (Object.keys(QUIZ_STATUS_LABELS) as QuizStatus[]).map((value) => ({
    value,
    label: QUIZ_STATUS_LABELS[value],
  }));

  protected readonly courses = signal<CourseSummary[]>([]);
  private readonly quizzes = signal<QuizSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly creating = signal(false);

  protected readonly query = signal('');
  protected readonly courseFilter = signal<number | null>(null);
  protected readonly statusFilter = signal<QuizStatus | null>(null);

  protected readonly levelLabel = computed(() => LEVEL_LABELS[this.levels.current()]);

  /** The quiz API has no level filter, so scope by the level's modules. */
  protected readonly levelQuizzes = computed(() => {
    const ids = new Set(this.courses().map((c) => c.id));
    return this.quizzes().filter((q) => ids.has(q.courseId));
  });

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.levelQuizzes().filter(
      (quiz) =>
        (!q || quiz.title.toLowerCase().includes(q) || quiz.courseCode.toLowerCase().includes(q)) &&
        (this.courseFilter() == null || quiz.courseId === this.courseFilter()) &&
        (this.statusFilter() == null || quiz.status === this.statusFilter()),
    );
  });

  constructor() {
    effect(() => {
      this.levels.current();
      this.courseFilter.set(null);
      this.load();
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin([this.coursesApi.list(this.levels.current()), this.api.list()]).subscribe({
      next: ([courses, quizzes]) => {
        this.courses.set(courses.content);
        this.quizzes.set(quizzes.content);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail);
        this.loading.set(false);
      },
    });
  }

  protected reset(): void {
    this.query.set('');
    this.courseFilter.set(null);
    this.statusFilter.set(null);
  }

  protected courseTitle(id: number): string {
    return this.courses().find((c) => c.id === id)?.title ?? '';
  }

  protected label(s: QuizStatus): string {
    return QUIZ_STATUS_LABELS[s];
  }

  protected tone(s: QuizStatus): string {
    return QUIZ_STATUS_TONE[s];
  }

  protected created(quiz: QuizDetail): void {
    this.creating.set(false);
    this.toast.success('Quiz créé en brouillon');
    this.router.navigate(['/app/quizzes', quiz.id]);
  }
}
