import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PlaceholderPageComponent } from '../placeholder/placeholder-page.component';
import { QuizListComponent } from './quiz-list.component';

/** The admin manages quizzes here; the student view (passing quizzes) comes with the student screens. */
@Component({
  selector: 'ef-quizzes-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [QuizListComponent, PlaceholderPageComponent],
  template: `
    @if (auth.isAdmin()) {
      <ef-quiz-list />
    } @else {
      <ef-placeholder-page heading="Quiz" blurb="Passez les quiz de vos modules et revoyez vos réponses." />
    }
  `,
})
export class QuizzesPageComponent {
  protected readonly auth = inject(AuthService);
}
