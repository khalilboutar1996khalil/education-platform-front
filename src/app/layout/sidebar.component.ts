import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ROLE_LABELS } from '../core/models/user.model';
import { DashboardApi } from '../features/dashboard/dashboard.api';
import { navFor } from './nav.config';
import { LevelCatalog } from '../core/services/level-catalog.service';

@Component({
  selector: 'ef-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="bar" [class.bar--collapsed]="collapsed()">
      <div class="brand">
        <div class="brand__mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round">
            <path d="M22 10L12 5 2 10l10 5 10-5z" />
            <path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
          </svg>
        </div>
        @if (!collapsed()) {
          <div class="brand__text">
            <div class="brand__name">EduFlow</div>
            <div class="brand__role">{{ spaceLabel() }}</div>
          </div>
        }
      </div>

      <nav class="nav">
        @for (group of groups(); track group.title) {
          <div class="group">
            @if (!collapsed()) {
              <div class="group__title">{{ group.title }}</div>
            }
            @for (item of group.items; track item.path) {
              <a
                class="item"
                [routerLink]="['/app', item.path]"
                routerLinkActive="item--active"
                [title]="item.label"
                (click)="navigated.emit()"
              >
                <svg
                  class="item__icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path attr.d="{{ item.icon }}"></path>
                </svg>
                @if (!collapsed()) {
                  <span class="item__label">{{ item.label }}</span>
                  @if (item.path === 'corrections' && pending() > 0) {
                    <span class="item__badge">{{ pending() }}</span>
                  }
                }
              </a>
            }
          </div>
        }
      </nav>

      <div class="foot">
        <div class="avatar">{{ user()?.initials }}</div>
        @if (!collapsed()) {
          <div class="foot__text">
            <div class="foot__name">{{ user()?.fullName }}</div>
            <div class="foot__role">{{ roleLabel() }}</div>
          </div>
          <button type="button" class="foot__out" title="Se déconnecter" (click)="auth.logout()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        }
      </div>
    </aside>
  `,
  styles: `
    .bar {
      width: 238px;
      min-width: 238px;
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: linear-gradient(180deg, #052e16, #03180c);
      transition: width 0.26s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.26s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .bar--collapsed {
      width: 64px;
      min-width: 64px;
    }

    .brand {
      height: var(--ef-header-height);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 0 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .brand__mark {
      width: 34px;
      min-width: 34px;
      height: 34px;
      border-radius: 11px;
      background: var(--ef-gradient-brand);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand__text {
      overflow: hidden;
    }

    .brand__name {
      font-family: var(--ef-font-display);
      font-size: 15px;
      font-weight: 800;
      color: #fff;
      white-space: nowrap;
    }

    .brand__role {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ef-brand-400);
      white-space: nowrap;
    }

    .nav {
      flex: 1;
      overflow-y: auto;
      padding: 9px 8px;
    }

    .group {
      margin-bottom: 4px;
    }

    .group__title {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #7fae8e;
      padding: 9px 10px 5px;
    }

    .item {
      display: flex;
      align-items: center;
      gap: 11px;
      height: 37px;
      padding: 0 10px;
      margin-bottom: 2px;
      border-radius: 10px;
      color: #b2d4be;
      font-size: 12.5px;
      font-weight: 500;
      white-space: nowrap;
      transition: background 0.18s, color 0.18s, transform 0.18s var(--ef-ease-out);
    }

    .item:hover {
      background: rgba(34, 197, 94, 0.16);
      color: #86efac;
      transform: translateX(3px);
    }

    .item--active {
      background: var(--ef-gradient-brand);
      color: #fff;
      font-weight: 700;
    }

    .item--active:hover {
      background: var(--ef-gradient-brand);
      color: #fff;
    }

    .item__icon {
      min-width: 16px;
    }

    .item__badge {
      margin-left: auto;
      font-size: 9px;
      font-weight: 800;
      background: var(--ef-brand-500);
      color: var(--ef-brand-1000);
      border-radius: 20px;
      padding: 2px 6px;
    }

    .foot {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 11px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .avatar {
      width: 32px;
      min-width: 32px;
      height: 32px;
      border-radius: 10px;
      background: var(--ef-gradient-brand);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
    }

    .foot__text {
      flex: 1;
      min-width: 0;
    }

    .foot__name {
      font-size: 12.5px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .foot__role {
      font-size: 10px;
      color: #9cc0aa;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .foot__out {
      color: #9cc0aa;
      padding: 4px;
      display: flex;
      transition: color 0.2s;
    }

    .foot__out:hover {
      color: var(--ef-brand-400);
    }
  `,
})
export class SidebarComponent {
  protected readonly catalog = inject(LevelCatalog);
  protected readonly auth = inject(AuthService);

  private readonly dashboard = inject(DashboardApi);

  readonly collapsed = input(false);
  /** Submissions waiting for a mark; shown as a badge on Corrections. */
  protected readonly pending = signal(0);

  constructor() {
    if (this.auth.isAdmin()) {
      this.dashboard.admin().subscribe({
        next: (d) => this.pending.set(d.submissionsAwaitingMarking),
        error: () => this.pending.set(0),
      });
    }
  }
  readonly navigated = output<void>();

  protected readonly user = this.auth.user;
  protected readonly groups = computed(() => navFor(this.user()?.role));
  protected readonly spaceLabel = computed(() =>
    this.auth.isAdmin() ? 'Espace admin' : 'Espace élève',
  );
  /** Admins have no level, so they get their role; students get the year they belong to. */
  protected readonly roleLabel = computed(() => {
    const user = this.user();
    if (!user) {
      return '';
    }
    return user.level ? this.catalog.label(user.level) : ROLE_LABELS[user.role];
  });
}
