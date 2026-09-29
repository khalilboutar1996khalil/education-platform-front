import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError } from '../../core/models/api.model';
import { ModalComponent } from '../../shared/ui/modal.component';
import { QuizzesApi } from './quizzes.api';
import { QUESTION_TYPE_LABELS, Question, QuestionType, QuizDetail } from './quizzes.model';

interface ChoiceDraft {
  text: string;
  correct: boolean;
}

/**
 * Add a question to a draft quiz, or edit `question`. The rules mirror the backend:
 * open → no choices; true/false → exactly 2; single → ≥2 with one correct; multiple → ≥2 with ≥1 correct.
 */
@Component({
  selector: 'ef-question-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent],
  template: `
    <ef-modal [heading]="question() ? 'Modifier la question' : 'Nouvelle question'" (closed)="closed.emit()">
      <form class="ef-form" (ngSubmit)="save()">
        <label class="ef-f">
          <span class="ef-f__label">Énoncé</span>
          <textarea class="ef-field-input" rows="3" name="text" [(ngModel)]="text" placeholder="ex. Quelle est la complexité du tri fusion ?"></textarea>
        </label>

        <div class="ef-form-row">
          <label class="ef-f">
            <span class="ef-f__label">Type</span>
            <select class="ef-field-input" name="type" [ngModel]="type()" (ngModelChange)="changeType($event)">
              @for (t of types; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </label>
          <label class="ef-f">
            <span class="ef-f__label">Points</span>
            <input class="ef-field-input" type="number" min="0" step="0.5" name="points" [(ngModel)]="points" />
          </label>
        </div>

        @if (type() !== 'OPEN') {
          <div class="ef-f">
            <span class="ef-f__label">
              Réponses · {{ type() === 'MULTIPLE_CHOICE' ? 'cochez toutes les bonnes' : 'cochez la bonne' }}
            </span>
            <div class="choices">
              @for (c of choices(); track $index; let i = $index) {
                <div class="choice" [class.choice--ok]="c.correct">
                  <button type="button" class="choice__mark" [title]="c.correct ? 'Bonne réponse' : 'Marquer comme bonne réponse'" (click)="mark(i)">
                    @if (c.correct) {
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                    }
                  </button>
                  <input
                    class="choice__input"
                    [name]="'choice' + i"
                    [ngModel]="c.text"
                    (ngModelChange)="setText(i, $event)"
                    [readonly]="type() === 'TRUE_FALSE'"
                    placeholder="Réponse {{ i + 1 }}"
                  />
                  @if (type() !== 'TRUE_FALSE' && choices().length > 2) {
                    <button type="button" class="choice__del" title="Retirer" (click)="remove(i)">×</button>
                  }
                </div>
              }
            </div>
            @if (type() !== 'TRUE_FALSE') {
              <button type="button" class="add" (click)="add()">+ Ajouter une réponse</button>
            }
          </div>
        } @else {
          <div class="ef-f__hint">Réponse rédigée par l'élève, notée à la main dans Corrections.</div>
        }

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }

        <button type="submit" class="ef-cta ef-form-submit" [disabled]="saving()">
          {{ saving() ? 'Enregistrement…' : question() ? 'Enregistrer' : 'Ajouter la question' }}
        </button>
      </form>
    </ef-modal>
  `,
  styles: `
    .choices { display: grid; gap: 8px; }
    .choice {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 8px 6px 10px;
      border-radius: 11px;
      border: 1px solid var(--ef-border);
      background: var(--ef-surface-2);
      transition: border-color 0.2s, background 0.2s;
    }
    .choice--ok { border-color: var(--ef-brand-500); background: var(--ef-tint-green); }
    .choice__mark {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 2px solid var(--ef-border);
      background: var(--ef-surface);
    }
    .choice--ok .choice__mark { background: var(--ef-brand-500); border-color: var(--ef-brand-500); }
    .choice__input { flex: 1; min-width: 0; background: transparent; font-size: 13.5px; color: var(--ef-text); padding: 6px 0; }
    .choice__del { width: 24px; height: 24px; border-radius: 7px; font-size: 17px; line-height: 1; color: var(--ef-text-muted); }
    .choice__del:hover { color: var(--ef-ink-red); background: var(--ef-tint-red); }
    .add { align-self: flex-start; font-size: 12px; font-weight: 700; color: var(--ef-ink-green); margin-top: 2px; }
    .add:hover { text-decoration: underline; }
  `,
})
export class QuestionFormComponent implements OnInit {
  private readonly api = inject(QuizzesApi);

