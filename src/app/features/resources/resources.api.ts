import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.model';
import { Resource, ResourceRequest } from './resources.model';

@Injectable({ providedIn: 'root' })
export class ResourcesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/resources`;

  list(): Observable<PageResponse<Resource>> {
    return this.http.get<PageResponse<Resource>>(this.base, { params: { size: 500 } });
  }

  /** Multipart: the JSON goes in the "resource" part, the upload (absent for a LINK) in "file". */
  create(body: ResourceRequest, file: File | null): Observable<Resource> {
    const form = new FormData();
    form.append('resource', new Blob([JSON.stringify(body)], { type: 'application/json' }));
    if (file) {
      form.append('file', file);
    }
    return this.http.post<Resource>(this.base, form);
  }

  update(id: number, body: ResourceRequest): Observable<Resource> {
    return this.http.put<Resource>(`${this.base}/${id}`, body);
  }

  delete(id: number): Observable<unknown> {
    return this.http.delete(`${this.base}/${id}`);
  }

  /** Also counts the download server-side. */
  download(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/download`, { responseType: 'blob' });
  }
}
