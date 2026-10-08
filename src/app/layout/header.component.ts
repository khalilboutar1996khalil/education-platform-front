import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { timeAgo } from '../shared/datetime';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ROLE_LABELS } from '../core/models/user.model';
import { LevelService } from '../core/services/level.service';
import { AppNotification, NotificationService } from '../core/services/notification.service';
import { LevelCatalog } from '../core/services/level-catalog.service';

@Component({
  selector: 'ef-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false); notifOpen.set(false)',
  },
  template: `
    <header class="bar">
      <button type="button" class="icon-btn" title="Réduire le menu" (click)="toggleSidebar.emit()">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <h1 class="title">{{ title() }}</h1>

      @if (auth.isAdmin()) {
        <select
          class="level"
          title="Niveau"
          (change)="levels.current.set($any($event.target).value)"
        >
          @for (opt of levelOptions(); track opt.value) {
            <option [value]="opt.value" [selected]="opt.value === levels.current()">{{ opt.label }}</option>
          }
        </select>
      }

      <div class="notif">
        <button type="button" class="icon-btn" title="Notifications" (click)="toggleNotif()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
        @if (notifications.unread() > 0) {
          <span class="notif__dot"></span>
          <span class="notif__dot notif__dot--ripple"></span>
        }

        @if (notifOpen()) {
          <div class="panel">
            <div class="panel__head">
              <span class="panel__title">Notifications</span>
              @if (notifications.unread() > 0) {
                <button type="button" class="panel__all" (click)="notifications.markAllRead()">Tout marquer comme lu</button>
              }
            </div>
            @for (n of notifications.items(); track n.id) {
              <button type="button" class="panel__item" [class.panel__item--unread]="!n.read" (click)="open(n)">
                <span class="panel__bullet"></span>
                <span class="panel__body">
                  <span class="panel__text">{{ n.title }}</span>
                  @if (n.body) {
                    <span class="panel__sub">{{ n.body }}</span>
                  }
                  <span class="panel__time">{{ ago(n.createdAt) }}</span>
                </span>
              </button>
            } @empty {
              <div class="panel__empty">
                {{ notifications.loading() ? 'Chargement…' : 'Aucune notification pour le moment.' }}
              </div>
            }
          </div>
        }
      </div>

      <div class="account">
        <button
          type="button"
          class="avatar"
          title="Mon compte"
          aria-haspopup="menu"
          [attr.aria-expanded]="menuOpen()"
          (click)="menuOpen.set(!menuOpen())"
        >
          {{ auth.user()?.initials }}
        </button>

        @if (menuOpen()) {
          <div class="menu" role="menu">
            <div class="menu__head">
              <div class="avatar avatar--lg">{{ auth.user()?.initials }}</div>
              <div class="menu__who">
                <div class="menu__name">{{ auth.user()?.fullName }}</div>
                <div class="menu__email">{{ auth.user()?.email }}</div>
                <div class="menu__tag">{{ subtitle() }}</div>
              </div>
            </div>
            <a routerLink="/app/settings" class="menu__item" role="menuitem" (click)="menuOpen.set(false)">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              Mon profil
            </a>
            <button type="button" class="menu__item menu__item--danger" role="menuitem" (click)="logout()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Se déconnecter
            </button>
          </div>
        }
      </div>
    </header>
  `,
  styles: `
    .bar {
      height: var(--ef-header-height);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 18px;
      background: var(--ef-surface);
      border-bottom: 1px solid var(--ef-border);
      z-index: 40;
    }

    .title {
      flex: 1;
      min-width: 0;
      font-family: var(--ef-font-display);
      font-size: 15.5px;
      font-weight: 700;
      letter-spacing: -0.3px;
      color: var(--ef-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .icon-btn {
      flex-shrink: 0;
      width: 37px;
      height: 37px;
      border-radius: var(--ef-radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--ef-text-muted);
      background: var(--ef-surface-2);
      transition: color 0.2s, background 0.2s, transform 0.2s;
    }

    .icon-btn:hover {
      color: var(--ef-brand-600);
    }

    .icon-btn--rotate:hover {
      transform: rotate(-18deg);
    }

    .avatar {
      flex-shrink: 0;
      width: 33px;
      height: 33px;
      border-radius: var(--ef-radius-sm);
      background: var(--ef-gradient-brand);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    button.avatar:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(22, 163, 74, 0.3);
    }

    .avatar--lg {
      width: 42px;
      height: 42px;
      font-size: 14px;
      cursor: default;
    }

    .account {
      position: relative;
      flex-shrink: 0;
    }

    .menu {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 270px;
      max-width: calc(100vw - 32px);
      padding: 8px;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      border-radius: var(--ef-radius-lg);
      box-shadow: 0 18px 40px rgba(6, 40, 20, 0.16);
      animation: ef-fade-up 0.18s ease backwards;
      z-index: 50;
    }

    .menu__head {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 10px 10px 14px;
      margin-bottom: 6px;
      border-bottom: 1px solid var(--ef-border);
    }

    .menu__who {
      min-width: 0;
    }

    .menu__name {
      font-weight: 800;
      font-size: 14px;
      color: var(--ef-text);
    }

    .menu__email {
      font-size: 12px;
      color: var(--ef-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .menu__tag {
      display: inline-block;
      margin-top: 5px;
      font-size: 11px;
      font-weight: 700;
      color: var(--ef-ink-green);
      background: var(--ef-surface-2);
      padding: 2px 8px;
      border-radius: var(--ef-radius-pill);
    }

    .menu__item {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-radius: var(--ef-radius-sm);
      font-size: 13.5px;
      font-weight: 600;
      color: var(--ef-text);
      text-decoration: none;
      text-align: left;
      cursor: pointer;
    }

    .menu__item:hover {
      background: var(--ef-surface-2);
    }

    .menu__item--danger {
      color: #DC2626;
    }

    .level {
      flex-shrink: 0;
      height: 37px;
      padding: 0 10px;
      border-radius: 10px;
      border: 1px solid var(--ef-border);
      background: var(--ef-surface-2);
      color: var(--ef-text);
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .notif {
      position: relative;
      flex-shrink: 0;
    }

    .notif__dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ef-brand-500);
      border: 2px solid var(--ef-surface);
      pointer-events: none;
    }

    .notif__dot--ripple {
      border: none;
      animation: ef-ripple 1.8s ease-out infinite;
    }

    @keyframes ef-ripple {
      0% { transform: scale(0.85); opacity: 0.55; }
      100% { transform: scale(2.1); opacity: 0; }
    }

    .panel {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: 320px;
      max-width: calc(100vw - 28px);
      max-height: 420px;
      overflow-y: auto;
      background: var(--ef-surface);
      border: 1px solid var(--ef-border);
      border-radius: var(--ef-radius-lg);
      box-shadow: 0 20px 50px rgba(6, 60, 30, 0.2);
      animation: ef-fade-up 0.2s ease backwards;
      z-index: 50;
    }

    .panel__head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 13px 16px;
      border-bottom: 1px solid var(--ef-border);
    }

    .panel__title {
      font-family: var(--ef-font-display);
      font-size: 13.5px;
      font-weight: 700;
      color: var(--ef-text);
    }

    .panel__all {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--ef-ink-green);
    }

    .panel__item {
      width: 100%;
      display: flex;
      gap: 10px;
      align-items: flex-start;
      padding: 12px 16px;
      border-bottom: 1px solid var(--ef-border);
      text-align: left;
      cursor: pointer;
    }

    .panel__item:hover {
      background: var(--ef-surface-2);
    }

    .panel__item--unread {
      background: var(--ef-tint-green);
    }

    .panel__bullet {
      width: 7px;
      height: 7px;
      margin-top: 5px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .panel__item--unread .panel__bullet {
      background: var(--ef-brand-500);
    }

    .panel__body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .panel__text {
      font-size: 12px;
      font-weight: 600;
      color: var(--ef-text);
      line-height: 1.5;
    }

    .panel__sub,
    .panel__time {
      font-size: 10.5px;
      color: var(--ef-text-muted);
    }

    .panel__empty {
      padding: 24px 16px;
      text-align: center;
      font-size: 12.5px;
      color: var(--ef-text-muted);
    }

    @media (max-width: 540px) {
      .level {
        max-width: 110px;
      }
    }
  `,
})
export class HeaderComponent {
  protected readonly catalog = inject(LevelCatalog);
  protected readonly auth = inject(AuthService);

