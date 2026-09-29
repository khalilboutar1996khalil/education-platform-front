import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ef-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="field">
      <span class="field__label">{{ label() }}</span>
      <ng-content />
      @if (error()) {
        <span class="field__error" role="alert">{{ error() }}</span>
      } @else if (hint()) {
        <span class="field__hint">{{ hint() }}</span>
      }
    </label>
  `,
  styles: `
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field__label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ef-text);
    }

    .field__error {
      font-size: 12px;
      font-weight: 600;
      color: var(--ef-ink-red);
    }

    .field__hint {
      font-size: 12px;
      color: var(--ef-text-subtle);
    }
  `,
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
}
