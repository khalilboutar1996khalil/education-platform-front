import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ModalComponent } from '../../shared/ui/modal.component';

/** Shows a new account's one-time password; the backend never returns it again. */
@Component({
  selector: 'ef-credentials-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent],
  template: `
    <ef-modal [heading]="heading()" (closed)="closed.emit()">
      <div class="body">
        <div class="who">
          <div class="who__name">{{ name() }}</div>
          <div class="who__mail">{{ email() }}</div>
        </div>
        <div class="label">Mot de passe temporaire</div>
        <div class="pwd">
          <code>{{ password() }}</code>
          <button type="button" (click)="copy()">{{ copied() ? 'Copié ✓' : 'Copier' }}</button>
        </div>
        <div class="note">
          Ce mot de passe ne sera plus affiché. Transmettez-le à l'élève, qui pourra ensuite le changer dans ses paramètres.
        </div>
        <button type="button" class="ef-cta done" (click)="closed.emit()">J'ai transmis le mot de passe</button>
      </div>
    </ef-modal>
  `,
  styles: `
    .body { display: flex; flex-direction: column; gap: 10px; }
    .who__name { font-size: 14px; font-weight: 700; color: var(--ef-text); }
    .who__mail { font-size: 12px; color: var(--ef-text-muted); }
    .label { margin-top: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ef-text-muted); }
    .pwd { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; background: var(--ef-tint-green); border: 1px dashed var(--ef-brand-500); }
    code { flex: 1; font-family: var(--ef-font-display); font-size: 16px; font-weight: 700; letter-spacing: 0.04em; color: var(--ef-ink-green); word-break: break-all; user-select: all; }
    .pwd button { padding: 7px 12px; border-radius: 9px; font-size: 12px; font-weight: 700; color: var(--ef-ink-green); background: var(--ef-surface); border: 1px solid var(--ef-border); }
    .note { font-size: 12px; line-height: 1.55; color: var(--ef-text-muted); }
    .done { justify-content: center; margin-top: 6px; }
  `,
})
export class CredentialsDialogComponent {
  readonly heading = input('Compte créé');
  readonly name = input.required<string>();
  readonly email = input.required<string>();
  readonly password = input.required<string>();
  readonly closed = output<void>();

  protected readonly copied = signal(false);

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.password());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard can be blocked; the password stays selectable on screen.
    }
  }
}
