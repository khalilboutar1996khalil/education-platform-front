import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.model';
import { BlogCategory, BlogCategoryRequest, BlogPost, BlogPostRequest } from './blog.model';

@Injectable({ providedIn: 'root' })
export class BlogApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/blog`;

  list(q: { categoryId: number | null; search: string; page: number; size: number }): Observable<PageResponse<BlogPost>> {
    let params = new HttpParams().set('page', q.page).set('size', q.size);
    if (q.categoryId !== null) {
      params = params.set('categoryId', q.categoryId);
    }
    if (q.search) {
      params = params.set('search', q.search);
    }
    return this.http.get<PageResponse<BlogPost>>(`${this.base}/posts`, { params });
  }

  /** Does not count a view — for the admin and the editor. */
  get(id: number): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.base}/posts/${id}`);
  }

  /** Counts a view. */
  read(slug: string): Observable<BlogPost> {
    return this.http.get<BlogPost>(`${this.base}/posts/by-slug/${encodeURIComponent(slug)}`);
  }

  create(body: BlogPostRequest): Observable<BlogPost> {
    return this.http.post<BlogPost>(`${this.base}/posts`, body);
  }

  update(id: number, body: BlogPostRequest): Observable<BlogPost> {
    return this.http.put<BlogPost>(`${this.base}/posts/${id}`, body);
  }

  publish(id: number): Observable<BlogPost> {
    return this.http.post<BlogPost>(`${this.base}/posts/${id}/publish`, {});
  }

  unpublish(id: number): Observable<BlogPost> {
    return this.http.post<BlogPost>(`${this.base}/posts/${id}/unpublish`, {});
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/posts/${id}`);
  }

  categories(): Observable<BlogCategory[]> {
    return this.http.get<BlogCategory[]>(`${this.base}/categories`);
  }

  createCategory(body: BlogCategoryRequest): Observable<BlogCategory> {
    return this.http.post<BlogCategory>(`${this.base}/categories`, body);
  }

  deleteCategory(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/categories/${id}`);
  }
}
