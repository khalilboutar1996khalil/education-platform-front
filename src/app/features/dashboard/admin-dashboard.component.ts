import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../core/models/api.model';
import { LEVEL_LABELS } from '../../core/models/user.model';
import { LevelService } from '../../core/services/level.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { DashboardApi } from './dashboard.api';
import { Activity, ActivityType, AdminDashboard, CourseSummary } from './dashboard.model';

const ICONS = {
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  quiz: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8',
};

/** Tile / agenda / activity accents cycle through these semantic pairs. */
const TONES = ['green', 'teal', 'lime', 'emerald'] as const;

/** Module rows fall back to these when a course has no colour of its own. */
const MODULE_COLORS = ['#16A34A', '#0D9488', '#65A30D', '#059669', '#15803D', '#4D7C0F'];

const ACTIVITY_TAG: Record<ActivityType, { label: string; tone: (typeof TONES)[number] }> = {
  SUBMISSION_HANDED_IN: { label: 'TP', tone: 'green' },
  SUBMISSION_GRADED: { label: 'Correction', tone: 'emerald' },
  QUIZ_FINISHED: { label: 'Quiz', tone: 'lime' },
  ANNOUNCEMENT_PUBLISHED: { label: 'Annonce', tone: 'teal' },
};

@Component({
  selector: 'ef-admin-dashboard',
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
              <div class="hero__title">{{ levelLabel() }}</div>
              <div class="hero__sub">
                {{ d.submissionsAwaitingMarking }} travaux à corriger · {{ courses().length }} modules · {{ levelStudents() }} élèves
              </div>
            </div>
            <div class="hero__actions">
              <a routerLink="/app/courses" class="hero__btn hero__btn--solid">+ Module</a>
              <a routerLink="/app/quizzes" class="hero__btn">+ Quiz</a>
              <a routerLink="/app/assignments" class="hero__btn">+ TP / devoir</a>
              <a routerLink="/app/blog" class="hero__btn">Écrire un article</a>
            </div>
          </div>
        </section>

        <!-- ═══ Stat tiles ═══ -->
        <div class="stats">
          @for (s of stats(); track s.label) {
            <div class="stat">
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
            </div>
          }
        </div>

        <!-- ═══ Row 1: weekly chart + priorities ═══ -->
        <div class="row">
          <section class="card">
            <div class="card__head">
              <div class="card__title">Travaux rendus cette semaine</div>
              <span class="pill">{{ weekTotal() }} dépôt(s)</span>
            </div>
            <div class="bars" role="img" [attr.aria-label]="'Travaux rendus sur 7 jours : ' + weekTotal()">
              @for (b of bars(); track b.day) {
                <div class="bars__col">
                  <div class="bars__val">{{ b.count }}</div>
                  <div class="bars__bar" [class.bars__bar--peak]="b.peak" [style.height.%]="b.height"></div>
                  <div class="bars__day">{{ b.day | date: 'EEE' }}</div>
                </div>
              }
            </div>
          </section>

          <section class="card">
            <div class="card__title card__title--gap">À traiter en priorité</div>
            <div class="list">
              @for (al of alerts(); track al.text) {
                <a class="alert" [class]="'tone-' + al.tone" [routerLink]="al.link">
                  <div class="alert__text">{{ al.text }}</div>
                  <div class="alert__meta">{{ al.meta }}</div>
                </a>
              }
            </div>
          </section>
        </div>

        <!-- ═══ Row 2: module progress + deadlines/activity ═══ -->
        <div class="row">
          <section class="card">
            <div class="card__title card__title--gap">Avancement par module</div>
            @if (moduleRows().length) {
              <div class="list list--loose">
                @for (m of moduleRows(); track m.id) {
                  <div>
                    <div class="mod__head">
                      <span class="mod__name">{{ m.code }} · {{ m.title }}</span>
                    </div>
                    <div class="track"><div class="track__fill" [style.width.%]="m.progress" [style.background]="m.color"></div></div>
                    <div class="mod__foot">
                      <span>{{ m.chapterCount }} ch. · {{ m.lessonCount }} leçons</span>
                      <span class="mod__pct">{{ m.progressLabel }}</span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="empty">Aucun module pour ce niveau.</p>
            }
          </section>

          <div class="stack">
            <section class="card">
              <div class="card__title card__title--gap">Prochaines échéances</div>
              @if (agenda().length) {
                <div class="list">
                  @for (ag of agenda(); track ag.key) {
                    <div class="agenda">
                      <div class="agenda__date" [class]="'tone-' + ag.tone">
                        <div class="agenda__day">{{ ag.deadline | date: 'd MMM' }}</div>
                        <div class="agenda__time">{{ ag.deadline | date: 'HH:mm' }}</div>
                      </div>
                      <div class="agenda__main">
                        <div class="agenda__title">{{ ag.title }}</div>
                        <div class="agenda__meta">{{ ag.courseCode }} · {{ ag.kind === 'QUIZ' ? 'Quiz' : 'TP / devoir' }}</div>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="empty">Aucune échéance à venir.</p>
              }
            </section>

            <section class="card">
              <div class="card__title card__title--gap">Activité récente</div>
              @if (activity().length) {
                <div class="list">
                  @for (a of activity(); track a.id) {
                    <div class="act">
                      <div class="act__av" [class]="'av-' + a.tone">{{ a.initials }}</div>
                      <div class="act__main">
                        <div class="act__text">{{ a.summary }}</div>
                        <div class="act__time">{{ a.occurredAt | date: 'd MMM · HH:mm' }}</div>
                      </div>
                      <span class="act__tag" [class]="'tone-' + a.tone">{{ a.tag }}</span>
                    </div>
                  }
                </div>
              } @else {
                <p class="empty">Aucune activité récente.</p>
              }
            </section>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .page {
      animation: ef-fade-up 0.4s ease backwards;
    }

    .state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 60px 0;
      color: var(--ef-text-muted);
    }

    .ghost {
      padding: 9px 14px;
      border-radius: 10px;
      border: 1px solid var(--ef-border);
      background: var(--ef-surface);
      color: var(--ef-ink-green);
      font-weight: 700;
      font-size: 13px;
    }

    /* Hero */
    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 18px;
      padding: 20px 22px;
      margin-bottom: 14px;
      background: linear-gradient(120deg, #14532d 0%, #16a34a 58%, #4ade80 130%);
    }

    .hero__blob {
      position: absolute;
      top: -70px;
      right: 30px;
      width: 190px;
      height: 190px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.07);
      animation: ef-floaty 10s ease-in-out infinite;
    }

    @keyframes ef-floaty {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-9px); }
    }

    .hero__body {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .hero__date {
      font-size: 11px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.72);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 5px;
    }

    .hero__title {
      font-family: var(--ef-font-display);
      font-size: clamp(18px, 2vw, 23px);
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.5px;
      margin-bottom: 5px;
    }

    .hero__sub {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.85);
    }

    .hero__actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .hero__btn {
      padding: 9px 15px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 700;
      color: #fff;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
    }

    .hero__btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.3);
    }

    .hero__btn--solid {
      background: #fff;
      color: var(--ef-brand-700);
      border-color: #fff;
    }

    .hero__btn--solid:hover {
      background: #fff;
      color: var(--ef-brand-700);
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
    }

    /* Tones */
    .tone-green { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .tone-teal { color: var(--ef-ink-teal); background: var(--ef-tint-teal); }
    .tone-lime { color: var(--ef-ink-lime); background: var(--ef-tint-lime); }
    .tone-emerald { color: var(--ef-ink-emerald); background: var(--ef-tint-emerald); }
    .tone-amber { color: var(--ef-ink-amber); background: var(--ef-tint-amber); }
    .tone-red { color: var(--ef-ink-red); background: var(--ef-tint-red); }

    .av-green { background: #15803d; }
    .av-teal { background: #0f766e; }
    .av-lime { background: #4d7c0f; }
    .av-emerald { background: #047857; }

    /* Stats */
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 9px;
      padding: 15px;
      border-radius: 15px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      transition: transform 0.25s var(--ef-ease-spring), box-shadow 0.25s, border-color 0.25s;
    }

    .stat:hover {
      transform: translateY(-4px);
      box-shadow: var(--ef-shadow-md);
      border-color: var(--ef-brand-500);
    }

    .stat__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .stat__icon {
      width: 36px;
      height: 36px;
      border-radius: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat__value {
      font-family: var(--ef-font-display);
      font-size: 23px;
      font-weight: 800;
      line-height: 1;
      color: var(--ef-text);
    }

    .stat__label {
      font-size: 12px;
      font-weight: 700;
      color: var(--ef-text);
    }

    .stat__trend {
      font-size: 11px;
      font-weight: 700;
      margin-top: 2px;
      color: var(--ef-ink-green);
    }

    .stat__trend--warn {
      color: var(--ef-ink-amber);
    }

    /* Cards */
    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(290px, 100%), 1fr));
      gap: 13px;
      margin-bottom: 13px;
    }

    .stack {
      display: grid;
      gap: 13px;
      align-content: start;
      min-width: 0;
    }

    .card {
      min-width: 0;
      padding: 18px;
      border-radius: 16px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      animation: ef-fade-up 0.5s ease backwards;
    }

    .card__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .card__title {
      font-family: var(--ef-font-display);
      font-size: 14px;
      font-weight: 700;
      color: var(--ef-text);
    }

    .card__title--gap {
      margin-bottom: 14px;
    }

    .pill {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 7px;
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
    }

    .list {
      display: grid;
      gap: 9px;
    }

    .list--loose {
      gap: 12px;
    }

    .empty {
      font-size: 12.5px;
      color: var(--ef-text-muted);
    }

    /* Bars */
    .bars {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      height: 124px;
    }

    .bars__col {
      flex: 1;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
    }

    .bars__val,
    .bars__day {
      font-size: 10px;
      font-weight: 700;
      color: var(--ef-text-muted);
      text-transform: capitalize;
    }

    .bars__bar {
      width: 100%;
      min-height: 3px;
      border-radius: 6px 6px 3px 3px;
      background: #c7ebd4;
      transition: height 0.9s var(--ef-ease-out);
    }

    :host-context([data-theme='dark']) .bars__bar {
      background: #1e3d2a;
    }

    .bars__bar--peak,
    :host-context([data-theme='dark']) .bars__bar--peak {
      background: linear-gradient(180deg, #22c55e, #15803d);
    }

    /* Alerts */
    .alert {
      display: block;
      padding: 11px 13px;
      border-radius: 11px;
      animation: ef-slide-right 0.4s ease both;
    }

    .alert__text {
      font-size: 12.5px;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .alert__meta {
      font-size: 11px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    @keyframes ef-slide-right {
      from { opacity: 0; transform: translateX(-12px); }
      to { opacity: 1; transform: translateX(0); }
    }

    /* Module progress */
    .mod__head {
      margin-bottom: 5px;
    }

    .mod__name {
      display: block;
      font-size: 12.5px;
      font-weight: 700;
      color: var(--ef-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .track {
      height: 7px;
      border-radius: 5px;
      overflow: hidden;
      background: var(--ef-surface-2);
    }

    .track__fill {
      height: 100%;
      border-radius: 5px;
      transition: width 1s var(--ef-ease-out);
    }

    .mod__foot {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 10.5px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    .mod__pct {
      font-weight: 700;
    }

    /* Agenda */
    .agenda {
      display: flex;
      align-items: center;
      gap: 11px;
    }

    .agenda__date {
      width: 56px;
      flex-shrink: 0;
      padding: 6px 4px;
      border-radius: 10px;
      text-align: center;
    }

    .agenda__day {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .agenda__time {
      font-size: 12px;
      font-weight: 800;
      line-height: 1.2;
    }

    .agenda__main,
    .act__main {
      flex: 1;
      min-width: 0;
    }

    .agenda__title,
    .act__text {
      font-size: 12.5px;
      font-weight: 700;
      color: var(--ef-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .act__text {
      font-weight: 600;
    }

    .agenda__meta,
    .act__time {
      font-size: 11px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    /* Activity */
    .act {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .act__av {
      width: 29px;
      height: 29px;
      flex-shrink: 0;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      color: #fff;
    }

    .act__tag {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
    }
  `,
})
export class AdminDashboardComponent {
  private readonly api = inject(DashboardApi);
  private readonly levels = inject(LevelService);

  protected readonly today = new Date();
  protected readonly data = signal<AdminDashboard | null>(null);
  protected readonly courses = signal<CourseSummary[]>([]);
  private readonly feed = signal<Activity[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly levelLabel = computed(() => LEVEL_LABELS[this.levels.current()]);

  protected readonly levelStudents = computed(
    () => this.data()?.studentsByLevel.find((r) => r.level === this.levels.current())?.count ?? 0,
  );

  protected readonly stats = computed(() => {
    const d = this.data();
    if (!d) {
      return [];
    }
    const chapters = this.courses().reduce((n, c) => n + c.chapterCount, 0);
    return [
      { label: 'Élèves actifs', value: this.levelStudents(), trend: `${d.activeStudents} tous niveaux confondus`, tone: 'green', icon: ICONS.users, warn: false },
      { label: 'Modules', value: this.courses().length, trend: `${chapters} chapitres · ${d.courses} tous niveaux`, tone: 'teal', icon: ICONS.book, warn: false },
      { label: 'Quiz en cours', value: d.quizzesInProgress, trend: 'ouverts aux élèves', tone: 'lime', icon: ICONS.quiz, warn: false },
      { label: 'TP & devoirs ouverts', value: d.openAssignments, trend: `${d.submissionsAwaitingMarking} travaux à corriger`, tone: 'emerald', icon: ICONS.file, warn: d.submissionsAwaitingMarking > 0 },
    ];
  });

  protected readonly weekTotal = computed(() =>
    (this.data()?.weeklySubmissions ?? []).reduce((sum, d) => sum + d.count, 0),
  );

  protected readonly bars = computed(() => {
    const days = this.data()?.weeklySubmissions ?? [];
    const max = Math.max(1, ...days.map((d) => d.count));
    return days.map((d) => ({ ...d, height: (d.count / max) * 100, peak: d.count > 0 && d.count === max }));
  });

  protected readonly alerts = computed(() => {
    const d = this.data();
    if (!d) {
      return [];
    }
    const next = d.upcomingDeadlines[0];
    return [
      {
        text: `${d.submissionsAwaitingMarking} travaux attendent votre correction`,
        meta: d.submissionsAwaitingMarking ? 'Ouvrir les corrections' : 'Tout est corrigé',
        tone: d.submissionsAwaitingMarking ? 'amber' : 'green',
        link: '/app/corrections',
      },
      {
        text: `${d.quizzesInProgress} quiz en cours · ${d.openAssignments} TP / devoirs ouverts`,
        meta: 'Suivre les rendus',
        tone: 'green',
        link: '/app/assignments',
      },
      {
        text: next ? `Prochaine échéance : ${next.title}` : 'Aucune échéance planifiée',
        meta: next ? next.courseCode : 'Planifiez un quiz ou un TP',
        tone: next ? 'teal' : 'red',
        link: next?.kind === 'QUIZ' ? '/app/quizzes' : '/app/assignments',
      },
    ];
  });

  protected readonly moduleRows = computed(() =>
    this.courses().map((c, i) => ({
      ...c,
      color: c.color || MODULE_COLORS[i % MODULE_COLORS.length],
      progress: c.classAveragePercent ?? 0,
      progressLabel: c.classAveragePercent == null ? '—' : `${c.classAveragePercent}% en moyenne`,
    })),
  );

  protected readonly agenda = computed(() =>
    (this.data()?.upcomingDeadlines ?? []).slice(0, 4).map((dl, i) => ({
      ...dl,
      key: dl.kind + dl.id,
      tone: TONES[i % TONES.length],
    })),
  );

  protected readonly activity = computed(() =>
    this.feed().map((a) => {
      const tag = ACTIVITY_TAG[a.type];
      return { ...a, tag: tag.label, tone: tag.tone, initials: initials(a.actorName) };
    }),
  );

  constructor() {
    this.load();
    // Module rows follow the level picked in the header.
    effect(() => this.loadCourses(this.levels.current()));
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.admin().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail || 'Impossible de charger le tableau de bord.');
        this.loading.set(false);
      },
    });
    this.api.activity().subscribe({
      next: (page) => this.feed.set(page.content),
      error: () => this.feed.set([]),
    });
  }

  private loadCourses(level: CourseSummary['level']): void {
    this.api.coursesOf(level).subscribe({
      next: (page) => this.courses.set(page.content),
      error: () => this.courses.set([]),
    });
  }
}

function initials(name: string | null): string {
  if (!name) {
    return 'EF';
  }
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}
