import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api.model';
import { LevelCatalog } from '../../core/services/level-catalog.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { Announcement } from '../announcements/announcements.model';
import { AnnouncementsApi } from '../announcements/announcements.api';
import { DashboardApi } from './dashboard.api';
import { CourseSummary, StudentDashboard } from './dashboard.model';
import { DASHBOARD_STYLES } from './dashboard.styles';

const ICONS = {
  progress: 'M22 12h-4l-3 9L9 3l-3 9H2',
  grade: 'M18 20V10M12 20V4M6 20v-6',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8',
  quiz: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
};

const MODULE_COLORS = ['#16A34A', '#0D9488', '#65A30D', '#059669', '#15803D', '#4D7C0F'];

/** General study advice, one per day: something useful even before any course is started. */
const TIPS = [
  { title: 'Un peu chaque jour', text: '20 minutes par jour valent mieux que 3 heures la veille du devoir. Fixez-vous un créneau régulier.' },
  { title: 'Refaites les exercices', text: 'Relire une correction ne suffit pas : refaites l’exercice sans regarder, puis comparez.' },
  { title: 'Pratiquez sur machine', text: 'En informatique, on apprend en faisant. Tapez le code des leçons au lieu de le copier.' },
  { title: 'Testez-vous avec les quiz', text: 'Les quiz montrent ce qui n’est pas encore acquis. Recommencez-les après avoir revu la leçon.' },
  { title: 'Notez vos questions', text: 'Gardez une liste de ce que vous ne comprenez pas et posez-la à votre professeur.' },
  { title: 'Anticipez les échéances', text: 'Commencez un TP dès qu’il est publié : vous aurez le temps de demander de l’aide.' },
  { title: 'Faites des pauses', text: 'Toutes les 25 à 30 minutes, 5 minutes de pause aident à mieux retenir.' },
];