  readonly title = input('EduFlow');
  readonly toggleSidebar = output<void>();

  protected readonly levels = inject(LevelService);
  protected readonly notifications = inject(NotificationService);
  // Every level, closed ones too: the admin may still need to look at a closed level's data
  protected readonly levelOptions = computed(() =>
    this.catalog.all().map((l) => ({ value: l.code, label: l.active ? l.name : `${l.name} (fermé)` })),
  );
  private readonly router = inject(Router);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly menuOpen = signal(false);
  protected readonly notifOpen = signal(false);

  constructor() {
    this.notifications.refreshCount();
  }

  /** Students see their level; the admin sees their role. */
  protected readonly subtitle = computed(() => {
    const user = this.auth.user();
    if (!user) {
      return '';
    }
    return user.level ? this.catalog.label(user.level) : ROLE_LABELS[user.role];
  });

  protected onDocumentClick(event: MouseEvent): void {
    const root = this.host.nativeElement;
    const target = event.target as Node;
    if (this.menuOpen() && !root.querySelector('.account')?.contains(target)) {
      this.menuOpen.set(false);
    }
    if (this.notifOpen() && !root.querySelector('.notif')?.contains(target)) {
      this.notifOpen.set(false);
    }
  }

  protected toggleNotif(): void {
    const opening = !this.notifOpen();
    this.notifOpen.set(opening);
    if (opening) {
      this.menuOpen.set(false);
      this.notifications.loadLatest();
    }
  }

  protected open(item: AppNotification): void {
    this.notifications.markRead(item);
    if (item.link) {
      this.notifOpen.set(false);
      this.router.navigateByUrl(item.link);
    }
  }

  protected ago(iso: string): string {
    return timeAgo(iso);
  }

  protected logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
  }
}
