import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.model';
import { Level, User, UserStatus } from '../../core/models/user.model';
import {
  AccessRequest,
  AccessRequestStatus,
  ApprovedAccessResponse,
  InviteStudentRequest,
  InviteStudentResponse,
} from './students.model';

export interface StudentQuery {
  level: Level;
  status: UserStatus | null;
  search: string;
  page: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class StudentsApi {
  private readonly http = inject(HttpClient);
  private readonly users = `${environment.apiBaseUrl}/users`;
  private readonly requests = `${environment.apiBaseUrl}/access-requests`;

  students(q: StudentQuery): Observable<PageResponse<User>> {
    let params = new HttpParams().set('role', 'STUDENT').set('level', q.level).set('page', q.page).set('size', q.size);
    if (q.status) {
      params = params.set('status', q.status);
    }
    if (q.search) {
      params = params.set('search', q.search);
    }
    return this.http.get<PageResponse<User>>(this.users, { params });
  }

  invite(body: InviteStudentRequest): Observable<InviteStudentResponse> {
    return this.http.post<InviteStudentResponse>(this.users, body);
  }

  /** New one-time temporary password; the student is signed out everywhere. */
  resetPassword(id: number): Observable<InviteStudentResponse> {
    return this.http.post<InviteStudentResponse>(`${this.users}/${id}/reset-password`, {});
  }

  setStatus(id: number, status: UserStatus): Observable<User> {
    return this.http.patch<User>(`${this.users}/${id}/status`, { status });
  }

  accessRequests(status: AccessRequestStatus | null, page: number, size: number): Observable<PageResponse<AccessRequest>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<PageResponse<AccessRequest>>(this.requests, { params });
  }

  approve(id: number): Observable<ApprovedAccessResponse> {
    return this.http.post<ApprovedAccessResponse>(`${this.requests}/${id}/approve`, {});
  }

  reject(id: number, note: string | null): Observable<AccessRequest> {
    return this.http.post<AccessRequest>(`${this.requests}/${id}/reject`, { note });
  }
}