  readonly quiz = input.required<QuizDetail>();
  readonly question = input<Question | null>(null);
  readonly closed = output<void>();
  readonly saved = output<QuizDetail>();

  protected readonly types = (Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((value) => ({
    value,
    label: QUESTION_TYPE_LABELS[value],
  }));

  protected text = '';
  protected points = 1;
  protected readonly type = signal<QuestionType>('SINGLE_CHOICE');
  protected readonly choices = signal<ChoiceDraft[]>([
    { text: '', correct: true },
    { text: '', correct: false },
  ]);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly correctCount = computed(() => this.choices().filter((c) => c.correct).length);

  ngOnInit(): void {
    const q = this.question();
    if (q) {
      this.text = q.text;
      this.points = Number(q.points);
      this.type.set(q.type);
      this.choices.set(q.choices.map((c) => ({ text: c.text, correct: c.correct })));
    }
  }

  protected changeType(type: QuestionType): void {
    this.type.set(type);
    if (type === 'TRUE_FALSE') {
      this.choices.set([
        { text: 'Vrai', correct: true },
        { text: 'Faux', correct: false },
      ]);
    } else if (type === 'OPEN') {
      this.choices.set([]);
    } else {
      let list = this.choices().filter((c) => c.text !== 'Vrai' && c.text !== 'Faux');
      while (list.length < 2) {
        list = [...list, { text: '', correct: false }];
      }
      if (type === 'SINGLE_CHOICE' && list.filter((c) => c.correct).length !== 1) {
        list = list.map((c, i) => ({ ...c, correct: i === 0 }));
      }
      this.choices.set(list);
    }
  }

  protected mark(index: number): void {
    const multiple = this.type() === 'MULTIPLE_CHOICE';
    this.choices.update((list) =>
      list.map((c, i) => (multiple ? (i === index ? { ...c, correct: !c.correct } : c) : { ...c, correct: i === index })),
    );
  }

  protected setText(index: number, text: string): void {
    this.choices.update((list) => list.map((c, i) => (i === index ? { ...c, text } : c)));
  }

  protected add(): void {
    this.choices.update((list) => [...list, { text: '', correct: false }]);
  }

  protected remove(index: number): void {
    this.choices.update((list) => list.filter((_, i) => i !== index));
  }

  protected save(): void {
    const problem = this.check();
    if (problem) {
      this.formError.set(problem);
      return;
    }
    const body = {
      text: this.text.trim(),
      type: this.type(),
      points: this.points,
      choices: this.type() === 'OPEN' ? [] : this.choices().map((c) => ({ text: c.text.trim(), correct: c.correct })),
      position: this.question()?.position ?? null,
    };
    const existing = this.question();
    this.saving.set(true);
    this.formError.set(null);
    (existing ? this.api.updateQuestion(existing.id, body) : this.api.addQuestion(this.quiz().id, body)).subscribe({
      next: (quiz) => {
        this.saving.set(false);
        this.saved.emit(quiz);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        this.formError.set(Object.values(e.fieldErrors)[0] ?? e.detail);
      },
    });
  }

  private check(): string | null {
    if (!this.text.trim()) {
      return "L'énoncé est obligatoire.";
    }
    if (this.points == null || this.points < 0) {
      return 'Les points doivent être positifs.';
    }
    if (this.type() === 'OPEN') {
      return null;
    }
    if (this.choices().some((c) => !c.text.trim())) {
      return 'Chaque réponse doit avoir un texte.';
    }
    if (this.choices().length < 2) {
      return 'Il faut au moins deux réponses.';
    }
    if (this.type() === 'MULTIPLE_CHOICE' ? this.correctCount() < 1 : this.correctCount() !== 1) {
      return this.type() === 'MULTIPLE_CHOICE' ? 'Cochez au moins une bonne réponse.' : 'Cochez exactement une bonne réponse.';
    }
    return null;
  }
}
