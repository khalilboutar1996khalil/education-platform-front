import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Centered dialog: blurred scrim, tinted header that stays put, scrolling body. */
@Component({
  selector: 'ef-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="scrim" (click)="closed.emit()">
      <div class="card" [class.card--wide]="wide()" role="dialog" aria-modal="true" [attr.aria-label]="heading()" (click)="$event.stopPropagation()">
        <div class="head">
          <div class="badge" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
          </div>
          <div class="head__text">
            <div class="title">{{ heading() }}</div>
            @if (subtitle()) {
              <div class="subtitle">{{ subtitle() }}</div>
            }
          </div>
          <button type="button" class="close" title="Fermer" aria-label="Fermer" (click)="closed.emit()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div class="body">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: `
    .scrim {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 22px;
      background: radial-gradient(circle at 50% 30%, rgba(6, 60, 30, 0.45), rgba(3, 24, 12, 0.7));
      backdrop-filter: blur(6px);
      animation: ef-fade-in 0.2s ease both;
    }

    .card {
      width: 100%;
      max-width: 640px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 22px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      box-shadow: 0 40px 90px rgba(3, 24, 12, 0.4), 0 0 0 6px rgba(34, 197, 94, 0.08);
      animation: ef-pop-in 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.25) both;
    }

    .card--wide { max-width: 920px; }

    .head {
      position: relative;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 20px 22px 18px;
      background: linear-gradient(135deg, var(--ef-tint-green), transparent 70%);
      border-bottom: 1px solid var(--ef-border);
    }

    .head::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: var(--ef-gradient-brand);
    }

    .badge {
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      color: #fff;
      background: var(--ef-gradient-brand);
      box-shadow: 0 8px 18px rgba(22, 163, 74, 0.3);
    }

    .head__text { flex: 1; min-width: 0; }

    .title {
      font-family: var(--ef-font-display);
      font-size: 17.5px;
      font-weight: 800;
      letter-spacing: -0.4px;
      color: var(--ef-text);
    }

    .subtitle {
      margin-top: 2px;
      font-size: 12.5px;
      color: var(--ef-text-muted);
    }

    .body {
      overflow-y: auto;
      padding: 22px;
    }

    .close {
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      color: var(--ef-text-muted);
      transition: background 0.2s, color 0.2s, transform 0.25s, border-color 0.2s;
    }

    .close:hover {
      background: var(--ef-tint-red);
      border-color: transparent;
      color: var(--ef-ink-red);
      transform: rotate(90deg);
    }

    @media (max-width: 560px) {
      .scrim { align-items: flex-end; padding: 0; }
      .card { max-width: none; max-height: 92vh; border-radius: 22px 22px 0 0; }
    }
  `,
})
export class ModalComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly wide = input(false);
  readonly closed = output<void>();
}
