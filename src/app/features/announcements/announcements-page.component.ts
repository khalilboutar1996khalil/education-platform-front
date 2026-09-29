import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/models/api.model';
import { LEVEL_LABELS, Level } from '../../core/models/user.model';
import { LevelService } from '../../core/services/level.service';
import { ToastService } from '../../core/services/toast.service';
import { timeAgo } from '../../shared/datetime';
import { SpinnerComponent } from '../../shared/ui/spinner.component';
import { CoursesApi } from '../courses/courses.api';
import { CourseSummary } from '../courses/courses.model';
import { AnnouncementComposerComponent, SaveResult } from './announcement-composer.component';
import { AnnouncementsApi } from './announcements.api';
import { Announcement } from './announcements.model';

@Component({
  selector: 'ef-announcements-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, SpinnerComponent, AnnouncementComposerComponent],
  template: `
    <div class="ef-page wrap">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Annonces</div>
          @if (isAdmin()) {
            <div class="ef-page-sub">{{ levelLabel() }}</div>
          }
        </div>
      </div>

      @if (isAdmin()) {
        <ef-announcement-composer
          [level]="levels.current()"
          [courses]="levelCourses()"
          [draft]="editing()"
          (cancel)="editing.set(null)"
          (saved)="saved($event)"
        />
      }

      @if (loading()) {
        <div class="ef-loading"><ef-spinner [size]="26" /></div>
      } @else if (error()) {
        <div class="ef-empty">
          <div class="ef-empty__title">Impossible de charger les annonces</div>
          <div class="ef-empty__text">{{ error() }}</div>
          <button type="button" class="ef-soft-btn" (click)="load()">Réessayer</button>
        </div>
      } @else if (!visible().length) {
        <div class="ef-empty">
          <div class="ef-empty__title">Aucune annonce</div>
          <div class="ef-empty__text">
            {{ isAdmin() ? 'Rédigez une annonce ci-dessus : les élèves concernés seront notifiés.' : 'Les annonces de vos modules apparaîtront ici.' }}
          </div>
        </div>
      } @else {
        <div class="list">
          @for (a of visible(); track a.id) {
            <article class="card" [class.card--draft]="!a.publishedAt" [class.card--editing]="editing()?.id === a.id">
              <div class="card__top">
                <div class="card__title">
                  @if (a.pinned) {
                    <svg class="pin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22" /><path d="M5 17h14v-1.8a2 2 0 0 0-1.1-1.8l-1.8-.9A2 2 0 0 1 15 10.8V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2z" /></svg>
                  }
                  {{ a.title }}
                </div>
                <div class="card__meta">
                  @if (a.publishedAt) {
                    <span class="when" [title]="(a.publishedAt | date: 'd MMM y, HH:mm') ?? ''">{{ ago(a.publishedAt) }}</span>
                    @if (isAdmin() && a.recipientCount !== null) {
                      <span class="reach">{{ a.recipientCount }} destinataire{{ a.recipientCount === 1 ? '' : 's' }}</span>
                    }
                  } @else {
                    <span class="ef-pill ef-pill--amber">Brouillon</span>
                  }
                </div>
              </div>
              <div class="card__body">{{ a.body }}</div>
              <div class="card__foot">
                <span class="scope">● {{ scope(a) }}</span>
                @if (isAdmin()) {
                  <div class="actions">
                    @if (!a.publishedAt) {
                      <button type="button" class="act" (click)="edit(a)">Modifier</button>
                      <button type="button" class="act act--go" [disabled]="busy() === a.id" (click)="publish(a)">Publier</button>
                    }
                    <button type="button" class="act act--danger" [disabled]="busy() === a.id" (click)="remove(a)">Supprimer</button>
                  </div>
                }
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .wrap { max-width: 840px; }
    .list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 11px; }
    .card { padding: 17px 19px; border-radius: 15px; background: var(--ef-surface); border: 1px solid var(--ef-border); transition: border-color 0.22s; animation: ef-fade-up 0.42s ease backwards; }
    .card:hover, .card--editing { border-color: var(--ef-brand-500); }
    .card--draft { border-style: dashed; }
    .card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 7px; }
    .card__title { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; color: var(--ef-text); }
    .pin { flex-shrink: 0; color: var(--ef-ink-green); }
    .card__meta { display: flex; align-items: center; gap: 8px; }
    .when { font-size: 11px; color: var(--ef-text-muted); }
    .reach { font-size: 10.5px; font-weight: 800; padding: 3px 9px; border-radius: 7px; color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .card__body { margin-bottom: 10px; font-size: 13px; line-height: 1.65; color: var(--ef-text-muted); white-space: pre-line; overflow-wrap: anywhere; }
    .card__foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
    .scope { font-size: 11px; font-weight: 700; color: var(--ef-ink-green); }
    .actions { display: flex; gap: 6px; }
    .act { padding: 6px 11px; border-radius: 8px; font-size: 11.5px; font-weight: 700; color: var(--ef-text-muted); background: var(--ef-surface-2); }
    .act:hover:not(:disabled) { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .act--go { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .act--danger:hover:not(:disabled) { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    .act:disabled { opacity: 0.6; }
  `,
})
export class AnnouncementsPageComponent {
  private readonly api = inject(AnnouncementsApi);
  private readonly coursesApi = inject(CoursesApi);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  protected readonly levels = inject(LevelService);

