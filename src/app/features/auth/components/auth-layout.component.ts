import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The mockup's split screen: branded panel on the left, form card on the right. */
@Component({
  selector: 'ef-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="auth">
      <aside class="brand">
        <div class="brand__blob brand__blob--top"></div>
        <div class="brand__blob brand__blob--bottom"></div>

        <div class="brand__inner">
          <div class="brand__logo">
            <div class="brand__mark">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round">
                <path d="M22 10L12 5 2 10l10 5 10-5z" />
                <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
              </svg>
            </div>
            <div>
              <div class="brand__name">EduFlow</div>
              <div class="brand__tag">Plateforme pédagogique</div>
            </div>
          </div>

          <h1 class="brand__title">Trois niveaux.<br />Une seule plateforme.</h1>
          <p class="brand__lead">
            Les élèves de 2ᵉ, 3ᵉ et 4ᵉ AS suivent les chapitres, regardent les vidéos,
            passent les quiz et déposent leurs TP — tout en ligne.
          </p>

          <ul class="brand__list">
            @for (feature of features; track feature; let i = $index) {
              <li class="brand__item" [style.animation-delay.ms]="150 + i * 100">
                <span class="brand__check">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" stroke-width="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {{ feature }}
              </li>
            }
          </ul>
        </div>
      </aside>

      <main class="panel">
        <div class="panel__inner">
          <a routerLink="/" class="back">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            Retour à l'accueil
          </a>
          <h2 class="panel__title">{{ heading() }}</h2>
          <p class="panel__subtitle">{{ subheading() }}</p>
          <ng-content />
        </div>
      </main>
    </div>
  `,
  styles: `
    .auth {
      min-height: 100vh;
      display: flex;
      background: var(--ef-bg);
    }

    .brand {
      flex: 1;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: clamp(32px, 5vw, 72px);
      background: radial-gradient(1200px 600px at 10% 10%, #14532d 0%, #052e16 55%, #03180c 100%);
    }

    .brand__blob {
      position: absolute;
      border-radius: 50%;
      animation: ef-floaty 9s ease-in-out infinite;
    }

    .brand__blob--top {
      top: -120px;
      right: -90px;
      width: 420px;
      height: 420px;
      background: rgba(34, 197, 94, 0.1);
    }

    .brand__blob--bottom {
      bottom: -140px;
      left: -70px;
      width: 320px;
      height: 320px;
      background: rgba(132, 204, 22, 0.08);
      animation-duration: 12s;
      animation-direction: reverse;
    }

    .brand__inner {
      position: relative;
      animation: ef-fade-up 0.6s ease backwards;
    }

    .brand__logo {
      display: flex;
      align-items: center;
      gap: 13px;
      margin-bottom: 46px;
    }

    .brand__mark {
      width: 46px;
      height: 46px;
      flex-shrink: 0;
      border-radius: 15px;
      background: var(--ef-gradient-brand);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(34, 197, 94, 0.35);
    }

    .brand__name {
      font-family: var(--ef-font-display);
      font-size: 23px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.4px;
    }

    .brand__tag {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--ef-brand-400);
    }

    .brand__title {
      font-family: var(--ef-font-display);
      font-size: clamp(30px, 3.4vw, 44px);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -1.2px;
      color: #fff;
      margin-bottom: 18px;
    }

    .brand__lead {
      font-size: 15px;
      line-height: 1.75;
      color: #86a893;
      max-width: 380px;
      margin-bottom: 38px;
    }

    .brand__list {
      display: grid;
      gap: 12px;
      list-style: none;
    }

    .brand__item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      color: var(--ef-text-on-dark);
      animation: ef-slide-right 0.5s ease both;
    }

    .brand__check {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      border-radius: 9px;
      background: rgba(34, 197, 94, 0.16);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .back {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 22px;
      padding: 7px 13px 7px 10px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      color: var(--ef-text-muted);
      background: var(--ef-surface-2);
      transition: color 0.2s, background 0.2s, transform 0.2s;
    }

    .back:hover {
      color: var(--ef-ink-green);
      background: var(--ef-tint-green);
      transform: translateX(-3px);
    }

    .panel {
      width: min(460px, 42vw);
      min-width: 380px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px 36px;
    }

    .panel__inner {
      width: 100%;
      animation: ef-pop-in 0.45s var(--ef-ease-spring) both;
    }

    .panel__title {
      font-family: var(--ef-font-display);
      font-size: 27px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: var(--ef-text);
      margin-bottom: 5px;
    }

    .panel__subtitle {
      font-size: 14px;
      color: var(--ef-text-subtle);
      margin-bottom: 22px;
    }

    @media (max-width: 900px) {
      .brand {
        display: none;
      }

      .panel {
        width: 100%;
        min-width: 0;
        padding: 28px 18px;
      }
    }
  `,
})
export class AuthLayoutComponent {
  readonly heading = input.required<string>();
  readonly subheading = input.required<string>();

  protected readonly features = [
    '12 modules sur trois niveaux, en chapitres et leçons',
    'Dépôt des TP en ligne et correction notée',
    'Annonces et blog pour toute la section',
    'Bibliothèque de ressources téléchargeables',
  ];
}
