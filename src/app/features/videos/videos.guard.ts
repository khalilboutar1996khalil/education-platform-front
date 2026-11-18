import { DestroyRef, computed, effect, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { LevelService } from '../../core/services/level.service';
import {
  BOOKS,
  Book,
  bookForLevel,
  bookOfCode,
  videoByCode,
} from './videos.catalog';

/**
 * The book videos: each book for its own level only (a 9ᵉ student scanning a 7ᵉ QR code goes to
 * their dashboard). An admin opening a video (from a QR code or a module) is switched to that
 * book's level in the header. `/app/videos/8` (QR code `/v/8`) opens the whole 8ᵉ library.
 */
export const bookVideosGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const levels = inject(LevelService);
  const code = route.paramMap.get('code');
  const book = code ? bookOfCode(code) : undefined;
  const wholeBook = !!book && code!.trim() === book.num;
  if (code && (!book || (!wholeBook && !videoByCode(code)))) {
    return router.createUrlTree(['/app/videos']);
  }

  if (auth.isAdmin()) {
    const target = book ?? bookForLevel(levels.current()) ?? BOOKS[0];
    levels.current.set(target.level);
    return wholeBook ? router.createUrlTree(['/app/videos']) : true;
  }
  const own = bookForLevel(auth.user()?.level);
  if (!own || (book && book !== own)) {
    return router.createUrlTree(['/app/dashboard']);
  }
  return wholeBook ? router.createUrlTree(['/app/videos']) : true;
};

/** The book shown: the student's own level, or for an admin the level picked in the header. */
export function currentBook() {
  const auth = inject(AuthService);
  const levels = inject(LevelService);
  return computed<Book>(
    () =>
      bookForLevel(auth.isAdmin() ? levels.current() : auth.user()?.level) ??
      BOOKS[0],
  );
}

/**
 * Call from a videos page constructor: when an admin switches the header to a level without book
 * videos, go back to its modules (switching between 7ᵉ and 8ᵉ just shows the other book).
 */
export function leaveVideosWhenAdminChangesLevel(
  onlyBook?: () => Book | undefined,
): void {
  const auth = inject(AuthService);
  const levels = inject(LevelService);
  const router = inject(Router);
  const ref = effect(() => {
    if (!auth.isAdmin()) return;
    const book = bookForLevel(levels.current());
    if (!book) {
      void router.navigate(['/app/courses']);
    } else if (onlyBook && onlyBook() && onlyBook() !== book) {
      // On a video of the other book: go to the library of the level just picked.
      void router.navigate(['/app/videos']);
    }
  });
  inject(DestroyRef).onDestroy(() => ref.destroy());
}
