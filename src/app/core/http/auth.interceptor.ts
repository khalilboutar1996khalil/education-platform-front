import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TokenStorage } from '../auth/token-storage';

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];

/** Public endpoints must never carry a bearer token or trigger a refresh attempt. */
function isPublic(req: HttpRequest<unknown>): boolean {
  if (PUBLIC_AUTH_PATHS.some((path) => req.url.includes(path))) {
    return true;
  }
  // Submitting an access request is public; listing and approving them are not.
  return req.method === 'POST' && /\/access-requests$/.test(req.url);
}

function withBearer(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (isPublic(req)) {
    return next(req);
  }

  const tokens = inject(TokenStorage);
  const auth = inject(AuthService);

  const accessToken = tokens.accessToken();
  const authorised = accessToken ? withBearer(req, accessToken) : req;

  return next(authorised).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || !tokens.refreshToken) {
        return throwError(() => error);
      }

      // Shared across concurrent 401s — see AuthService.refreshTokens.
      // Only a failed refresh ends the session: a retried request can still answer 401 for its
      // own reasons (a wrong current password), and that error belongs to the caller.
      return auth.refreshTokens().pipe(
        catchError((refreshError) => {
          auth.forceLogout();
          return throwError(() => refreshError);
        }),
        switchMap((pair) => next(withBearer(req, pair.accessToken))),
      );
    }),
  );
};
