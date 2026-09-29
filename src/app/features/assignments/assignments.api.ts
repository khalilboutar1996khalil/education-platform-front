import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.model';
import {
  AssignmentDetail,
  AssignmentRequest,
  AssignmentStatus,
  AssignmentSummary,
  Submission,
} from './assignments.model';

@Injectable({ providedIn: 'root' })
export class AssignmentsApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Observable<PageResponse<AssignmentSummary>> {
    return this.http.get<PageResponse<AssignmentSummary>>(`${this.base}/assignments`, { params: { size: 500 } });
  }

  get(id: number): Observable<AssignmentDetail> {
    return this.http.get<AssignmentDetail>(`${this.base}/assignments/${id}`);
  }

  create(courseId: number, body: AssignmentRequest): Observable<AssignmentDetail> {
    return this.http.post<AssignmentDetail>(`${this.base}/courses/${courseId}/assignments`, body);
  }

  update(id: number, body: AssignmentRequest): Observable<AssignmentDetail> {
    return this.http.put<AssignmentDetail>(`${this.base}/assignments/${id}`, body);
  }

  setStatus(id: number, status: AssignmentStatus): Observable<AssignmentDetail> {
    return this.http.patch<AssignmentDetail>(`${this.base}/assignments/${id}/status`, { status });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/assignments/${id}`);
  }

  attachBrief(id: number, file: File): Observable<AssignmentDetail> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<AssignmentDetail>(`${this.base}/assignments/${id}/brief`, form);
  }

  briefBlob(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/assignments/${id}/brief`, { responseType: 'blob' });
  }

  /** Every submission of an assignment, drafts included; filter client-side. */
  submissions(assignmentId: number): Observable<PageResponse<Submission>> {
    return this.http.get<PageResponse<Submission>>(`${this.base}/assignments/${assignmentId}/submissions`, {
      params: { size: 500 },
    });
  }

  grade(submissionId: number, grade: number, feedback: string | null): Observable<Submission> {
    return this.http.post<Submission>(`${this.base}/submissions/${submissionId}/grade`, { grade, feedback });
  }

  fileBlob(submissionId: number, fileId: number): Observable<Blob> {
    return this.http.get(`${this.base}/submissions/${submissionId}/files/${fileId}`, { responseType: 'blob' });
  }
}
