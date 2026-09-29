import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiError } from '../../core/models/api.model';
import { LEVEL_LABELS, Level } from '../../core/models/user.model';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { CourseSummary } from '../courses/courses.model';
import { AnnouncementsApi } from './announcements.api';
import { Announcement, AnnouncementRequest } from './announcements.model';

/** "level" = this level only, "all" = every level, otherwise a module id. */
type Scope = 'level' | 'all' | number;

export interface SaveResult {
  announcement: Announcement;
  published: boolean;
  /** Set when the draft was saved but publishing it failed. */
  publishError?: string;
}

@Component({
  selector: 'ef-announcement-composer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form class="box" [class.box--edit]="draft()" [formGroup]="form" (ngSubmit)="submit(true)">
      <div class="box__head">
        <div class="box__title">{{ draft() ? 'Modifier le brouillon' : 'Rédiger' }}</div>
        @if (draft()) {
          <button type="button" class="link" (click)="cancel.emit()">Annuler</button>
        }
      </div>
      <input class="in" formControlName="title" maxlength="255" placeholder="Titre…" />
      @if (err('title'); as e) { <span class="ef-f__err">{{ e }}</span> }
      <textarea class="in" formControlName="body" rows="3" maxlength="5000" placeholder="Que doivent savoir vos élèves ?"></textarea>
      @if (err('body'); as e) { <span class="ef-f__err">{{ e }}</span> }

      @if (formError()) {
        <div class="ef-alert ef-alert--error">{{ formError() }}</div>
      }

      <div class="bar">
        <div class="bar__left">
          <select class="ef-select" formControlName="scope" aria-label="Destinataires">
            <option [ngValue]="'level'">Tout le niveau · {{ levelShort() }}</option>
            @for (c of courses(); track c.id) {
              <option [ngValue]="c.id">{{ c.code }} · {{ c.title }}</option>
            }
            <option [ngValue]="'all'">Toute la section (tous niveaux)</option>
          </select>
          <label class="ef-check pin">
            <input type="checkbox" formControlName="pinned" />
            Épingler en haut
          </label>
        </div>
        <div class="bar__right">
          <button type="button" class="ef-outline" [disabled]="saving()" (click)="submit(false)">
            {{ draft() ? 'Enregistrer' : 'Brouillon' }}
          </button>
          <button type="submit" class="ef-cta" [disabled]="saving()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            {{ saving() ? 'Envoi…' : 'Publier' }}
          </button>
        </div>
      </div>
      <div class="note">Une annonce publiée notifie les élèves concernés et ne peut plus être modifiée.</div>
    </form>
  `,
  styles: `
    .box { display: flex; flex-direction: column; gap: 10px; padding: 20px; margin-bottom: 18px; border-radius: 16px; background: var(--ef-surface); border: 1px solid var(--ef-border); transition: border-color 0.2s; }
    .box--edit { border-color: var(--ef-brand-500); }
    .box__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .box__title { font-size: 14px; font-weight: 700; color: var(--ef-text); }
    .link { font-size: 12px; font-weight: 700; color: var(--ef-text-muted); }
    .link:hover { color: var(--ef-ink-red); }
    .in { width: 100%; padding: 12px 15px; border-radius: 11px; font-size: 14px; line-height: 1.6; color: var(--ef-text); background: var(--ef-surface-2); border: 1px solid var(--ef-border); transition: border-color 0.2s; resize: vertical; }
    .in:focus { border-color: var(--ef-brand-500); outline: none; }
    .bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 2px; }
    .bar__left, .bar__right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .bar__left .ef-select { max-width: 280px; }
    .pin { font-size: 12.5px; }
    .note { font-size: 11.5px; color: var(--ef-text-subtle); }
  `,
})
export class AnnouncementComposerComponent {
  private readonly api = inject(AnnouncementsApi);
  private readonly fb = inject(FormBuilder);

  readonly level = input.required<Level>();
  /** This level's modules. */
  readonly courses = input<CourseSummary[]>([]);
  /** The draft being edited; null to write a new one. */
  readonly draft = input<Announcement | null>(null);
  readonly cancel = output<void>();
  readonly saved = output<SaveResult>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly levelShort = computed(() => LEVEL_LABELS[this.level()].replace(' informatique', ''));

  protected readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    body: ['', [Validators.required, Validators.maxLength(5000)]],
    scope: this.fb.nonNullable.control<Scope>('level'),
    pinned: false,
  });

  constructor() {
    effect(() => {
      const d = this.draft();
      untracked(() => {
        this.formError.set(null);
        if (d) {
          this.form.reset({
            title: d.title,
            body: d.body,
            scope: d.courseId ?? (d.level ? 'level' : 'all'),
            pinned: d.pinned,
          });
        } else {
          this.form.reset();
        }
      });
    });
    // A module from another level cannot stay selected once the admin switches level.
    effect(() => {
      const ids = new Set(this.courses().map((c) => c.id));
      untracked(() => {
        const scope = this.form.controls.scope.value;
        if (typeof scope === 'number' && !ids.has(scope)) {
          this.form.controls.scope.setValue('level');
        }
      });
    });
  }

  protected err(name: 'title' | 'body'): string | null {
    return errorMessageFor(this.form.controls[name]);
  }

  protected submit(publish: boolean): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: AnnouncementRequest = {
      title: v.title.trim(),
      body: v.body.trim(),
      courseId: typeof v.scope === 'number' ? v.scope : null,
      level: v.scope === 'all' ? null : this.level(),
      pinned: v.pinned,
    };
    const existing = this.draft();
    const write: Observable<Announcement> = existing ? this.api.update(existing.id, body) : this.api.create(body);
    this.saving.set(true);
    this.formError.set(null);
    write.subscribe({
      next: (draft) => {
        if (!publish) {
          this.done({ announcement: draft, published: false });
          return;
        }
        // Once the draft exists, a failed publish must not leave the form ready to create it a second time.
        this.api.publish(draft.id).subscribe({
          next: (a) => this.done({ announcement: a, published: true }),
          error: (e: ApiError) => this.done({ announcement: draft, published: false, publishError: e.detail }),
        });
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }

  private done(result: SaveResult): void {
    this.saving.set(false);
    this.form.reset();
    this.saved.emit(result);
  }
}
