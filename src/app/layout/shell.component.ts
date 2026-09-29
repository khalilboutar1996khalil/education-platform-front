import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../core/auth/auth.service';
import { HeaderComponent } from './header.component';
import { PAGE_TITLES } from './nav.config';
import { SidebarComponent } from './sidebar.component';

@Component({
  selector: 'ef-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, HeaderComponent],
  template: `
    <div class="shell" [class.shell--drawer-open]="!collapsed()">
      <ef-sidebar class="shell__side" [collapsed]="collapsed()" (navigated)="closeOnMobile()" />

      <!-- Tapping the dimmed area closes the drawer on a phone. -->
      <button type="button" class="shell__scrim" aria-label="Fermer le menu" (click)="collapsed.set(true)"></button>

      <div class="shell__main">
        <ef-header [title]="title()" (toggleSidebar)="toggle()" />
        <main class="shell__content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: `
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--ef-bg);
      color: var(--ef-text);
    }

    .shell__side {
      flex-shrink: 0;
      z-index: 60;
    }

    .shell__main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .shell__content {
      flex: 1;
      overflow-y: auto;
      padding: 20px 22px 40px;
    }

    .shell__scrim {
      display: none;
    }

    /* Below this width the sidebar becomes an overlay drawer instead of a column. */
    @media (max-width: 860px) {
      .shell__side {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
      }

      .shell--drawer-open .shell__scrim {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 50;
        background: rgba(3, 24, 12, 0.5);
        animation: ef-fade-in 0.2s ease both;
      }

      .shell__content {
        padding: 16px 16px 32px;
      }
    }
  `,
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  /** Starts closed on a phone, open on a desktop. */
  protected readonly collapsed = signal(typeof window !== 'undefined' && window.innerWidth <= 860);

  private readonly section = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
      map((url) => url.split('?')[0].split('/').filter(Boolean)[1] ?? 'dashboard'),
    ),
    { initialValue: 'dashboard' },
  );

  protected readonly title = computed(() => {
    const titles = PAGE_TITLES[this.section()];
    if (!titles) {
      return 'EduFlow';
    }
    return this.auth.isAdmin() ? titles.admin : titles.student;
  });

  protected toggle(): void {
    this.collapsed.update((value) => !value);
  }

  protected closeOnMobile(): void {
    if (window.innerWidth <= 860) {
      this.collapsed.set(true);
    }
  }
}
