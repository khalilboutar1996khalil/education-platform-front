import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.model';
import { QuestionRequest, QuizDetail, QuizRequest, QuizStatus, QuizSummary } from './quizzes.model';

/** Admin endpoints; the student side (/my/quizzes, attempts) gets its own client. */
@Injectable({ providedIn: 'root' })
export class QuizzesApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(): Observable<PageResponse<QuizSummary>> {
    return this.http.get<PageResponse<QuizSummary>>(`${this.base}/quizzes`, { params: { size: 500 } });
  }

  get(id: number): Observable<QuizDetail> {
    return this.http.get<QuizDetail>(`${this.base}/quizzes/${id}`);
  }

  create(courseId: number, body: QuizRequest): Observable<QuizDetail> {
    return this.http.post<QuizDetail>(`${this.base}/courses/${courseId}/quizzes`, body);
  }

  update(id: number, body: QuizRequest): Observable<QuizDetail> {
    return this.http.put<QuizDetail>(`${this.base}/quizzes/${id}`, body);
  }

  setStatus(id: number, status: QuizStatus): Observable<QuizDetail> {
    return this.http.patch<QuizDetail>(`${this.base}/quizzes/${id}/status`, { status });
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/quizzes/${id}`);
  }

  addQuestion(quizId: number, body: QuestionRequest): Observable<QuizDetail> {
    return this.http.post<QuizDetail>(`${this.base}/quizzes/${quizId}/questions`, body);
  }

  updateQuestion(questionId: number, body: QuestionRequest): Observable<QuizDetail> {
    return this.http.put<QuizDetail>(`${this.base}/questions/${questionId}`, body);
  }

  deleteQuestion(questionId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/questions/${questionId}`);
  }
}
