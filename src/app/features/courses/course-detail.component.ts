import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api.model';
import { LEVEL_LABELS } from '../../core/models/user.model';
import { ToastService } from '../../core/services/toast.service';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { ChapterFormComponent } from './chapter-form.component';
import { CourseFormComponent } from './course-form.component';
import { CoursesApi } from './courses.api';
import { Chapter, CourseDetail, Lesson, LESSON_TYPE_LABELS, LessonType, coverFor, formatMinutes } from './courses.model';
import { LessonFormComponent } from './lesson-form.component';

const LESSON_ICONS: Record<LessonType, string> = {
  VIDEO: 'M5 3l14 9-14 9V3z',
  PDF: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  QUIZ: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  TASK: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8',
};

@Component({
  selector: 'ef-course-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, SpinnerComponent, CourseFormComponent, ChapterFormComponent, LessonFormComponent],
  template: `
    <div class="ef-page">
      <a routerLink="/app/courses" class="back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        Tous les modules
      </a>

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Module introuvable</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
        </div>
      } @else if (course()) {
        @let c = course()!;
        <!-- ═══ Hero ═══ -->
        <section class="hero" [style.background]="cover()">
          <div class="hero__blob"></div>
          <div class="hero__body">
            <div class="hero__top">
              <span class="hero__tag">{{ c.code }} · {{ levelShort() }}</span>
              @if (isAdmin()) {
                <div class="hero__tools">
                  <button type="button" class="hero__tool" (click)="editingCourse.set(true)">Modifier</button>
                  <button type="button" class="hero__tool" (click)="deleteCourse(c)">Supprimer</button>
                </div>
              }
            </div>
            <div class="hero__title">{{ c.title }}</div>
            @if (c.description) {
              <div class="hero__desc">{{ c.description }}</div>
            }
            <div class="hero__stats">
              <div><div class="hero__num">{{ c.chapters.length }}</div><div class="hero__cap">Chapitres</div></div>
              <div><div class="hero__num">{{ totals().lessons }}</div><div class="hero__cap">Leçons</div></div>
              <div><div class="hero__num">{{ totals().videos }}</div><div class="hero__cap">Vidéos</div></div>
              <div><div class="hero__num">{{ totals().duration }}</div><div class="hero__cap">Durée totale</div></div>
              @if (!isAdmin()) {
                <div><div class="hero__num">{{ totals().percent }}%</div><div class="hero__cap">Votre avancement</div></div>
              }
            </div>
          </div>
        </section>

        <div class="bar">
          <div class="bar__title">Contenu du module</div>
          @if (isAdmin()) {
            <button type="button" class="ef-outline" (click)="chapterForm.set({ chapter: null })">+ Ajouter un chapitre</button>
          }
        </div>

        @if (!c.chapters.length) {
          <div class="ef-empty">
            <div class="ef-empty__title">Aucun chapitre pour le moment</div>
            <div class="ef-empty__text">Organisez le module en chapitres, puis ajoutez-y des leçons.</div>
            @if (isAdmin()) {
              <button type="button" class="ef-soft-btn" (click)="chapterForm.set({ chapter: null })">Ajouter un chapitre</button>
            }
          </div>
        }

        <div class="chapters">
          @for (ch of chapters(); track ch.id) {
            <div class="ch" [class.ch--open]="ch.open">
              <div class="ch__head" (click)="toggle(ch.id)">
                <div class="ch__num" [class.ch__num--done]="ch.pct === 100">{{ ch.num }}</div>
                <div class="ch__main">
                  <div class="ch__title">{{ ch.title }}</div>
                  <div class="ch__meta">{{ ch.lessons.length }} leçons · {{ ch.duration }}{{ isAdmin() ? '' : ' · ' + ch.doneLabel }}</div>
                </div>
                @if (isAdmin()) {
                  <div class="ch__tools" (click)="$event.stopPropagation()">
                    <button type="button" class="tool" title="Modifier le chapitre" (click)="chapterForm.set({ chapter: ch })">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
                    </button>
                    <button type="button" class="tool tool--danger" title="Supprimer le chapitre" (click)="deleteChapter(ch)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" /></svg>
                    </button>
                  </div>
                } @else {
                  <div class="ch__bar"><div class="ef-track"><div class="ef-track__fill" [style.width.%]="ch.pct"></div></div></div>
                }
                <svg class="ch__chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><polyline points="6 9 12 15 18 9" /></svg>
              </div>

              @if (ch.open) {
                <div class="lessons">
                  @for (ls of ch.lessons; track ls.id) {
                    <div class="ls" [class.ls--done]="ls.completed">
                      <div class="ls__icon">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path [attr.d]="icon(ls.type)" /></svg>
                      </div>
                      <div class="ls__main">
                        <div class="ls__title">{{ ls.title }}</div>
                      </div>
                      <span class="ls__type">{{ typeLabel(ls.type) }}</span>
                      <span class="ls__dur">{{ ls.durationMinutes ? ls.durationMinutes + ' min' : '' }}</span>
                      @if (isAdmin()) {
                        <button type="button" class="tool" title="Modifier la leçon" (click)="lessonForm.set({ chapter: ch, lesson: ls })">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M11 4H4v16h16v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>
                        </button>
                        <button type="button" class="tool tool--danger" title="Supprimer la leçon" (click)="deleteLesson(ch, ls)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
                        </button>
                      } @else {
                        <div class="ls__check">
                          @if (ls.completed) {
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                          }
                        </div>
                      }
                    </div>
                  } @empty {
                    <div class="ls__empty">Aucune leçon dans ce chapitre.</div>
                  }
                  @if (isAdmin()) {
                    <button type="button" class="ls__add" (click)="lessonForm.set({ chapter: ch, lesson: null })">+ Ajouter une leçon</button>
                  }
                </div>
              }
            </div>
          }
        </div>

        @if (editingCourse()) {
          <ef-course-form [course]="c" (closed)="editingCourse.set(false)" (saved)="courseSaved($event)" />
        }
        @if (chapterForm(); as f) {
          <ef-chapter-form [course]="c" [chapter]="f.chapter" (closed)="chapterForm.set(null)" (saved)="chapterSaved($event, f.chapter)" />
        }
        @if (lessonForm(); as f) {
          <ef-lesson-form [chapter]="f.chapter" [lesson]="f.lesson" (closed)="lessonForm.set(null)" (saved)="lessonSaved($event, f.lesson)" />
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

    /* Hero */
    .hero {
      position: relative;
      overflow: hidden;
      border-radius: 20px;
      padding: 24px 28px;
      margin-bottom: 18px;
    }

    .hero__blob {
      position: absolute;
      top: -60px;
      right: 30px;
      width: 180px;
      height: 180px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.07);
      animation: ef-floaty 10s ease-in-out infinite;
    }

    .hero__body {
      position: relative;
    }

    .hero__top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .hero__tag {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      color: #fff;
      background: rgba(0, 0, 0, 0.22);
      padding: 4px 10px;
      border-radius: 7px;
    }

    .hero__tools {
      display: flex;
      gap: 8px;
    }

    .hero__tool {
      padding: 7px 13px;
      border-radius: 9px;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      background: rgba(255, 255, 255, 0.16);
      border: 1px solid rgba(255, 255, 255, 0.28);
      transition: background 0.2s;
    }

    .hero__tool:hover {
      background: rgba(255, 255, 255, 0.28);
    }

    .hero__title {
      font-family: var(--ef-font-display);
      font-size: clamp(20px, 2.3vw, 26px);
      font-weight: 800;
      letter-spacing: -0.6px;
      color: #fff;
      margin: 11px 0 7px;
    }

    .hero__desc {
      max-width: 560px;
      font-size: 13.5px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.85);
    }

    .hero__stats {
      display: flex;
      gap: 22px;
      flex-wrap: wrap;
      margin-top: 16px;
    }

    .hero__num {
      font-family: var(--ef-font-display);
      font-size: 19px;
      font-weight: 800;
      color: #fff;
    }

    .hero__cap {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.72);
    }

    /* Toolbar */
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

    /* Chapters */
    .chapters {
      display: grid;
      gap: 10px;
    }

    .ch {
      overflow: hidden;
      border-radius: 15px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      transition: border-color 0.25s;
      animation: ef-fade-up 0.4s ease backwards;
    }

    .ch--open {
      border-color: var(--ef-brand-500);
    }

    .ch__head {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 15px 18px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .ch__head:hover {
      background: var(--ef-surface-2);
    }

    .ch__num {
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      font-family: var(--ef-font-display);
      font-size: 13px;
      font-weight: 800;
      color: var(--ef-text-muted);
      background: var(--ef-surface-2);
    }

    .ch__num--done {
      color: #fff;
      background: var(--ef-gradient-brand);
    }

    .ch__main {
      flex: 1;
      min-width: 0;
    }

    .ch__title {
      font-size: 13.5px;
      font-weight: 700;
      color: var(--ef-text);
    }

    .ch__meta {
      font-size: 11.5px;
      color: var(--ef-text-muted);
      margin-top: 2px;
    }

    .ch__bar {
      width: 74px;
      flex-shrink: 0;
    }

    .ch__tools {
      display: flex;
      gap: 4px;
    }

    .ch__chev {
      flex-shrink: 0;
      color: var(--ef-text-muted);
      transition: transform 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.3);
    }

    .ch--open .ch__chev {
      transform: rotate(180deg);
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

    /* Lessons */
    .lessons {
      padding: 6px 0;
      border-top: 1px solid var(--ef-border);
      animation: ef-fade-in 0.3s ease both;
    }

    .ls {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 18px 9px 26px;
      transition: background 0.18s, padding 0.18s;
    }

    .ls:hover {
      background: var(--ef-surface-2);
      padding-left: 30px;
    }

    .ls__icon {
      width: 27px;
      height: 27px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      color: var(--ef-text-muted);
      background: var(--ef-surface-2);
    }

    .ls--done .ls__icon {
      color: var(--ef-brand-600);
      background: var(--ef-tint-green);
    }

    .ls__main {
      flex: 1;
      min-width: 0;
    }

    .ls__title {
      font-size: 12.5px;
      font-weight: 600;
      color: var(--ef-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ls--done .ls__title {
      color: var(--ef-text-muted);
    }

    .ls__type {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 700;
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .ls__dur {
      flex-shrink: 0;
      min-width: 44px;
      text-align: right;
      font-size: 11px;
      font-weight: 600;
      color: var(--ef-text-muted);
    }

    .ls__check {
      width: 19px;
      height: 19px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2px solid var(--ef-border);
    }

    .ls--done .ls__check {
      background: var(--ef-brand-500);
      border-color: var(--ef-brand-500);
    }

    .ls__empty {
      padding: 12px 26px;
      font-size: 12px;
      color: var(--ef-text-muted);
    }

    .ls__add {
      margin: 6px 18px 6px 26px;
      font-size: 12px;
      font-weight: 700;
      color: var(--ef-ink-green);
    }

    .ls__add:hover {
      text-decoration: underline;
    }

    @media (max-width: 540px) {
      .ls__type {
        display: none;
      }
      .hero {
        padding: 20px;
      }
    }
  `,
})
export class CourseDetailComponent {
  private readonly api = inject(CoursesApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Route param, bound via withComponentInputBinding. */
  readonly id = input.required<string>();

  protected readonly course = signal<CourseDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  private readonly open = signal<Set<number>>(new Set());

  protected readonly editingCourse = signal(false);
  protected readonly chapterForm = signal<{ chapter: Chapter | null } | null>(null);
  protected readonly lessonForm = signal<{ chapter: Chapter; lesson: Lesson | null } | null>(null);

  protected readonly isAdmin = this.auth.isAdmin;

  protected readonly cover = computed(() => coverFor(this.course()?.color ?? null, 0));
  protected readonly levelShort = computed(() => {
    const c = this.course();
    return c ? LEVEL_LABELS[c.level].replace('informatique', 'info') : '';
  });

  protected readonly totals = computed(() => {
    const lessons = (this.course()?.chapters ?? []).flatMap((ch) => ch.lessons);
    const done = lessons.filter((l) => l.completed).length;
    return {
      lessons: lessons.length,
      videos: lessons.filter((l) => l.type === 'VIDEO').length,
      duration: formatMinutes(lessons.reduce((n, l) => n + (l.durationMinutes ?? 0), 0)),
      percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
    };
  });

  protected readonly chapters = computed(() =>
    (this.course()?.chapters ?? []).map((ch) => {
      const done = ch.lessons.filter((l) => l.completed).length;
      const total = ch.lessons.length;
      return {
        ...ch,
        num: String(ch.position).padStart(2, '0'),
        open: this.open().has(ch.id),
        duration: formatMinutes(ch.lessons.reduce((n, l) => n + (l.durationMinutes ?? 0), 0)),
        pct: total ? Math.round((done / total) * 100) : 0,
        doneLabel: total && done === total ? 'Terminé' : `${done} / ${total} terminées`,
      };
    }),
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get(Number(this.id())).subscribe({
      next: (c) => {
        this.course.set(c);
        // First chapter open by default, like the design.
        if (!this.open().size && c.chapters[0]) {
          this.open.set(new Set([c.chapters[0].id]));
        }
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail);
        this.loading.set(false);
      },
    });
  }