  protected readonly isAdmin = this.auth.isAdmin;
  private readonly all = signal<Announcement[]>([]);
  private readonly courses = signal<CourseSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<number | null>(null);
  protected readonly editing = signal<Announcement | null>(null);

  protected readonly levelLabel = computed(() => LEVEL_LABELS[this.levels.current()]);
  protected readonly levelCourses = computed(() => this.courses().filter((c) => c.level === this.levels.current()));

  private readonly courseLevel = computed(() => new Map(this.courses().map((c) => [c.id, c.level])));

  /** Students get only what is addressed to them from the API; the admin sees every level and narrows to the one picked. */
  protected readonly visible = computed(() => {
    const list = this.isAdmin()
      ? this.all().filter((a) => {
          const target = this.targetLevel(a);
          return target === null || target === this.levels.current();
        })
      : this.all();
    return [...list].sort(
      (a, b) =>
        Number(!!a.publishedAt) - Number(!!b.publishedAt) ||
        Number(b.pinned) - Number(a.pinned) ||
        (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') ||
        b.id - a.id,
    );
  });

  constructor() {
    this.load();
    effect(() => {
      this.levels.current();
      untracked(() => this.editing.set(null));
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin([this.api.list(), this.isAdmin() ? this.coursesApi.list() : of(null)]).subscribe({
      next: ([page, courses]) => {
        this.all.set(page.content);
        if (courses) {
          this.courses.set(courses.content);
        }
        this.loading.set(false);
      },
      error: (e: ApiError) => {
        this.error.set(e.detail);
        this.loading.set(false);
      },
    });
  }

  protected ago(iso: string): string {
    return timeAgo(iso);
  }

  protected scope(a: Announcement): string {
    if (a.courseCode) {
      return a.courseCode;
    }
    if (a.level) {
      return `Tout le niveau · ${LEVEL_LABELS[a.level].replace(' informatique', '')}`;
    }
    return 'Toute la section';
  }

  protected edit(a: Announcement): void {
    this.editing.set(a);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected saved(r: SaveResult): void {
    this.editing.set(null);
    if (r.publishError) {
      this.toast.error(`Enregistrée en brouillon, mais non publiée : ${r.publishError}`);
    } else if (r.published) {
      const n = r.announcement.recipientCount ?? 0;
      this.toast.success(`Annonce publiée · ${n} élève${n === 1 ? '' : 's'} notifié${n === 1 ? '' : 's'}`);
    } else {
      this.toast.success('Brouillon enregistré');
    }
    this.load();
  }

  protected publish(a: Announcement): void {
    if (!confirm(`Publier « ${a.title} » ? Les élèves concernés seront notifiés et l'annonce ne pourra plus être modifiée.`)) {
      return;
    }
    this.busy.set(a.id);
    this.api.publish(a.id).subscribe({
      next: (updated) => {
        this.busy.set(null);
        if (this.editing()?.id === a.id) {
          this.editing.set(null);
        }
        this.all.update((list) => list.map((x) => (x.id === updated.id ? updated : x)));
        const n = updated.recipientCount ?? 0;
        this.toast.success(`Annonce publiée · ${n} élève${n === 1 ? '' : 's'} notifié${n === 1 ? '' : 's'}`);
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        this.toast.error(e.detail);
      },
    });
  }

  protected remove(a: Announcement): void {
    const what = a.publishedAt ? 'Les élèves ne la verront plus.' : '';
    if (!confirm(`Supprimer « ${a.title} » ? ${what}`.trim())) {
      return;
    }
    this.busy.set(a.id);
    this.api.delete(a.id).subscribe({
      next: () => {
        this.busy.set(null);
        if (this.editing()?.id === a.id) {
          this.editing.set(null);
        }
        this.all.update((list) => list.filter((x) => x.id !== a.id));
        this.toast.success('Annonce supprimée');
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        this.toast.error(e.detail);
      },
    });
  }

  private targetLevel(a: Announcement): Level | null {
    return a.courseId !== null ? (this.courseLevel().get(a.courseId) ?? a.level) : a.level;
  }
}
