import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SpinnerComponent } from './spinner.component';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

@Component({
  selector: 'button[efButton]',
  standalone: true,
  imports: [SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <ef-spinner [size]="15" />
    }
    <ng-content />
  `,
  host: {
    '[class.ef-btn--primary]': "variant() === 'primary'",
    '[class.ef-btn--secondary]': "variant() === 'secondary'",
    '[class.ef-btn--ghost]': "variant() === 'ghost'",
    '[class.ef-btn--block]': 'block()',
    '[disabled]': 'disabled() || loading()',
  },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      height: 46px;
      padding: 0 20px;
      border-radius: var(--ef-radius-md);
      font-size: 14px;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition:
        transform var(--ef-motion-base) var(--ef-ease-out),
        box-shadow var(--ef-motion-base),
        background var(--ef-motion-base);
    }

    :host(.ef-btn--block) {
      width: 100%;
    }

    :host(:disabled) {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none !important;
    }

    :host(.ef-btn--primary) {
      background: var(--ef-gradient-brand);
      color: var(--ef-text-on-brand);
      box-shadow: var(--ef-shadow-brand);
    }

    :host(.ef-btn--primary:hover:not(:disabled)) {
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(22, 163, 74, 0.42);
    }

    :host(.ef-btn--secondary) {
      background: var(--ef-surface);
      color: var(--ef-text);
      border: 2px solid var(--ef-border);
    }

    :host(.ef-btn--secondary:hover:not(:disabled)) {
      border-color: var(--ef-brand-600);
      background: var(--ef-surface-2);
    }

    :host(.ef-btn--ghost) {
      background: transparent;
      color: var(--ef-ink-green);
      padding: 0 10px;
    }

    :host(.ef-btn--ghost:hover:not(:disabled)) {
      background: var(--ef-tint-green);
    }
  `,
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly loading = input(false);
  readonly disabled = input(false);
  readonly block = input(false);
}
