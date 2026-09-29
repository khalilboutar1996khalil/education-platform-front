import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiError } from '../../core/models/api.model';
import { Level, LEVEL_OPTIONS } from '../../core/models/user.model';
import { applyServerErrors, errorMessageFor } from '../../shared/forms/form-errors';
import { ModalComponent } from '../../shared/ui/modal.component';
import { CourseSummary } from '../courses/courses.model';
import { formatSize } from '../assignments/assignments.model';
import { ResourcesApi } from './resources.api';
import { RESOURCE_ACCEPT, RESOURCE_TYPE_LABELS, Resource, ResourceType } from './resources.model';

/** Add a resource (file upload, or a link), or edit the details of `resource` — the file itself cannot be swapped. */
@Component({
  selector: 'ef-resource-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalComponent],
  template: `
    <ef-modal [heading]="resource() ? 'Modifier la ressource' : 'Ajouter une ressource'" (closed)="closed.emit()">
      <form class="ef-form" [formGroup]="form" (ngSubmit)="save()">
        <div class="ef-form-row">
          <label class="ef-f">
            <span class="ef-f__label">Type</span>
            <select class="ef-field-input" formControlName="type" (change)="file.set(null)">
              @for (t of types; track t.value) {
                <option [value]="t.value">{{ t.label }}</option>
              }
            </select>
          </label>
          <label class="ef-f">
            <span class="ef-f__label">Niveau</span>
            <select class="ef-field-input" formControlName="level" (change)="form.controls.courseId.setValue(null)">
              <option [ngValue]="null">Tous les niveaux</option>
              @for (l of levels; track l.value) {
                <option [ngValue]="l.value">{{ l.label }}</option>
              }
            </select>
          </label>
        </div>

        <label class="ef-f">
          <span class="ef-f__label">Titre</span>
          <input class="ef-field-input" formControlName="title" placeholder="ex. Cours complet — Algorithmique" />
          @if (err('title'); as e) { <span class="ef-f__err">{{ e }}</span> }
        </label>

        <label class="ef-f">
          <span class="ef-f__label">Associer au module</span>
          <select class="ef-field-input" formControlName="courseId">
            <option [ngValue]="null">Tous les modules</option>
            @for (c of moduleOptions(); track c.id) {
              <option [ngValue]="c.id">{{ c.code }} · {{ c.title }}</option>
            }
          </select>
        </label>

        @if (type() === 'LINK') {
          <label class="ef-f">
            <span class="ef-f__label">Adresse du lien</span>
            <input class="ef-field-input" formControlName="externalUrl" placeholder="https://…" />
            @if (err('externalUrl'); as e) { <span class="ef-f__err">{{ e }}</span> }
          </label>
        } @else if (!resource()) {
          <label class="drop" [class.drop--bad]="fileMissing()">
            <input type="file" hidden [accept]="accept()" (change)="pick($event)" />
            <div class="drop__icon">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.4 18.4A5 5 0 0 0 18 9h-1.3A8 8 0 1 0 3 16.3" /></svg>
            </div>
            @if (file(); as f) {
              <div class="drop__title">{{ f.name }}</div>
              <div class="drop__sub">{{ size(f.size) }} · cliquer pour changer</div>
            } @else {
              <div class="drop__title">Choisissez un fichier</div>
              <div class="drop__sub">{{ hint() }}</div>
            }
          </label>
        } @else if (resource()?.file) {
          <div class="ef-f__hint">Fichier : {{ resource()!.file!.originalFilename }} — pour le remplacer, supprimez la ressource et ajoutez-en une nouvelle.</div>
        }

        <label class="ef-f">
          <span class="ef-f__label">Description</span>
          <textarea class="ef-field-input" rows="2" formControlName="description" placeholder="Facultatif"></textarea>
        </label>

        @if (formError()) {
          <div class="ef-alert ef-alert--error">{{ formError() }}</div>
        }

        <button type="submit" class="ef-cta ef-form-submit" [disabled]="saving()">
          {{ saving() ? (resource() ? 'Enregistrement…' : 'Téléversement…') : resource() ? 'Enregistrer' : 'Téléverser' }}
        </button>
      </form>
    </ef-modal>
  `,
  styles: `
    .drop {
      display: block;
      padding: 24px;
      text-align: center;
      border-radius: 14px;
      border: 2px dashed var(--ef-border);
      background: var(--ef-surface-2);
      cursor: pointer;
      transition: border-color 0.22s, background 0.22s;
    }
    .drop:hover { border-color: var(--ef-brand-500); background: var(--ef-tint-green); }
    .drop--bad { border-color: var(--ef-ink-red); }
    .drop__icon {
      width: 44px;
      height: 44px;
      margin: 0 auto 11px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      color: var(--ef-brand-600);
      background: var(--ef-tint-green);
      animation: ef-floaty 4s ease-in-out infinite;
    }
    .drop__title { font-size: 13.5px; font-weight: 700; color: var(--ef-text); margin-bottom: 3px; word-break: break-all; }
    .drop__sub { font-size: 11.5px; color: var(--ef-text-muted); }
  `,
})
export class ResourceFormComponent implements OnInit {
  private readonly api = inject(ResourcesApi);
  private readonly fb = inject(FormBuilder);

