import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateLevelRequest, SchoolLevel, UpdateLevelRequest } from '../models/level.model';

/**
 * The levels the admin has configured, fetched from the API instead of being compiled in.
 * The API returns the active levels to everybody and every level to an admin, so the shell
 * reloads it once signed in.
 */
@Injectable({ providedIn: 'root' })
export class LevelCatalog {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/levels`;

  readonly all = signal<SchoolLevel[]>([]);
  readonly active = computed(() => this.all().filter((l) => l.active));
  /** For form selects: only levels still open to new students, modules and codes. */
  readonly options = computed(() => this.active().map((l) => ({ value: l.code, label: l.name })));

  /** Never errors: a failed load leaves the previous list, and labels fall back to the code. */
  load(): Observable<SchoolLevel[]> {
    return this.http.get<SchoolLevel[]>(this.base).pipe(
      tap((list) => this.all.set([...list].sort((a, b) => a.position - b.position))),
      catchError(() => of(this.all())),
    );
  }

  label(code: string | null | undefined): string {
    if (!code) {
      return '';
    }
    return this.all().find((l) => l.code === code)?.name ?? code;
  }

  /** The label without the section name, for tight spots: "2ᵉ AS" rather than "2ᵉ AS informatique". */
  short(code: string | null | undefined): string {
    return this.label(code).replace(/\s*informatique\s*$/i, '');
  }

  create(body: CreateLevelRequest): Observable<SchoolLevel> {
    return this.http.post<SchoolLevel>(this.base, body);
  }

  update(id: number, body: UpdateLevelRequest): Observable<SchoolLevel> {
    return this.http.put<SchoolLevel>(`${this.base}/${id}`, body);
  }

  setActive(id: number, active: boolean): Observable<SchoolLevel> {
    return this.http.patch<SchoolLevel>(`${this.base}/${id}/${active ? 'activate' : 'deactivate'}`, {});
  }
}
