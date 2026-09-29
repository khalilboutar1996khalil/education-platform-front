import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'ef-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="host" aria-live="polite">
      @for (toast of toasts.toasts(); track toast.id) {
        <button type="button" class="toast" [class]="'toast--' + toast.kind" (click)="toasts.dismiss(toast.id)">
          <span class="toast__dot"></span>
          <span class="toast__text">{{ toast.message }}</span>
        </button>
      }
    </div>
  `,
  styles: `
    .host {
      position: fixed;
      bottom: 22px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      z-index: 2000;
      pointer-events: none;
      width: min(440px, calc(100vw - 32px));
    }

    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 11px;
      width: 100%;
      text-align: left;
      padding: 13px 18px;
      border-radius: var(--ef-radius-md);
      background: var(--ef-brand-950);
      color: #fff;
      box-shadow: var(--ef-shadow-lg);
      font-size: 13.5px;
      font-weight: 600;
      animation: ef-fade-up 0.3s var(--ef-ease-spring) backwards;
    }

    .toast__dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
      background: var(--ef-brand-500);
    }

    .toast--error .toast__dot {
      background: #f87171;
    }

    .toast--info .toast__dot {
      background: #5eead4;
    }

    .toast__text {
      flex: 1;
    }
  `,
})
export class ToastHostComponent {
  readonly toasts = inject(ToastService);
}
