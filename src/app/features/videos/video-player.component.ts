import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BOOK_CHAPTERS,
  BOOK_LEVEL_LABEL,
  BOOK_VIDEOS,
  VIDEO_KIND_LABELS,
  formatDuration,
  videoByCode,
  videoPoster,
  videoSrc,
} from './videos.catalog';
import { leaveVideosWhenAdminChangesLevel } from './videos.guard';

/** One video of the book, reached from the QR code printed next to a TP (`/v/<code>`). */
@Component({
  selector: 'ef-video-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="ef-page">
      <a routerLink="/app/videos" class="back">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Toutes les vidéos
      </a>

      @if (video(); as v) {
        <div class="tags">
          <span class="tag" [class.tag--corr]="v.kind === 'CORRECTION'">{{
            kindLabel()
          }}</span>
          <span class="tag tag--muted"
            >{{ levelLabel }} · Chapitre {{ v.chapter }} ·
            {{ chapterTitle() }}</span
          >
        </div>
        <h1 class="title">{{ v.title }}</h1>

        <div class="player">
          <!-- The key forces a fresh element when moving to the next video -->
          @for (k of [v.code]; track k) {
            <video
              controls
              playsinline
              preload="metadata"
              [src]="src()"
              [poster]="poster()"
            >
              Votre navigateur ne peut pas lire cette vidéo.
            </video>
          }
        </div>

        <div class="meta">
          <span>⏱ {{ duration() }}</span>
          @if (v.voice === 'AR') {
            <span>🇹🇳 Voix en arabe · 🇫🇷 sous-titres en français</span>
          } @else {
            <span>🇫🇷 Voix en français · 🇹🇳 mots clés en arabe</span>
          }
          <a class="dl" [href]="src()" [attr.download]="v.code + '.mp4'"
            >Télécharger</a
          >
        </div>

        <p class="blurb">{{ v.blurb }}</p>

        @if (v.kind === 'CORRECTION') {
          <div class="tip">
            <b>Comment bien utiliser cette correction</b>
            Fais d'abord le TP seul, avec ton cahier. Ensuite, regarde la vidéo
            et mets-la en
            <b>pause</b> après chaque étape pour comparer avec ton travail.
          </div>
        }

        <nav class="nav">
          @if (prev(); as p) {
            <a class="nav__btn" [routerLink]="['/app/videos', p.code]"
              >← {{ p.title }}</a
            >
          } @else {
            <span></span>
          }
          @if (next(); as n) {
            <a
              class="nav__btn nav__btn--next"
              [routerLink]="['/app/videos', n.code]"
              >{{ n.title }} →</a
            >
          }
        </nav>
      } @else {
        <div class="ef-empty">
          <div class="ef-empty__title">Vidéo introuvable</div>
          <div class="ef-empty__text">
            Le code « {{ code() }} » ne correspond à aucune vidéo. Vérifie le QR
            code ou choisis dans la liste.
          </div>
          <a routerLink="/app/videos" class="ef-soft-btn"
            >Voir toutes les vidéos</a
          >
        </div>
      }
    </div>
  `,
  styles: `
    .back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 700;
      color: var(--ef-ink-green);
      margin-bottom: 14px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    .tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 5px 11px;
      border-radius: var(--ef-radius-pill);
      color: var(--ef-ink-green);
      background: var(--ef-surface-2);
    }
    .tag--corr {
      color: var(--ef-ink-amber);
      background: var(--ef-tint-amber);
    }
    .tag--muted {
      text-transform: none;
      letter-spacing: 0;
      font-weight: 700;
      color: var(--ef-text-muted);
    }
    .title {
      font-family: var(--ef-font-display);
      font-size: 22px;
      font-weight: 800;
      color: var(--ef-text);
      margin-bottom: 14px;
    }
    .player {
      background: #000;
      border-radius: var(--ef-radius-lg);
      overflow: hidden;
      box-shadow: var(--ef-shadow-md);
      aspect-ratio: 16 / 9;
    }
    .player video {
      width: 100%;
      height: 100%;
      display: block;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 14px;
      margin-top: 12px;
      font-size: 13px;
      color: var(--ef-text-muted);
    }
    .dl {
      margin-left: auto;
      font-weight: 800;
      color: var(--ef-ink-green);
    }
    .blurb {
      margin-top: 10px;
      font-size: 14px;
      color: var(--ef-text);
    }
    .tip {
      margin-top: 14px;
      padding: 12px 16px;
      border-radius: var(--ef-radius-md);
      background: var(--ef-tint-amber);
      color: var(--ef-ink-amber);
      font-size: 13.5px;
      line-height: 1.6;
    }
    .tip b:first-child {
      display: block;
      margin-bottom: 2px;
    }
    .nav {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: 22px;
      flex-wrap: wrap;
    }
    .nav__btn {
      padding: 10px 14px;
      border-radius: var(--ef-radius-md);
      border: 1px solid var(--ef-border);
      background: var(--ef-surface);
      font-size: 13px;
      font-weight: 700;
      color: var(--ef-text);
      max-width: 48%;
    }
    .nav__btn--next {
      margin-left: auto;
      text-align: right;
    }
    @media (max-width: 640px) {
      .nav__btn {
        max-width: 100%;
      }
      .dl {
        margin-left: 0;
      }
    }
  `,
})
export class VideoPlayerComponent {
  constructor() {
    leaveVideosWhenAdminChangesLevel();
  }

  /** Bound from the `:code` route parameter. */
  readonly code = input<string>('');

  protected readonly levelLabel = BOOK_LEVEL_LABEL;
  protected readonly video = computed(() => videoByCode(this.code()));
  private readonly index = computed(() =>
    BOOK_VIDEOS.findIndex((v) => v === this.video()),
  );

  protected readonly src = computed(() =>
    this.video() ? videoSrc(this.video()!) : '',
  );
  protected readonly poster = computed(() =>
    this.video() ? videoPoster(this.video()!) : '',
  );
  protected readonly duration = computed(() =>
    formatDuration(this.video()?.duration ?? 0),
  );
  protected readonly kindLabel = computed(() =>
    this.video() ? VIDEO_KIND_LABELS[this.video()!.kind] : '',
  );
  protected readonly chapterTitle = computed(
    () =>
      BOOK_CHAPTERS.find((c) => c.num === this.video()?.chapter)?.title ?? '',
  );
  protected readonly prev = computed(() =>
    this.index() > 0 ? BOOK_VIDEOS[this.index() - 1] : null,
  );
  protected readonly next = computed(() =>
    this.index() >= 0 && this.index() < BOOK_VIDEOS.length - 1
      ? BOOK_VIDEOS[this.index() + 1]
      : null,
  );
}
