import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PlaceholderPageComponent } from '../placeholder/placeholder-page.component';
import { AssignmentListComponent } from './assignment-list.component';

/** The admin manages TP & devoirs here; the student view (handing work in) comes with the student screens. */
@Component({
  selector: 'ef-assignments-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AssignmentListComponent, PlaceholderPageComponent],
  template: `
    @if (auth.isAdmin()) {
      <ef-assignment-list />
    } @else {
      <ef-placeholder-page heading="TP &amp; devoirs" blurb="Déposez vos TP et devoirs en ligne et suivez leur correction." />
    }
  `,
})
export class AssignmentsPageComponent {
  protected readonly auth = inject(AuthService);
}
