import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PlaceholderPageComponent } from '../placeholder/placeholder-page.component';
import { GradebookComponent } from './gradebook.component';

@Component({
  selector: 'ef-grades-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GradebookComponent, PlaceholderPageComponent],
  template: `
    @if (auth.isAdmin()) {
      <ef-gradebook />
    } @else {
      <ef-placeholder-page heading="Mes notes" blurb="Votre moyenne dans chaque module et le détail de vos notes." />
    }
  `,
})
export class GradesPageComponent {
  protected readonly auth = inject(AuthService);
}
