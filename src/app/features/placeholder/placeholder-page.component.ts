import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Stands in for a section that is routed but not built yet, shown to users as "coming soon". */
@Component({
  selector: 'ef-placeholder-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <div class="icon" aria-hidden="true">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
      </div>
      <div class="badge">Bientôt disponible</div>
      <h2 class="title">{{ heading() }}</h2>
      <p class="blurb">{{ blurb() }}</p>
      <p class="note">Cette section est en cours de préparation. Revenez très bientôt !</p>
    </div>
  `,
  styles: `
    .wrap {
      max-width: 520px;
      margin: 56px auto;
      padding: 44px 32px;
      text-align: center;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      border-radius: var(--ef-radius-lg);
      box-shadow: 0 18px 40px rgba(6, 60, 30, 0.06);
      animation: ef-fade-up 0.4s ease backwards;
    }

    .icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 20px;
      color: var(--ef-ink-green);
      background: var(--ef-surface-2);
    }

    .badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ef-ink-green);
      background: var(--ef-surface-2);
      padding: 5px 11px;
      border-radius: var(--ef-radius-pill);
      margin-bottom: 14px;
    }

    .title {
      font-family: var(--ef-font-display);
      font-size: 20px;
      font-weight: 800;
      color: var(--ef-text);
      margin-bottom: 8px;
    }

    .blurb {
      font-size: 13.5px;
      line-height: 1.7;
      color: var(--ef-text-muted);
    }

    .note {
      margin-top: 16px;
      font-size: 12.5px;
      color: var(--ef-text-subtle);
    }
  `,
})
export class PlaceholderPageComponent {
  /** Bound from route data by withComponentInputBinding(). */
  readonly heading = input('Bientôt');
  readonly blurb = input('Cet écran arrive dans une prochaine étape.');
}
