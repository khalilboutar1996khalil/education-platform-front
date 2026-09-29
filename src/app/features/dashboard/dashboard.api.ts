import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.model';
import { Level } from '../../core/models/user.model';
import { Activity, AdminDashboard, CourseSummary } from './dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  admin(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.base}/dashboard/admin`);
  }

  coursesOf(level: Level): Observable<PageResponse<CourseSummary>> {
    return this.http.get<PageResponse<CourseSummary>>(`${this.base}/courses`, { params: { level, size: 50 } });
  }

  activity(size = 5): Observable<PageResponse<Activity>> {
    return this.http.get<PageResponse<Activity>>(`${this.base}/activity`, { params: { size } });
  }
}