  protected toggle(id: number): void {
    this.open.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  protected icon(type: LessonType): string {
    return LESSON_ICONS[type];
  }

  protected typeLabel(type: LessonType): string {
    return LESSON_TYPE_LABELS[type];
  }

  protected courseSaved(c: CourseDetail): void {
    this.editingCourse.set(false);
    this.course.set(c);
    this.toast.success('Module mis à jour');
  }

  protected chapterSaved(c: CourseDetail, previous: Chapter | null): void {
    this.chapterForm.set(null);
    const known = new Set((this.course()?.chapters ?? []).map((ch) => ch.id));
    this.course.set(c);
    // Open the chapter that was just added so lessons can be added right away.
    const added = c.chapters.find((ch) => !known.has(ch.id));
    if (added) {
      this.open.update((s) => new Set(s).add(added.id));
    }
    this.toast.success(previous ? 'Chapitre mis à jour' : 'Chapitre ajouté');
  }

  protected lessonSaved(chapter: Chapter, previous: Lesson | null): void {
    this.lessonForm.set(null);
    this.replaceChapter(chapter);
    this.toast.success(previous ? 'Leçon mise à jour' : 'Leçon ajoutée');
  }

  protected deleteCourse(c: CourseDetail): void {
    if (!confirm(`Supprimer le module « ${c.title} » avec tous ses chapitres et leçons ?`)) {
      return;
    }
    this.api.delete(c.id).subscribe({
      next: () => {
        this.toast.success('Module supprimé');
        this.router.navigate(['/app/courses']);
      },
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }

  protected deleteChapter(ch: Chapter): void {
    if (!confirm(`Supprimer le chapitre « ${ch.title} » et ses ${ch.lessons.length} leçon(s) ?`)) {
      return;
    }
    this.api.deleteChapter(ch.id).subscribe({
      next: () => {
        this.toast.success('Chapitre supprimé');
        this.load();
      },
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }

  protected deleteLesson(ch: Chapter, ls: Lesson): void {
    if (!confirm(`Supprimer la leçon « ${ls.title} » ?`)) {
      return;
    }
    this.api.deleteLesson(ls.id).subscribe({
      next: () => {
        this.replaceChapter({ ...ch, lessons: ch.lessons.filter((l) => l.id !== ls.id) });
        this.toast.success('Leçon supprimée');
      },
      error: (e: ApiError) => this.toast.error(e.detail),
    });
  }

  private replaceChapter(chapter: Chapter): void {
    this.course.update((c) =>
      c ? { ...c, chapters: c.chapters.map((ch) => (ch.id === chapter.id ? chapter : ch)) } : c,
    );
  }
}
