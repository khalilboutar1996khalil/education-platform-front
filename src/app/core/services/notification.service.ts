import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../models/api.model';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/** Backs the bell in the header: unread count for the dot, latest items for the panel. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/my/notifications`;

  readonly unread = signal(0);
  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);

  refreshCount(): void {
    this.http.get<{ unread: number }>(`${this.base}/unread-count`).subscribe({
      next: (res) => this.unread.set(res.unread),
      error: () => this.unread.set(0),
    });
  }

  loadLatest(): void {
    this.loading.set(true);
    this.http.get<PageResponse<AppNotification>>(this.base, { params: { size: 8 } }).subscribe({
      next: (page) => {
        this.items.set(page.content);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markRead(item: AppNotification): void {
    if (item.read) {
      return;
    }
    this.http.post<AppNotification>(`${this.base}/${item.id}/read`, {}).subscribe(() => {
      this.items.update((list) => list.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      this.unread.update((n) => Math.max(0, n - 1));
    });
  }

  markAllRead(): void {
    this.http.post(`${this.base}/read-all`, {}).subscribe(() => {
      this.items.update((list) => list.map((n) => ({ ...n, read: true })));
      this.unread.set(0);
    });
  }
}
