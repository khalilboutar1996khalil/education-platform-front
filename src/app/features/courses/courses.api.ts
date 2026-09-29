import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.model';
import { Level } from '../../core/models/user.model';
import {
  Chapter,
  ChapterRequest,
  CourseDetail,
  CourseRequest,
  CourseSummary,
  LessonRequest,
} from './courses.model';

@Injectable({ providedIn: 'root' })
export class CoursesApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  list(level?: Level): Observable<PageResponse<CourseSummary>> {
    const params: Record<string, string | number> = { size: 100 };
    if (level) {
      params['level'] = level;
    }
    return this.http.get<PageResponse<CourseSummary>>(`${this.base}/courses`, { params });
  }

  get(id: number): Observable<CourseDetail> {
    return this.http.get<CourseDetail>(`${this.base}/courses/${id}`);
  }

  create(body: CourseRequest): Observable<CourseDetail> {
    return this.http.post<CourseDetail>(`${this.base}/courses`, body);
  }

  update(id: number, body: CourseRequest): Observable<CourseDetail> {
    return this.http.put<CourseDetail>(`${this.base}/courses/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/courses/${id}`);
  }

  addChapter(courseId: number, body: ChapterRequest): Observable<CourseDetail> {
    return this.http.post<CourseDetail>(`${this.base}/courses/${courseId}/chapters`, body);
  }

  updateChapter(chapterId: number, body: ChapterRequest): Observable<CourseDetail> {
    return this.http.put<CourseDetail>(`${this.base}/chapters/${chapterId}`, body);
  }

  deleteChapter(chapterId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/chapters/${chapterId}`);
  }

  addLesson(chapterId: number, body: LessonRequest): Observable<Chapter> {
    return this.http.post<Chapter>(`${this.base}/chapters/${chapterId}/lessons`, body);
  }

  updateLesson(lessonId: number, body: LessonRequest): Observable<Chapter> {
    return this.http.put<Chapter>(`${this.base}/lessons/${lessonId}`, body);
  }

  deleteLesson(lessonId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/lessons/${lessonId}`);
  }
}
