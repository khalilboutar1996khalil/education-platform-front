import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ApiError } from '../models/api.model';
import { ToastService } from '../services/toast.service';
import { toApiError } from './api-error';

/**
 * Registered outside authInterceptor so a 401 only reaches here once the token refresh and retry
 * have already failed. Always rethrows an ApiError, never a raw HttpErrorResponse.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const apiError = toApiError(error);
      if (shouldToast(apiError)) {
        toast.error(apiError.detail);
      }
      return throwError(() => apiError);
    }),
  );
};

function shouldToast(error: ApiError): boolean {
  // Forms render field-level messages inline.
  if (error.status === 400 && Object.keys(error.fieldErrors).length > 0) {
    return false;
  }
  // Bad credentials belong next to the password box; an expired session is handled by forceLogout.
  return error.status !== 401;
}
