import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GradebookRow, ManualGradeRequest } from './grades.model';

@Injectable({ providedIn: 'root' })
export class GradesApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** Only students who already have at least one mark in the module. */
  gradebook(courseId: number): Observable<GradebookRow[]> {
    return this.http.get<GradebookRow[]>(`${this.base}/courses/${courseId}/gradebook`);
  }

  addManual(courseId: number, body: ManualGradeRequest): Observable<GradebookRow> {
    return this.http.post<GradebookRow>(`${this.base}/courses/${courseId}/grades`, body);
  }

  deleteManual(gradeId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/grades/${gradeId}`);
  }
}
