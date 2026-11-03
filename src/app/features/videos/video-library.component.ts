import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BOOK_CHAPTERS,
  BOOK_LEVEL_LABEL,
  BOOK_VIDEOS,
  BookVideo,
  VIDEO_KIND_LABELS,
  VideoKind,
  formatDuration,
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
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Vidéos du cahier · {{ levelLabel }}</div>
          <div class="sub">
            L'essentiel de chaque chapitre et la correction pas à pas de chaque
            TP.
          </div>
        </div>
        <div class="filters" role="tablist">
          @for (f of filters; track f.value) {
            <button
              type="button"
              role="tab"
              class="chip"
              [class.chip--on]="filter() === f.value"
              [attr.aria-selected]="filter() === f.value"
              (click)="filter.set(f.value)"
            >
              {{ f.label }}
            </button>
          }
        </div>
      </div>

      @for (ch of groups(); track ch.num) {
        <section class="ch">
          <h2 class="ch__title">
            <span class="ch__num">{{ ch.num }}</span
            >{{ ch.title }}
          </h2>
          <div class="grid">
            @for (v of ch.videos; track v.code) {
              <a class="card" [routerLink]="['/app/videos', v.code]">
                <div class="thumb">
                  <img [src]="poster(v)" alt="" loading="lazy" />
                  <span class="play" aria-hidden="true">▶</span>
                  <span class="len">{{ duration(v) }}</span>
                </div>
                <div class="body">
                  <span
                    class="kind"
                    [class.kind--corr]="v.kind === 'CORRECTION'"
                    >{{ kindLabels[v.kind] }}</span
                  >
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
    .sub {
      margin-top: 4px;
      font-size: 13px;
      color: var(--ef-text-muted);
    }
    .filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .chip {
      padding: 7px 13px;
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
    .ch {
      margin-bottom: 26px;
    }
    .ch__title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--ef-font-display);
      font-size: 16px;
      font-weight: 800;
      color: var(--ef-text);
      margin-bottom: 12px;
    }
    .ch__num {
      width: 28px;
      height: 28px;
      border-radius: 9px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--ef-gradient-brand);
      color: #fff;
      font-size: 14px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 14px;
    }
    .card {
      display: block;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      border-radius: var(--ef-radius-lg);
      overflow: hidden;
      box-shadow: var(--ef-shadow-sm);
      transition:
        transform 0.15s ease,
        box-shadow 0.15s ease;
      color: inherit;
    }
    .card:hover {
      transform: translateY(-2px);
      box-shadow: var(--ef-shadow-md);
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
    .play {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .len {
      position: absolute;
      right: 8px;
      bottom: 8px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
    }
    .body {
      padding: 12px 14px 14px;
    }
    .kind {
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ef-ink-green);
    }
    .kind--corr {
      color: var(--ef-ink-amber);
    }
    .name {
      margin-top: 4px;
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
  `,
})
export class VideoLibraryComponent {
  constructor() {
    leaveVideosWhenAdminChangesLevel();
  }

  protected readonly levelLabel = BOOK_LEVEL_LABEL;
  protected readonly kindLabels = VIDEO_KIND_LABELS;
  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'RETENIR', label: 'À retenir' },
    { value: 'CORRECTION', label: 'Corrections de TP' },
  ];
  protected readonly filter = signal<Filter>('ALL');

  protected readonly groups = computed(() => {
    const f = this.filter();
    return BOOK_CHAPTERS.map((ch) => ({
      ...ch,
      videos: BOOK_VIDEOS.filter(
        (v) => v.chapter === ch.num && (f === 'ALL' || v.kind === f),
      ),
    })).filter((ch) => ch.videos.length > 0);
  });

  protected poster(v: BookVideo): string {
    return videoPoster(v);
  }

  protected duration(v: BookVideo): string {
    return formatDuration(v.duration);
  }
}
