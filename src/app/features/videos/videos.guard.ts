import { DestroyRef, effect, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LevelService } from '../../core/services/level.service';
import { BOOK_LEVEL, canSeeBookVideos } from './videos.catalog';

/**
 * The 7ᵉ book videos: 7ᵉ students only (a 9ᵉ student scanning a QR code goes to their dashboard).
 * An admin opening a video (from a QR code or a module) is switched to 7ᵉ in the header.
 */
export const bookVideosGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const user = auth.user();
  if (auth.isAdmin()) {
    inject(LevelService).current.set(BOOK_LEVEL);
    return true;
  }
  return (
    canSeeBookVideos(user?.level) ||
    inject(Router).createUrlTree(['/app/dashboard'])
  );
};

/**
 * Call from a videos page constructor: when an admin switches the header to another level, the
 * 7ᵉ videos are not for that level, so go back to its modules.
 */
export function leaveVideosWhenAdminChangesLevel(): void {
  const auth = inject(AuthService);
  const levels = inject(LevelService);
  const router = inject(Router);
  const ref = effect(() => {
    if (auth.isAdmin() && !canSeeBookVideos(levels.current())) {
      void router.navigate(['/app/courses']);
    }
  });
  inject(DestroyRef).onDestroy(() => ref.destroy());
}
