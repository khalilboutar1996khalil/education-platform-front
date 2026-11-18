import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BOOK_CHAPTERS,
  BOOK_LEVEL_LABEL,
  BOOK_VIDEOS,
  BookVideo,
  VIDEO_KIND_LABELS,
  VIDEO_LANGUAGES,
  VideoKind,
  formatDuration,
  readWatched,
  totalMinutes,
  videoPoster,
} from './videos.catalog';
import { leaveVideosWhenAdminChangesLevel } from './videos.guard';

type Filter = 'ALL' | VideoKind;

/** Every video of the 7ᵉ book, grouped by chapter (`/v/7` in the printed QR code). */
@Component({
  selector: 'ef-video-library',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="ef-page">
      <!-- Hero -->
      <section class="hero">
        <div class="hero__text">
          <span class="hero__kicker">🎬 Vidéos du cahier · {{ levelLabel }}</span>
          <h1 class="hero__title">Revois le cours et corrige tes TP, pas à pas</h1>
          <p class="hero__sub">{{ languages }}</p>
          <div class="hero__stats">
            <span><b>{{ all.length }}</b> vidéos</span>
            <span><b>{{ minutes }}</b> min</span>
            <span><b>{{ chapters.length }}</b> chapitres</span>
          </div>
          @if (next(); as n) {
            <a class="hero__cta" [routerLink]="['/app/videos', n.code]">
              ▶ {{ watchedCount() ? 'Continuer' : 'Commencer' }} : {{ n.title }}
            </a>
          } @else {
            <span class="hero__done">🏆 Bravo, tu as regardé toutes les vidéos !</span>
          }
        </div>
        <div class="hero__ring" [style.--p]="progress()" role="img" [attr.aria-label]="watchedCount() + ' vidéos vues sur ' + all.length">
          <div class="hero__ring-in">
            <b>{{ watchedCount() }}/{{ all.length }}</b>
            <span>vues</span>
          </div>
        </div>
      </section>

      <div class="bar">
        <div class="filters" role="tablist" aria-label="Type de vidéo">
          @for (f of filters; track f.value) {
            <button
              type="button"
              role="tab"
              class="chip"
              [class.chip--on]="filter() === f.value"
              [attr.aria-selected]="filter() === f.value"
              (click)="filter.set(f.value)"
            >
              {{ f.icon }} {{ f.label }}
            </button>
          }
        </div>
        <div class="legend">Scanne le QR code d'un TP dans ton cahier pour ouvrir sa correction.</div>
      </div>

      @for (ch of groups(); track ch.num) {
        <section class="ch" [style.--c]="ch.color">
          <header class="ch__head">
            <span class="ch__icon" aria-hidden="true">{{ ch.icon }}</span>
            <div class="ch__titles">
              <span class="ch__num">Chapitre {{ ch.num }}</span>
              <h2 class="ch__title">{{ ch.title }}</h2>
            </div>
            <div class="ch__meter" [attr.aria-label]="ch.seen + ' sur ' + ch.videos.length + ' vues'">
              <span class="ch__meter-txt">{{ ch.seen }}/{{ ch.videos.length }} vues</span>
              <span class="ch__meter-bar"><span [style.width.%]="(ch.seen / ch.videos.length) * 100"></span></span>
            </div>
          </header>
          <div class="grid">
            @for (v of ch.videos; track v.code) {
              <a class="card" [routerLink]="['/app/videos', v.code]" [class.card--seen]="watched().has(v.code)">
                <div class="thumb">
                  <img [src]="poster(v)" alt="" loading="lazy" />
                  <span class="thumb__shade"></span>
                  <span class="play" aria-hidden="true"><span>▶</span></span>
                  <span class="len">{{ duration(v) }}</span>
                  <span class="kind" [class.kind--corr]="v.kind === 'CORRECTION'">{{ kindIcon(v) }} {{ kindLabels[v.kind] }}</span>
                  @if (watched().has(v.code)) {
                    <span class="seen">✓ Vue</span>
                  }
                </div>
                <div class="body">
                  <div class="name">{{ v.title }}</div>
                  <div class="blurb">{{ v.blurb }}</div>
                </div>
              </a>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .hero {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 28px 30px;
      margin-bottom: 18px;
      border-radius: var(--ef-radius-xl);
      color: #fff;
      background:
        radial-gradient(circle at 85% 20%, rgba(255, 255, 255, 0.18), transparent 40%),
        radial-gradient(circle at 10% 110%, rgba(255, 209, 102, 0.35), transparent 45%),
        linear-gradient(135deg, #0f5132, #15803d 55%, #22c55e);
      box-shadow: var(--ef-shadow-lg);
      overflow: hidden;
    }
    .hero__kicker {
      display: inline-block;
      padding: 5px 12px;
      border-radius: var(--ef-radius-pill);
      background: rgba(255, 255, 255, 0.16);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.03em;
    }
    .hero__title {
      margin-top: 12px;
      font-family: var(--ef-font-display);
      font-size: 26px;
      line-height: 1.2;
      font-weight: 800;
      max-width: 560px;
    }
    .hero__sub {
      margin-top: 8px;
      font-size: 14px;
      font-weight: 700;
      opacity: 0.92;
    }
    .hero__stats {
      display: flex;
      gap: 18px;
      margin-top: 14px;
      font-size: 13px;
      opacity: 0.92;
    }
    .hero__stats b {
      font-size: 18px;
      margin-right: 3px;
    }
    .hero__cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 18px;
      padding: 11px 18px;
      border-radius: 12px;
      background: #fff;
      color: #0f5132;
      font-size: 13.5px;
      font-weight: 800;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.18);
      max-width: 100%;
    }
    .hero__done {
      display: inline-block;
      margin-top: 18px;
      font-weight: 800;
    }
    .hero__ring {
      --p: 0;
      flex: none;
      width: 132px;
      height: 132px;
      border-radius: 50%;
      background: conic-gradient(#ffd166 calc(var(--p) * 1%), rgba(255, 255, 255, 0.22) 0);
      display: grid;
      place-items: center;
    }
    .hero__ring-in {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      background: #0f5132;
      display: grid;
      place-content: center;
      text-align: center;
    }
    .hero__ring-in b {
      font-family: var(--ef-font-display);
      font-size: 26px;
    }
    .hero__ring-in span {
      font-size: 12px;
      opacity: 0.85;
    }
    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 18px;
    }
    .filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .chip {
      padding: 8px 14px;
      border-radius: var(--ef-radius-pill);
      border: 1px solid var(--ef-border);
      background: var(--ef-surface);
      font-size: 12.5px;
      font-weight: 700;
      color: var(--ef-text-muted);
      cursor: pointer;
    }
    .chip--on {
      background: var(--ef-brand-600);
      border-color: var(--ef-brand-600);
      color: var(--ef-text-on-brand);
    }
    .legend {
      font-size: 12.5px;
      color: var(--ef-text-muted);
    }
    .ch {
      margin-bottom: 28px;
    }
    .ch__head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 3px solid color-mix(in srgb, var(--c) 25%, transparent);
    }
    .ch__icon {
      width: 44px;
      height: 44px;
      border-radius: 13px;
      display: grid;
      place-items: center;
      font-size: 22px;
      background: var(--c);
      box-shadow: 0 6px 14px color-mix(in srgb, var(--c) 35%, transparent);
    }
    .ch__titles {
      flex: 1;
      min-width: 0;
    }
    .ch__num {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--c);
    }
    .ch__title {
      font-family: var(--ef-font-display);
      font-size: 17px;
      font-weight: 800;
      color: var(--ef-text);
    }
    .ch__meter {
      display: grid;
      gap: 5px;
      justify-items: end;
      min-width: 110px;
    }
    .ch__meter-txt {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--ef-text-muted);
    }
    .ch__meter-bar {
      width: 110px;
      height: 6px;
      border-radius: 99px;
      background: var(--ef-surface-2);
      overflow: hidden;
    }
    .ch__meter-bar span {
      display: block;
      height: 100%;
      background: var(--c);
      border-radius: 99px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
    }
    .card {
      display: block;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      border-radius: var(--ef-radius-lg);
      overflow: hidden;
      box-shadow: var(--ef-shadow-sm);
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease;
      color: inherit;
    }
    .card:hover {
      transform: translateY(-3px);
      box-shadow: var(--ef-shadow-md);
    }
    .card:hover .play span {
      transform: scale(1.1);
    }
    .card:focus-visible {
      outline: 3px solid var(--c);
      outline-offset: 2px;
    }
    .thumb {
      position: relative;
      aspect-ratio: 16 / 9;
      background: #0c2417;
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .thumb__shade {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(0, 0, 0, 0.35), transparent 35%, transparent 60%, rgba(0, 0, 0, 0.45));
    }
    .play {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
    }
    .play span {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--c);
      color: #fff;
      display: grid;
      place-items: center;
      font-size: 18px;
      padding-left: 3px;
      border: 3px solid #fff;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
      transition: transform 0.18s ease;
    }
    .len {
      position: absolute;
      right: 8px;
      bottom: 8px;
      background: rgba(0, 0, 0, 0.72);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }
    .kind {
      position: absolute;
      left: 8px;
      top: 8px;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.03em;
      padding: 4px 9px;
      border-radius: var(--ef-radius-pill);
      background: #fff;
      color: var(--ef-ink-green);
    }
    .kind--corr {
      color: var(--ef-ink-amber);
    }
    .seen {
      position: absolute;
      right: 8px;
      top: 8px;
      font-size: 10.5px;
      font-weight: 800;
      padding: 4px 9px;
      border-radius: var(--ef-radius-pill);
      background: #16a34a;
      color: #fff;
    }
    .card--seen .thumb img {
      filter: saturate(0.7);
    }
    .body {
      padding: 12px 14px 14px;
      border-top: 4px solid var(--c);
    }
    .name {
      font-size: 14px;
      font-weight: 800;
      color: var(--ef-text);
    }
    .blurb {
      margin-top: 4px;
      font-size: 12.5px;
      color: var(--ef-text-muted);
      line-height: 1.5;
    }
    @media (max-width: 640px) {
      .hero {
        flex-direction: column;
        align-items: flex-start;
        padding: 22px 20px;
      }
      .hero__title {
        font-size: 21px;
      }
      .hero__ring {
        display: none;
      }
      .ch__meter {
        display: none;
      }
    }
  `,
})
export class VideoLibraryComponent {
  constructor() {
    leaveVideosWhenAdminChangesLevel();
  }

  protected readonly levelLabel = BOOK_LEVEL_LABEL;
  protected readonly languages = VIDEO_LANGUAGES;
  protected readonly kindLabels = VIDEO_KIND_LABELS;
  protected readonly all = BOOK_VIDEOS;
  protected readonly chapters = BOOK_CHAPTERS;
  protected readonly minutes = totalMinutes(BOOK_VIDEOS);
  protected readonly filters: { value: Filter; label: string; icon: string }[] = [
    { value: 'ALL', label: 'Toutes', icon: '🎬' },
    { value: 'RETENIR', label: 'À retenir', icon: '💡' },
    { value: 'CORRECTION', label: 'Corrections de TP', icon: '🛠️' },
  ];
  protected readonly filter = signal<Filter>('ALL');
  protected readonly watched = signal(readWatched());

  protected readonly watchedCount = computed(() => BOOK_VIDEOS.filter((v) => this.watched().has(v.code)).length);
  protected readonly progress = computed(() => Math.round((this.watchedCount() / BOOK_VIDEOS.length) * 100));
  /** The first video not yet watched, in book order. */
  protected readonly next = computed(() => BOOK_VIDEOS.find((v) => !this.watched().has(v.code)) ?? null);

  protected readonly groups = computed(() => {
    const f = this.filter();
    const seen = this.watched();
    return BOOK_CHAPTERS.map((ch) => {
      const videos = BOOK_VIDEOS.filter((v) => v.chapter === ch.num && (f === 'ALL' || v.kind === f));
      return { ...ch, videos, seen: videos.filter((v) => seen.has(v.code)).length };
    }).filter((ch) => ch.videos.length > 0);
  });

  protected poster(v: BookVideo): string {
    return videoPoster(v);
  }

  protected duration(v: BookVideo): string {
    return formatDuration(v.duration);
  }

  protected kindIcon(v: BookVideo): string {
    return v.kind === 'CORRECTION' ? '🛠️' : '💡';
  }
}