/** The student's home: progress, marks, what is due next, their modules and the latest news. */
@Component({
  selector: 'ef-student-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, SpinnerComponent],
  template: `
    @if (loading() && !data()) {
      <div class="state"><ef-spinner [size]="26" /></div>
    } @else if (error()) {
      <div class="state state--error">
        <p>{{ error() }}</p>
        <button type="button" class="ghost" (click)="load()">Réessayer</button>
      </div>
    } @else if (data()) {
      @let d = data()!;
      <div class="page">
        <!-- ═══ Hero ═══ -->
        <section class="hero">
          <div class="hero__blob"></div>
          <div class="hero__body">
            <div>
              <div class="hero__date">{{ today | date: 'EEEE d MMMM' }}</div>
              <div class="hero__title">Bonjour {{ firstName() }} 👋</div>
              <div class="hero__sub">
                {{ levelLabel() }} · {{ d.lessonsCompleted }} leçon(s) terminée(s) sur {{ d.totalLessons }}
              </div>
              <div class="hero__actions">
                <a routerLink="/app/courses" class="hero__btn hero__btn--solid">{{ d.lessonsCompleted ? 'Continuer mes modules' : 'Commencer mes modules' }}</a>
                <a routerLink="/app/quizzes" class="hero__btn">Mes quiz</a>
                <a routerLink="/app/assignments" class="hero__btn">Mes TP</a>
              </div>
            </div>
            <div class="ring" role="img" [attr.aria-label]="'Progression : ' + d.progressPercent + ' %'">
              <svg viewBox="0 0 120 120" width="112" height="112">
                <circle cx="60" cy="60" r="50" class="ring__bg" />
                <circle cx="60" cy="60" r="50" class="ring__fg" [attr.stroke-dasharray]="ringDash()" />
              </svg>
              <div class="ring__label">
                <strong>{{ d.progressPercent }}%</strong>
                <span>parcouru</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ═══ Stat tiles ═══ -->
        <div class="stats">
          @for (s of stats(); track s.label) {
            <a class="stat stat--link" [routerLink]="s.link">
              <div class="stat__top">
                <div class="stat__icon" [class]="'tone-' + s.tone">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="s.icon" /></svg>
                </div>
                <div class="stat__value">{{ s.value }}</div>
              </div>
              <div>
                <div class="stat__label">{{ s.label }}</div>
                <div class="stat__trend" [class.stat__trend--warn]="s.warn">{{ s.trend }}</div>
              </div>
            </a>
          }
        </div>

        <!-- ═══ Row 1: my modules + deadlines ═══ -->
        <div class="row">
          <section class="card">
            <div class="card__head">
              <div class="card__title">Mes modules</div>
              <a routerLink="/app/courses" class="pill">Tout voir</a>
            </div>
            @if (moduleRows().length) {
              <div class="list list--loose">
                @for (m of moduleRows(); track m.id) {
                  <a class="mod" [routerLink]="['/app/courses', m.id]">
                    <div class="mod__head">
                      <span class="mod__name">{{ m.code }} · {{ m.title }}</span>
                    </div>
                    <div class="track"><div class="track__fill" [style.width.%]="m.progress" [style.background]="m.color"></div></div>
                    <div class="mod__foot">
                      <span>{{ m.chapterCount }} ch. · {{ m.lessonCount }} leçons</span>
                      <span class="mod__pct">{{ m.progress }}%</span>
                    </div>
                  </a>
                }
              </div>
            } @else {
              <p class="empty">Aucun module n’est encore publié pour votre niveau. Revenez bientôt !</p>
            }
          </section>

          <section class="card">
            <div class="card__title card__title--gap">Prochaines échéances</div>
            @if (agenda().length) {
              <div class="list">
                @for (ag of agenda(); track ag.key) {
                  <a class="agenda agenda--link" [routerLink]="ag.link">
                    <div class="agenda__date" [class]="'tone-' + ag.tone">
                      <div class="agenda__day">{{ ag.deadline | date: 'd MMM' }}</div>
                      <div class="agenda__time">{{ ag.deadline | date: 'HH:mm' }}</div>
                    </div>
                    <div class="agenda__main">
                      <div class="agenda__title">{{ ag.title }}</div>
                      <div class="agenda__meta">{{ ag.courseCode }} · {{ ag.kind === 'QUIZ' ? 'Quiz' : 'TP / devoir' }} · {{ ag.left }}</div>
                    </div>
                  </a>
                }
              </div>
            } @else {
              <p class="empty">Rien à rendre pour le moment. Profitez-en pour avancer dans vos modules.</p>
            }
          </section>
        </div>

        <!-- ═══ Row 2: news + tip ═══ -->
        <div class="row">
          <section class="card">
            <div class="card__head">
              <div class="card__title">Dernières annonces</div>
              @if (d.unreadNotifications) {
                <span class="pill">{{ d.unreadNotifications }} notification(s) non lue(s)</span>
              }
            </div>
            @if (news().length) {
              <div class="list">
                @for (n of news(); track n.id) {
                  <a class="news" routerLink="/app/announcements">
                    <div class="news__head">
                      @if (n.pinned) { <span class="news__pin">Épinglé</span> }
                      <span class="news__title">{{ n.title }}</span>
                    </div>
                    <div class="news__body">{{ excerpt(n.body) }}</div>
                    <div class="news__meta">{{ n.author.fullName }} · {{ n.publishedAt | date: 'd MMM' }}</div>
                  </a>
                }
              </div>
            } @else {
              <p class="empty">Aucune annonce pour l’instant.</p>
            }
          </section>

          <div class="stack">
            <section class="card tip">
              <div class="tip__badge">Conseil du jour</div>
              <div class="tip__title">{{ tip.title }}</div>
              <p class="tip__text">{{ tip.text }}</p>
            </section>

            <section class="card">
              <div class="card__title card__title--gap">Accès rapides</div>
              <div class="quick">
                <a routerLink="/app/resources" class="quick__item">📚 Ressources</a>
                <a routerLink="/app/grades" class="quick__item">📊 Mes notes</a>
                <a routerLink="/app/blog" class="quick__item">📰 Blog</a>
                <a routerLink="/app/settings" class="quick__item">⚙️ Paramètres</a>
              </div>
            </section>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    DASHBOARD_STYLES,
    `
      .hero__body {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }

      .hero__actions {
        margin-top: 14px;
      }

      .ring {
        position: relative;
        flex: none;
        width: 112px;
        height: 112px;
      }

      .ring svg {
        transform: rotate(-90deg);
      }

      .ring__bg {
        fill: none;
        stroke: rgba(255, 255, 255, 0.18);
        stroke-width: 11;
      }

      .ring__fg {
        fill: none;
        stroke: #fff;
        stroke-width: 11;
        stroke-linecap: round;
        transition: stroke-dasharray 0.8s ease;
      }

      .ring__label {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #fff;
        line-height: 1.1;
      }

      .ring__label strong {
        font-family: var(--ef-font-display);
        font-size: 24px;
        font-weight: 800;
      }

      .ring__label span {
        font-size: 11px;
        opacity: 0.8;
      }

      .stat--link,
      .mod,
      .agenda--link,
      .news {
        color: inherit;
        text-decoration: none;
      }

      .stat--link:hover {
        border-color: var(--ef-brand-500);
      }

      .mod {
        display: block;
        border-radius: 10px;
      }

      .mod:hover .mod__name,
      .agenda--link:hover .agenda__title,
      .news:hover .news__title {
        color: var(--ef-brand-600, #16a34a);
      }

      .news {
        display: block;
        padding: 12px 14px;
        border-radius: 12px;
        background: var(--ef-surface-2);
      }

      .news__head {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .news__pin {
        padding: 2px 8px;
        border-radius: 99px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--ef-ink-green);
        background: var(--ef-tint-green);
      }

      .news__title {
        font-size: 14px;
        font-weight: 700;
        color: var(--ef-text);
      }

      .news__body {
        margin-top: 4px;
        font-size: 13px;
        line-height: 1.5;
        color: var(--ef-text-muted);
      }

      .news__meta {
        margin-top: 6px;
        font-size: 11.5px;
        color: var(--ef-text-subtle);
      }

      .tip {
        background: var(--ef-tint-green);
        border-color: transparent;
      }

      .tip__badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 99px;
        font-size: 10.5px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ef-ink-green);
        background: var(--ef-surface);
      }

      .tip__title {
        margin-top: 10px;
        font-family: var(--ef-font-display);
        font-size: 16px;
        font-weight: 800;
        color: var(--ef-ink-green);
      }

      .tip__text {
        margin: 6px 0 0;
        font-size: 13.5px;
        line-height: 1.6;
        color: var(--ef-text);
      }

      .quick {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .quick__item {
        padding: 11px 12px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        color: var(--ef-ink-green);
        background: var(--ef-surface-2);
        text-decoration: none;
      }

      .quick__item:hover {
        background: var(--ef-tint-green);
      }

      @media (max-width: 640px) {
        .ring {
          display: none;
        }
      }
    `,
  ],
})
export class StudentDashboardComponent implements OnInit {
  private readonly api = inject(DashboardApi);
  private readonly announcementsApi = inject(AnnouncementsApi);
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(LevelCatalog);

  protected readonly today = new Date();
  protected readonly data = signal<StudentDashboard | null>(null);
  protected readonly courses = signal<CourseSummary[]>([]);
  private readonly announcements = signal<Announcement[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  /** One tip per day of the year, so it changes daily but stays put for the day. */
  protected readonly tip = TIPS[Math.floor(Date.now() / 86_400_000) % TIPS.length];

  protected readonly firstName = computed(() => (this.auth.user()?.fullName ?? '').trim().split(/\s+/)[0] ?? '');
  protected readonly levelLabel = computed(() => this.catalog.label(this.auth.user()?.level));

  /** Circumference of the progress ring (r = 50). */
  private readonly circumference = 2 * Math.PI * 50;
  protected readonly ringDash = computed(() => {
    const pct = Math.max(0, Math.min(100, this.data()?.progressPercent ?? 0));
    return `${(pct / 100) * this.circumference} ${this.circumference}`;
  });

  protected readonly stats = computed(() => {
    const d = this.data();
    if (!d) {
      return [];
    }
    const avg = d.overallAverage;
    return [
      {
        label: 'Progression',
        value: `${d.progressPercent}%`,
        trend: `${d.lessonsCompleted}/${d.totalLessons} leçons · ${d.courses} module(s)`,
        tone: 'green',
        icon: ICONS.progress,
        warn: false,
        link: '/app/courses',
      },
      {
        label: 'Moyenne générale',
        value: avg == null ? '—' : `${this.mark(avg)}/20`,
        trend: avg == null ? 'Pas encore de note' : avg >= 10 ? 'Continuez comme ça !' : 'Accrochez-vous, ça va venir',
        tone: 'teal',
        icon: ICONS.grade,
        warn: avg != null && avg < 10,
        link: '/app/grades',
      },
      {
        label: 'TP à rendre',
        value: d.assignmentsToHandIn,
        trend: d.assignmentsToHandIn ? 'à déposer avant la date limite' : 'Tout est rendu',
        tone: 'emerald',
        icon: ICONS.file,
        warn: d.assignmentsToHandIn > 0,
        link: '/app/assignments',
      },
      {
        label: 'Quiz ouverts',
        value: d.quizzesOpen,
        trend: d.quizzesOpen ? 'à passer maintenant' : 'Aucun quiz en cours',
        tone: 'lime',
        icon: ICONS.quiz,
        warn: false,
        link: '/app/quizzes',
      },
    ];
  });

  protected readonly moduleRows = computed(() =>
    this.courses()
      .map((c, i) => ({
        ...c,
        color: c.color || MODULE_COLORS[i % MODULE_COLORS.length],
        progress: c.progressPercent ?? 0,
      }))
      // Modules in progress first: that is where the student most likely wants to go back
      .sort((a, b) => Number(b.progress > 0 && b.progress < 100) - Number(a.progress > 0 && a.progress < 100))
      .slice(0, 5),
  );

  protected readonly agenda = computed(() =>
    (this.data()?.upcomingDeadlines ?? []).slice(0, 5).map((dl) => {
      const hours = (new Date(dl.deadline).getTime() - Date.now()) / 3_600_000;
      return {
        ...dl,
        key: `${dl.kind}-${dl.id}`,
        tone: hours < 24 ? 'red' : hours < 72 ? 'amber' : 'green',
        left: this.timeLeft(hours),
        link: dl.kind === 'QUIZ' ? '/app/quizzes' : '/app/assignments',
      };
    }),
  );

  protected readonly news = computed(() =>
    this.announcements()
      .filter((a) => a.publishedAt)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, 3),
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    const level = this.auth.user()?.level;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      me: this.api.me(),
      // The modules and the news are extras: the page still shows if either fails
      courses: level ? this.api.coursesOf(level).pipe(catchError(() => of(null))) : of(null),
      news: this.announcementsApi.list().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ me, courses, news }) => {
        this.data.set(me);
        this.courses.set(courses?.content ?? []);
        this.announcements.set(news?.content ?? []);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.loading.set(false);
        this.error.set(e.detail || 'Impossible de charger votre tableau de bord.');
      },
    });
  }

  protected excerpt(body: string): string {
    const text = body.replace(/\s+/g, ' ').trim();
    return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  }

  protected mark(value: number): string {
    return Number(value).toFixed(2).replace(/\.?0+$/, '').replace('.', ',');
  }

  private timeLeft(hours: number): string {
    if (hours < 1) {
      return 'moins d’une heure';
    }
    if (hours < 24) {
      return `dans ${Math.round(hours)} h`;
    }
    const days = Math.round(hours / 24);
    return days === 1 ? 'demain' : `dans ${days} jours`;
  }
}
