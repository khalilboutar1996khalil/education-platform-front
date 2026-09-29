import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClassCode, ClassCodeRequest } from './class-codes.model';

@Injectable({ providedIn: 'root' })
export class ClassCodesApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/class-codes`;

  list(): Observable<ClassCode[]> {
    return this.http.get<ClassCode[]>(this.base);
  }

  create(body: ClassCodeRequest): Observable<ClassCode> {
    return this.http.post<ClassCode>(this.base, body);
  }

  deactivate(id: number): Observable<ClassCode> {
    return this.http.patch<ClassCode>(`${this.base}/${id}/deactivate`, {});
  }
}
