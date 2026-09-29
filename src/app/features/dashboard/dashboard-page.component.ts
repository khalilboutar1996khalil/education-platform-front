import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PlaceholderPageComponent } from '../placeholder/placeholder-page.component';
import { AdminDashboardComponent } from './admin-dashboard.component';

/** One route, two dashboards: the admin's is built, the student's is still to come. */
@Component({
  selector: 'ef-dashboard-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminDashboardComponent, PlaceholderPageComponent],
  template: `
    @if (auth.isAdmin()) {
      <ef-admin-dashboard />
    } @else {
      <ef-placeholder-page
        heading="Tableau de bord"
        blurb="Votre progression, vos notes et vos prochaines échéances, réunies au même endroit."
      />
    }
  `,
})
export class DashboardPageComponent {
  protected readonly auth = inject(AuthService);
}
