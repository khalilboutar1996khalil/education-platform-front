import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ApiError } from '../../core/models/api.model';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { QuestionFormComponent } from './question-form.component';
import { QuizFormComponent } from './quiz-form.component';
import { QuizzesApi } from './quizzes.api';
import {
  QUESTION_TYPE_LABELS,
  QUIZ_STATUS_LABELS,
  QUIZ_STATUS_TONE,
  Question,
  QuestionType,
  QuizDetail,
  QuizStatus,
} from './quizzes.model';

@Component({
  selector: 'ef-quiz-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, DecimalPipe, RouterLink, SpinnerComponent, QuizFormComponent, QuestionFormComponent],
  template: `
    <div class="ef-page">
      <a routerLink="/app/quizzes" class="back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        Tous les quiz
      </a>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Quiz introuvable</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
        </div>
      } @else if (quiz()) {
        @let q = quiz()!;
        <!-- ═══ Header card ═══ -->
        <section class="head">
          <div class="head__top">
            <div class="head__main">
              <div class="head__tags">
                <span class="head__code">{{ q.courseCode }}</span>
                <span class="ef-pill" [class]="'ef-pill--' + tone(q.status)">{{ label(q.status) }}</span>
              </div>
              <div class="head__title">{{ q.title }}</div>
              @if (q.description) {
                <div class="head__desc">{{ q.description }}</div>
              }
            </div>
            <div class="head__actions">
              @switch (q.status) {
                @case ('DRAFT') {
                  <button type="button" class="ef-cta" [disabled]="busy()" (click)="setStatus('IN_PROGRESS')">Publier le quiz</button>
                }
                @case ('IN_PROGRESS') {
                  <button type="button" class="ef-outline ef-outline--danger" [disabled]="busy()" (click)="setStatus('CLOSED')">Clôturer</button>
                }
                @case ('CLOSED') {
                  <button type="button" class="ef-outline" [disabled]="busy()" (click)="setStatus('IN_PROGRESS')">Rouvrir</button>
                }
              }
              <button type="button" class="ef-outline" (click)="editing.set(true)">Paramètres</button>
              <button type="button" class="ef-outline ef-outline--danger" (click)="remove(q)">Supprimer</button>
            </div>
          </div>

          <div class="stats">
            <div class="stat"><div class="stat__v">{{ q.questions.length }}</div><div class="stat__l">Questions</div></div>
            <div class="stat"><div class="stat__v">{{ q.totalPoints }}</div><div class="stat__l">Points</div></div>
            <div class="stat"><div class="stat__v">{{ q.durationMinutes ? q.durationMinutes + ' min' : '∞' }}</div><div class="stat__l">Durée</div></div>
            <div class="stat"><div class="stat__v">{{ q.submissions }}</div><div class="stat__l">Copies rendues</div></div>
            <div class="stat">
              <div class="stat__v">{{ q.averageScore == null ? '—' : (q.averageScore | number: '1.0-1') + ' / ' + q.totalPoints }}</div>
              <div class="stat__l">Moyenne</div>
            </div>
          </div>

          <div class="dates">
            <span>Ouverture : <strong>{{ q.opensAt ? (q.opensAt | date: 'd MMM y · HH:mm') : 'dès la publication' }}</strong></span>
            <span>Échéance : <strong>{{ q.deadline ? (q.deadline | date: 'd MMM y · HH:mm') : 'aucune' }}</strong></span>
            <span>Tentatives : <strong>{{ q.maxAttempts }}</strong></span>
            @if (q.shuffleQuestions) { <span>Questions mélangées</span> }
          </div>
        </section>

        <!-- ═══ Questions ═══ -->
        <div class="bar">
          <div class="bar__title">Questions</div>
          @if (isDraft()) {
            <button type="button" class="ef-outline" (click)="questionForm.set({ question: null })">+ Ajouter une question</button>
          }
        </div>

        @if (!isDraft()) {
          <div class="note">Les questions sont figées une fois le quiz publié, pour que toutes les copies soient notées sur le même sujet.</div>
        }

        @if (!q.questions.length) {
          <div class="ef-empty">
            <div class="ef-empty__title">Aucune question</div>
            <div class="ef-empty__text">Ajoutez au moins une question avant de publier le quiz.</div>
            @if (isDraft()) {
              <button type="button" class="ef-soft-btn" (click)="questionForm.set({ question: null })">Ajouter une question</button>
            }
          </div>
        }

        <div class="questions">
          @for (qs of q.questions; track qs.id) {
            <div class="qs">
              <div class="qs__head">
                <div class="qs__num">{{ qs.position }}</div>
                <div class="qs__main">
                  <div class="qs__text">{{ qs.text }}</div>
                  <div class="qs__meta">{{ typeLabel(qs.type) }} · {{ qs.points }} pt(s)</div>
                </div>
                @if (isDraft()) {
                  <button type="button" class="tool" title="Modifier" (click)="questionForm.set({ question: qs })">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
                  </button>
                  <button type="button" class="tool tool--danger" title="Supprimer" (click)="removeQuestion(qs)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
                  </button>
                }
              </div>
              @if (qs.choices.length) {
                <div class="qs__choices">
                  @for (c of qs.choices; track c.id) {
                    <div class="qc" [class.qc--ok]="c.correct">
                      <span class="qc__dot">
                        @if (c.correct) {
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        }
                      </span>
                      {{ c.text }}
                    </div>
                  }
                </div>
              } @else {
                <div class="qs__open">Réponse libre, corrigée à la main.</div>
              }
            </div>
          }
        </div>

        @if (editing()) {
          <ef-quiz-form [quiz]="q" (closed)="editing.set(false)" (saved)="saved($event, 'Paramètres enregistrés')" />
        }
        @if (questionForm(); as f) {
          <ef-question-form
            [quiz]="q"
            [question]="f.question"
            (closed)="questionForm.set(null)"
            (saved)="saved($event, f.question ? 'Question mise à jour' : 'Question ajoutée')"
          />
        }
      }
    </div>
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 14px;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--ef-text-muted);
      transition: color 0.2s, transform 0.2s;
    }

    .back:hover {
      color: var(--ef-brand-600);
      transform: translateX(-3px);
    }

    .head {
      padding: 20px 22px;
      margin-bottom: 18px;
      border-radius: 18px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
    }

    .head__top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .head__main {
      min-width: 0;
      flex: 1;
    }

    .head__tags {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .head__code {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
      padding: 3px 9px;
      border-radius: 6px;
    }

    .head__title {
      font-family: var(--ef-font-display);
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.4px;
      color: var(--ef-text);
    }

    .head__desc {
      font-size: 13px;
      line-height: 1.6;
      color: var(--ef-text-muted);
      margin-top: 6px;
      max-width: 620px;
    }

    .head__actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-top: 18px;
    }

    .stat {
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--ef-surface-2);
    }

    .stat__v {
      font-family: var(--ef-font-display);
      font-size: 18px;
      font-weight: 800;
      color: var(--ef-text);
    }

    .stat__l {
      font-size: 11px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    .dates {
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
      margin-top: 14px;
      font-size: 12px;
      color: var(--ef-text-muted);
    }

    .dates strong {
      color: var(--ef-text);
    }

    .bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .bar__title {
      font-family: var(--ef-font-display);
      font-size: 15px;
      font-weight: 700;
      color: var(--ef-text);
    }

    .note {
      margin-bottom: 12px;
      padding: 10px 13px;
      border-radius: 11px;
      font-size: 12px;
      font-weight: 600;
      color: var(--ef-ink-amber);
      background: var(--ef-tint-amber);
    }

    .questions {
      display: grid;
      gap: 10px;
    }

    .qs {
      padding: 15px 18px;
      border-radius: 15px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      animation: ef-fade-up 0.4s ease backwards;
    }

    .qs__head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .qs__num {
      width: 30px;
      height: 30px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9px;
      font-family: var(--ef-font-display);
      font-size: 13px;
      font-weight: 800;
      color: #fff;
      background: var(--ef-gradient-brand);
    }

    .qs__main {
      flex: 1;
      min-width: 0;
    }

    .qs__text {
      font-size: 13.5px;
      font-weight: 700;
      line-height: 1.5;
      color: var(--ef-text);
      white-space: pre-line;
    }

    .qs__meta {
      font-size: 11.5px;
      color: var(--ef-text-muted);
      margin-top: 2px;
    }

    .qs__choices {
      display: grid;
      gap: 6px;
      margin: 12px 0 0 42px;
    }

    .qc {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 11px;
      border-radius: 10px;
      font-size: 12.5px;
      color: var(--ef-text);
      background: var(--ef-surface-2);
    }

    .qc--ok {
      font-weight: 700;
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
    }

    .qc__dot {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2px solid var(--ef-border);
    }

    .qc--ok .qc__dot {
      background: var(--ef-brand-500);
      border-color: var(--ef-brand-500);
    }

    .qs__open {
      margin: 10px 0 0 42px;
      font-size: 12px;
      font-style: italic;
      color: var(--ef-text-muted);
    }

    .tool {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      color: var(--ef-text-muted);
      transition: background 0.2s, color 0.2s;
    }

    .tool:hover {
      background: var(--ef-tint-green);
      color: var(--ef-ink-green);
    }

    .tool--danger:hover {
      background: var(--ef-tint-red);
      color: var(--ef-ink-red);
    }

    @media (max-width: 540px) {
      .qs__choices,
      .qs__open {
        margin-left: 0;
      }
    }
  `,
})
export class QuizDetailComponent implements OnInit {
  private readonly api = inject(QuizzesApi);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Route param, bound via withComponentInputBinding. */
  readonly id = input.required<string>();

