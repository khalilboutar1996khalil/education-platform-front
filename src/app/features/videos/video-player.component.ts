import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BOOK_LEVEL_LABEL,
  BOOK_VIDEOS,
  BookVideo,
  VIDEO_KIND_LABELS,
  VIDEO_LANGUAGES,
  chapterOf,
  formatDuration,
  markWatched,
  readWatched,
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
    <div class="ef-page" [style.--c]="chapter()?.color ?? '#15803d'">
      <a routerLink="/app/videos" class="back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Toutes les vidéos
      </a>

      @if (video(); as v) {
        <div class="layout">
          <div class="main">
            <header class="head">
              <span class="head__icon" aria-hidden="true">{{ chapter()?.icon }}</span>
              <div>
                <div class="head__tags">
                  <span class="tag" [class.tag--corr]="v.kind === 'CORRECTION'">{{ kindIcon(v) }} {{ kindLabel() }}</span>
                  <span class="crumb">{{ levelLabel }} · Chapitre {{ v.chapter }} · {{ chapter()?.title }}</span>
                </div>
                <h1 class="title">{{ v.title }}</h1>
              </div>
            </header>

            <div class="player">
              <!-- The key forces a fresh element when moving to the next video -->
              @for (k of [v.code]; track k) {
                <video controls playsinline preload="metadata" [src]="src()" [poster]="poster()" (ended)="ended(v)">
                  Votre navigateur ne peut pas lire cette vidéo.
                </video>
              }
            </div>

            <div class="meta">
              <span class="pill">⏱ {{ duration() }}</span>
              <span class="pill">{{ languages }}</span>
              @if (watched().has(v.code)) {
                <span class="pill pill--ok">✓ Vue</span>
              }
              <a class="dl" [href]="src()" [attr.download]="v.code + '.mp4'">⬇ Télécharger</a>
            </div>

            <p class="blurb">{{ v.blurb }}</p>

            @if (v.kind === 'CORRECTION') {
              <div class="tip">
                <b>💡 Comment bien utiliser cette correction</b>
                Fais d'abord le TP seul, avec ton cahier. Ensuite, regarde la vidéo et mets-la en
                <b>pause</b> après chaque étape pour comparer avec ton travail.
              </div>
            }

            <nav class="nav">
              @if (prev(); as p) {
                <a class="nav__btn" [routerLink]="['/app/videos', p.code]"><small>← Précédente</small>{{ p.title }}</a>
              } @else {
                <span></span>
              }
              @if (next(); as n) {
                <a class="nav__btn nav__btn--next" [routerLink]="['/app/videos', n.code]"><small>Suivante →</small>{{ n.title }}</a>
              }
            </nav>
          </div>

          <aside class="side" aria-label="Vidéos de ce chapitre">
            <div class="side__title">Dans ce chapitre</div>
            @for (o of siblings(); track o.code) {
              <a class="item" [class.item--on]="o.code === v.code" [routerLink]="['/app/videos', o.code]">
                <span class="item__thumb">
                  <img [src]="posterOf(o)" alt="" loading="lazy" />
                  @if (o.code === v.code) {
                    <span class="item__now">▶ En cours</span>
                  }
                </span>
                <span class="item__text">
                  <span class="item__name">{{ o.title }}</span>
                  <span class="item__meta">
                    {{ durationOf(o) }}
                    @if (watched().has(o.code)) {
                      · <b>✓ vue</b>
                    }
                  </span>
                </span>
              </a>
            }
          </aside>
        </div>
      } @else {
        <div class="ef-empty">
          <div class="ef-empty__title">Vidéo introuvable</div>
          <div class="ef-empty__text">Le code « {{ code() }} » ne correspond à aucune vidéo. Vérifie le QR code ou choisis dans la liste.</div>
          <a routerLink="/app/videos" class="ef-soft-btn">Voir toutes les vidéos</a>
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
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 22px;
      align-items: start;
    }
    .head {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
    }
    .head__icon {
      flex: none;
      width: 50px;
      height: 50px;
      border-radius: 15px;
      display: grid;
      place-items: center;
      font-size: 24px;
      background: var(--c);
      box-shadow: 0 6px 16px color-mix(in srgb, var(--c) 35%, transparent);
    }
    .head__tags {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .tag {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: var(--ef-radius-pill);
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
    }
    .tag--corr {
      color: var(--ef-ink-amber);
      background: var(--ef-tint-amber);
    }
    .crumb {
      font-size: 12px;
      font-weight: 700;
      color: var(--ef-text-muted);
    }
    .title {
      margin-top: 4px;
      font-family: var(--ef-font-display);
      font-size: 23px;
      font-weight: 800;
      color: var(--ef-text);
    }
    .player {
      background: #000;
      border-radius: var(--ef-radius-xl);
      overflow: hidden;
      box-shadow: var(--ef-shadow-lg);
      aspect-ratio: 16 / 9;
      outline: 4px solid color-mix(in srgb, var(--c) 30%, transparent);
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
      gap: 8px;
      margin-top: 14px;
    }
    .pill {
      padding: 6px 11px;
      border-radius: var(--ef-radius-pill);
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      font-size: 12.5px;
      font-weight: 700;
      color: var(--ef-text);
    }
    .pill--ok {
      background: #16a34a;
      border-color: #16a34a;
      color: #fff;
    }
    .dl {
      margin-left: auto;
      padding: 8px 14px;
      border-radius: 10px;
      background: var(--c);
      color: #fff;
      font-size: 12.5px;
      font-weight: 800;
    }
    .blurb {
      margin-top: 12px;
      font-size: 14px;
      color: var(--ef-text);
    }
    .tip {
      margin-top: 14px;
      padding: 13px 16px;
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
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .nav__btn {
      display: grid;
      gap: 2px;
      padding: 10px 14px;
      border-radius: var(--ef-radius-md);
      border: 1px solid var(--ef-border);
      background: var(--ef-surface);
      font-size: 13px;
      font-weight: 700;
      color: var(--ef-text);
      max-width: 48%;
    }
    .nav__btn small {
      font-size: 11px;
      font-weight: 800;
      color: var(--c);
    }
    .nav__btn--next {
      margin-left: auto;
      text-align: right;
    }
    .side {
      position: sticky;
      top: 16px;
      display: grid;
      gap: 8px;
      padding: 14px;
      border-radius: var(--ef-radius-lg);
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      border-top: 5px solid var(--c);
    }
    .side__title {
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--c);
      margin-bottom: 2px;
    }
    .item {
      display: grid;
      grid-template-columns: 104px 1fr;
      gap: 10px;
      align-items: center;
      padding: 6px;
      border-radius: 12px;
      color: inherit;
    }
    .item:hover {
      background: var(--ef-surface-2);
    }
    .item--on {
      background: color-mix(in srgb, var(--c) 12%, transparent);
    }
    .item__thumb {
      position: relative;
      aspect-ratio: 16 / 9;
      border-radius: 8px;
      overflow: hidden;
      background: #0c2417;
    }
    .item__thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .item__now {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      background: color-mix(in srgb, var(--c) 70%, transparent);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
    }
    .item__text {
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .item__name {
      font-size: 12.5px;
      font-weight: 800;
      color: var(--ef-text);
      line-height: 1.3;
    }
    .item__meta {
      font-size: 11.5px;
      color: var(--ef-text-muted);
    }
    .item__meta b {
      color: #16a34a;
    }
    @media (max-width: 960px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .side {
        position: static;
      }
    }
    @media (max-width: 640px) {
      .nav__btn {
        max-width: 100%;
      }
      .dl {
        margin-left: 0;
      }
      .title {
        font-size: 19px;
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
  protected readonly languages = VIDEO_LANGUAGES;
  protected readonly watched = signal(readWatched());
  protected readonly video = computed(() => videoByCode(this.code()));
  protected readonly chapter = computed(() => chapterOf(this.video()));
  private readonly index = computed(() => BOOK_VIDEOS.findIndex((v) => v === this.video()));

  protected readonly src = computed(() => (this.video() ? videoSrc(this.video()!) : ''));
  protected readonly poster = computed(() => (this.video() ? videoPoster(this.video()!) : ''));
  protected readonly duration = computed(() => formatDuration(this.video()?.duration ?? 0));
  protected readonly kindLabel = computed(() => (this.video() ? VIDEO_KIND_LABELS[this.video()!.kind] : ''));
  protected readonly siblings = computed(() => BOOK_VIDEOS.filter((v) => v.chapter === this.video()?.chapter));
  protected readonly prev = computed(() => (this.index() > 0 ? BOOK_VIDEOS[this.index() - 1] : null));
  protected readonly next = computed(() =>
    this.index() >= 0 && this.index() < BOOK_VIDEOS.length - 1 ? BOOK_VIDEOS[this.index() + 1] : null,
  );

  /** Watched to the end: shown as « Vue » here and in the library. */
  protected ended(v: BookVideo): void {
    this.watched.set(markWatched(v.code));
  }

  protected posterOf(v: BookVideo): string {
    return videoPoster(v);
  }

  protected durationOf(v: BookVideo): string {
    return formatDuration(v.duration);
  }

  protected kindIcon(v: BookVideo): string {
    return v.kind === 'CORRECTION' ? '🛠️' : '💡';
  }
}
