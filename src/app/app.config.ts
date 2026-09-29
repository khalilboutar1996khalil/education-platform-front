import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeFr from '@angular/common/locales/fr';
import { ApplicationConfig, LOCALE_ID, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/http/auth.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Dates and numbers are formatted in French everywhere (DatePipe, etc.)
    { provide: LOCALE_ID, useValue: 'fr' },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    // Order matters: errorInterceptor sits outside, so authInterceptor gets to refresh and retry
    // a 401 before the error is ever surfaced to the user.
    provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
    // Settles authentication before the first route is evaluated, so guards never see a half state.
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