  protected readonly quiz = signal<QuizDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly editing = signal(false);
  protected readonly questionForm = signal<{ question: Question | null } | null>(null);

  protected readonly isDraft = computed(() => this.quiz()?.status === 'DRAFT');

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get(Number(this.id())).subscribe({
      next: (q) => {
        this.quiz.set(q);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail);
        this.loading.set(false);
      },
    });
  }

  protected label(s: QuizStatus): string {
    return QUIZ_STATUS_LABELS[s];
  }

  protected tone(s: QuizStatus): string {
    return QUIZ_STATUS_TONE[s];
  }

  protected typeLabel(t: QuestionType): string {
    return QUESTION_TYPE_LABELS[t];
  }

  protected saved(q: QuizDetail, message: string): void {
    this.editing.set(false);
    this.questionForm.set(null);
    this.quiz.set(q);
    this.toast.success(message);
  }

  protected setStatus(status: QuizStatus): void {
    const q = this.quiz();
    if (!q) {
      return;
    }
    if (status === 'IN_PROGRESS' && !q.questions.length) {
      this.toast.error('Ajoutez au moins une question avant de publier.');
      return;
    }
    if (status === 'CLOSED' && !confirm('Clôturer ce quiz ? Les élèves ne pourront plus le passer.')) {
      return;
    }
    this.busy.set(true);
    this.api.setStatus(q.id, status).subscribe({
      next: (updated) => {
        this.busy.set(false);
        this.quiz.set(updated);
        this.toast.success(status === 'CLOSED' ? 'Quiz clôturé' : q.status === 'DRAFT' ? 'Quiz publié' : 'Quiz rouvert');
      },
      error: (e: ApiError) => {
        this.busy.set(false);
        this.toast.error(e.detail);
      },
    });
  }

  protected remove(q: QuizDetail): void {
    if (!confirm(`Supprimer le quiz « ${q.title} » avec ses questions et toutes les copies ?`)) {
      return;
    }
    this.api.delete(q.id).subscribe({
      next: () => {
        this.toast.success('Quiz supprimé');
        this.router.navigate(['/app/quizzes']);
      },
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }

  protected removeQuestion(qs: Question): void {
    if (!confirm('Supprimer cette question ?')) {
      return;
    }
    this.api.deleteQuestion(qs.id).subscribe({
      next: () => {
        this.toast.success('Question supprimée');
        this.load();
      },
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }
}
