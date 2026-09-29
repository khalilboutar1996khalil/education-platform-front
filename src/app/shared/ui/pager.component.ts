import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'ef-pager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <div class="pager">
        <button type="button" [disabled]="page() === 0" (click)="go.emit(page() - 1)">← Précédent</button>
        <span>Page {{ page() + 1 }} sur {{ totalPages() }}</span>
        <button type="button" [disabled]="page() >= totalPages() - 1" (click)="go.emit(page() + 1)">Suivant →</button>
      </div>
    }
  `,
  styles: `
    .pager { display: flex; justify-content: center; align-items: center; gap: 14px; margin-top: 16px; font-size: 12px; color: var(--ef-text-muted); }
    button { padding: 7px 13px; border-radius: 9px; font-size: 12px; font-weight: 700; color: var(--ef-text-muted); background: var(--ef-surface); border: 1px solid var(--ef-border); }
    button:hover:not(:disabled) { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    button:disabled { opacity: 0.45; cursor: default; }
  `,
})
export class PagerComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly go = output<number>();
}
