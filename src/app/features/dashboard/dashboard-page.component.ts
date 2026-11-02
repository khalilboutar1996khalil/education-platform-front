import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { StudentDashboardComponent } from './student-dashboard.component';

/** One route, two dashboards: the admin's section-wide view, and the student's own. */
@Component({
  selector: 'ef-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminDashboardComponent, StudentDashboardComponent],
  template: `
    @if (auth.isAdmin()) {
      <ef-admin-dashboard />
    } @else {
      <ef-student-dashboard />
    }
  `,
})
export class DashboardPageComponent {
  protected readonly auth = inject(AuthService);
}
