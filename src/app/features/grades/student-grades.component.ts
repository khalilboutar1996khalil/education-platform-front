import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { ApiError } from '../../core/models/api.model';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/ui/modal.component';
import { GradesApi } from './grades.api';
import { GRADE_KIND_LABELS, Grade, GradebookRow, bandOf, formatMark } from './grades.model';

@Component({
  selector: 'ef-student-grades',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ModalComponent],
  template: `
    <ef-modal [heading]="row().student.fullName" (closed)="closed.emit()">
      <div class="sum">
        <span>{{ courseLabel() }}</span>
        @if (row().average !== null) {
          <span class="avg" [class]="'avg avg--' + band(row().average!)">{{ mark(row().average!) }} / 20</span>
        }
      </div>
      @if (!row().grades.length) {
        <div class="none">Aucune note dans ce module pour l'instant.</div>
      } @else {
        <div class="list">
          @for (g of row().grades; track g.id) {
            <div class="g">
              <div class="g__main">
                <div class="g__label">{{ g.label }}</div>
                <div class="g__meta">
                  {{ kind(g) }} · {{ mark(g.score) }} / {{ mark(g.maxScore) }}
                  @if (g.weight !== 1) { · coef. {{ mark(g.weight) }} }
                  · {{ g.recordedAt | date: 'd MMM y' }}
                </div>
              </div>
              <span class="g__mark" [class]="'g__mark g__mark--' + band(g.outOfTwenty)">{{ mark(g.outOfTwenty) }}</span>
              @if (g.kind === 'MANUAL') {
                <button type="button" class="del" title="Supprimer cette note" [disabled]="busy() === g.id" (click)="remove(g)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
                </button>
              } @else {
                <span class="del del--off" title="Note automatique : elle change avec le quiz ou le travail corrigé"></span>
              }
            </div>
          }
        </div>
        <div class="foot">Les notes de quiz et de TP suivent la correction ; seules les notes saisies se suppriment ici.</div>
      }
    </ef-modal>
  `,
  styles: `
    .sum { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: -8px 0 14px; font-size: 12.5px; color: var(--ef-text-muted); }
    .avg { font-size: 13px; font-weight: 800; padding: 4px 11px; border-radius: 8px; }
    .avg--good, .g__mark--good { color: var(--ef-ink-green); background: var(--ef-tint-green); }
    .avg--mid, .g__mark--mid { color: var(--ef-ink-amber); background: var(--ef-tint-amber); }
    .avg--low, .g__mark--low { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    .none { font-size: 13px; color: var(--ef-text-muted); padding: 12px 0; }
    .list { display: flex; flex-direction: column; gap: 6px; }
    .g { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 11px; background: var(--ef-surface-2); }
    .g__main { flex: 1; min-width: 0; }
    .g__label { font-size: 13px; font-weight: 700; color: var(--ef-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .g__meta { font-size: 11px; color: var(--ef-text-muted); margin-top: 1px; }
    .g__mark { min-width: 44px; text-align: center; font-size: 12.5px; font-weight: 800; padding: 3px 8px; border-radius: 7px; }
    .del { width: 28px; height: 28px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: var(--ef-text-muted); }
    .del:hover:not(:disabled):not(.del--off) { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    .foot { margin-top: 12px; font-size: 11.5px; line-height: 1.5; color: var(--ef-text-subtle); }
  `,
})
export class StudentGradesComponent {
  private readonly api = inject(GradesApi);
  private readonly toast = inject(ToastService);

  readonly row = input.required<GradebookRow>();
  readonly courseLabel = input('');
  readonly closed = output<void>();
  readonly changed = output<void>();

  protected readonly busy = signal<number | null>(null);

  protected mark(v: number): string {
    return formatMark(v);
  }

  protected band(v: number) {
    return bandOf(v);
  }

  protected kind(g: Grade): string {
    return GRADE_KIND_LABELS[g.kind];
  }

  protected remove(g: Grade): void {
    if (!confirm(`Supprimer la note « ${g.label} » de ${this.row().student.fullName} ?`)) {
      return;
    }
    this.busy.set(g.id);
    this.api.deleteManual(g.id).subscribe({
      next: () => {
        this.busy.set(null);
        this.toast.success('Note supprimée');
        this.changed.emit();
      },
      error: (e: ApiError) => {
        this.busy.set(null);
        this.toast.error(e.detail);
      },
    });
  }
}
