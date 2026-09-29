import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AccessRequestsComponent } from './access-requests.component';
import { StudentListComponent } from './student-list.component';
import { StudentsApi } from './students.api';

@Component({
  selector: 'ef-students-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StudentListComponent, AccessRequestsComponent],
  template: `
    <div class="ef-page">
      <div class="ef-page-head">
        <div>
          <div class="ef-page-title">Élèves</div>
          <div class="ef-page-sub">Comptes, statuts et demandes d'accès</div>
        </div>
      </div>

      <div class="tabs" role="tablist">
        <button type="button" role="tab" class="tab" [class.tab--on]="tab() === 'students'" [attr.aria-selected]="tab() === 'students'" (click)="tab.set('students')">
          Élèves
        </button>
        <button type="button" role="tab" class="tab" [class.tab--on]="tab() === 'requests'" [attr.aria-selected]="tab() === 'requests'" (click)="tab.set('requests')">
          Demandes d'accès
          @if (pending() > 0) {
            <span class="badge">{{ pending() }}</span>
          }
        </button>
      </div>

      @if (tab() === 'students') {
        <ef-student-list (changed)="countPending()" />
      } @else {
        <ef-access-requests (changed)="countPending()" />
      }
    </div>
  `,
  styles: `
    .tabs { display: flex; gap: 6px; margin-bottom: 14px; }
    .tab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 11px;
      font-size: 13px;
      font-weight: 700;
      color: var(--ef-text-muted);
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      transition: color 0.2s, background 0.2s, border-color 0.2s;
    }
    .tab:hover { color: var(--ef-ink-green); }
    .tab--on { color: var(--ef-ink-green); background: var(--ef-tint-green); border-color: var(--ef-brand-500); }
    .badge { min-width: 20px; padding: 2px 6px; border-radius: 10px; text-align: center; font-size: 10.5px; font-weight: 800; color: #fff; background: var(--ef-ink-red); }
  `,
})
export class StudentsPageComponent {
  private readonly api = inject(StudentsApi);

  protected readonly tab = signal<'students' | 'requests'>('students');
  protected readonly pending = signal(0);

  constructor() {
    this.countPending();
  }

  protected countPending(): void {
    this.api.accessRequests('PENDING', 0, 1).subscribe({
      next: (p) => this.pending.set(p.totalElements),
    });
  }
}