  readonly resource = input<Resource | null>(null);
  /** Every module, all levels; the list is narrowed by the chosen level. */
  readonly courses = input<CourseSummary[]>([]);
  readonly defaultLevel = input<Level | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Resource>();

  protected readonly levels = LEVEL_OPTIONS;
  protected readonly types = (Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((value) => ({
    value,
    label: RESOURCE_TYPE_LABELS[value],
  }));

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly file = signal<File | null>(null);
  protected readonly fileMissing = signal(false);

  protected readonly form = this.fb.group({
    type: this.fb.nonNullable.control<ResourceType>('PDF'),
    level: this.fb.control<Level | null>(null),
    title: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
    courseId: this.fb.control<number | null>(null),
    externalUrl: this.fb.nonNullable.control('', Validators.maxLength(1000)),
    description: this.fb.nonNullable.control('', Validators.maxLength(1000)),
  });

  protected readonly type = toSignal(this.form.controls.type.valueChanges, { initialValue: this.form.controls.type.value });
  private readonly level = toSignal(this.form.controls.level.valueChanges, { initialValue: this.form.controls.level.value });

  protected readonly moduleOptions = computed(() => {
    const level = this.level();
    return this.courses().filter((c) => !level || c.level === level);
  });

  protected readonly accept = computed(() => {
    const t = this.type();
    return t === 'LINK' ? '' : RESOURCE_ACCEPT[t];
  });

  protected readonly hint = computed(
    () => ({ VIDEO: 'Vidéo MP4, WebM… — jusqu’à 500 Mo', PDF: 'Document PDF — jusqu’à 500 Mo', ZIP: 'Archive ZIP de codes sources — jusqu’à 500 Mo', LINK: '' })[this.type()],
  );

  ngOnInit(): void {
    const r = this.resource();
    if (r) {
      this.form.setValue({
        type: r.type,
        level: r.level,
        title: r.title,
        courseId: r.courseId,
        externalUrl: r.externalUrl ?? '',
        description: r.description ?? '',
      });
      this.form.controls.type.disable();
    } else {
      this.form.controls.level.setValue(this.defaultLevel());
    }
  }

  protected pick(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.fileMissing.set(false);
  }

  protected size(bytes: number): string {
    return formatSize(bytes);
  }

  protected err(name: 'title' | 'externalUrl'): string | null {
    return errorMessageFor(this.form.controls[name]);
  }

  protected save(): void {
    const v = this.form.getRawValue();
    if (v.type === 'LINK' && !/^https?:\/\/\S+$/i.test(v.externalUrl.trim())) {
      this.form.controls.externalUrl.setErrors({ server: 'Saisissez une adresse commençant par http:// ou https://' });
      this.form.controls.externalUrl.markAsTouched();
    }
    const existing = this.resource();
    if (!existing && v.type !== 'LINK' && !this.file()) {
      this.fileMissing.set(true);
    }
    if (this.form.invalid || this.fileMissing()) {
      this.form.markAllAsTouched();
      return;
    }
    const body = {
      title: v.title,
      description: v.description.trim() || null,
      type: v.type,
      courseId: v.courseId,
      level: v.level,
      externalUrl: v.type === 'LINK' ? v.externalUrl.trim() : null,
    };
    this.saving.set(true);
    this.formError.set(null);
    (existing ? this.api.update(existing.id, body) : this.api.create(body, this.file())).subscribe({
      next: (r) => {
        this.saving.set(false);
        this.saved.emit(r);
      },
      error: (e: ApiError) => {
        this.saving.set(false);
        const rest = applyServerErrors(this.form, e.fieldErrors);
        this.formError.set(rest[0] ?? (Object.keys(e.fieldErrors).length ? null : e.detail));
      },
    });
  }
}
