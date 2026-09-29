import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ef-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    role: 'status',
    'aria-label': 'Chargement',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
  },
  styles: `
    :host {
      display: inline-block;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      opacity: 0.85;
      animation: ef-spin 0.6s linear infinite;
    }
  `,
})
export class SpinnerComponent {
  readonly size = input(16);
}
