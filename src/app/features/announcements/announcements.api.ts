import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.model';
import { Announcement, AnnouncementRequest } from './announcements.model';

@Injectable({ providedIn: 'root' })
export class AnnouncementsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/announcements`;

  /** No level filter server-side for the admin, so one large page is fetched and narrowed on screen. */
  list(): Observable<PageResponse<Announcement>> {
    return this.http.get<PageResponse<Announcement>>(this.base, { params: { size: 300 } });
  }

  create(body: AnnouncementRequest): Observable<Announcement> {
    return this.http.post<Announcement>(this.base, body);
  }

  update(id: number, body: AnnouncementRequest): Observable<Announcement> {
    return this.http.put<Announcement>(`${this.base}/${id}`, body);
  }

  publish(id: number): Observable<Announcement> {
    return this.http.post<Announcement>(`${this.base}/${id}/publish`, {});
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
