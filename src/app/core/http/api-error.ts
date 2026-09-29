import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, ProblemDetail } from '../models/api.model';

/** Collapses an HttpErrorResponse into the ProblemDetail-shaped data components care about. */
export function toApiError(error: HttpErrorResponse): ApiError {
  if (error.status === 0) {
    return {
      status: 0,
      detail: 'Impossible de joindre le serveur. Vérifiez votre connexion.',
      fieldErrors: {},
    };
  }

  const problem = (error.error ?? {}) as ProblemDetail;
  const retryAfter = Number(error.headers?.get('Retry-After'));

  return {
    status: error.status,
    // Server messages are already French, so they are surfaced rather than rewritten.
    detail: problem.detail ?? problem.title ?? 'Une erreur inattendue est survenue',
    fieldErrors: problem.errors ?? {},
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  };
}

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'fieldErrors' in value;
}
