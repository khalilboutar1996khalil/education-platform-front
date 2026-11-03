import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { canSeeBookVideos } from './videos.catalog';

/** The 7ᵉ book videos: admins and 7ᵉ students only. Others (e.g. a 9ᵉ student scanning a QR code) go to their dashboard. */
export const bookVideosGuard: CanActivateFn = () => {
  const user = inject(AuthService).user();
  return canSeeBookVideos(user?.role, user?.level) || inject(Router).createUrlTree(['/app/dashboard']);
};
