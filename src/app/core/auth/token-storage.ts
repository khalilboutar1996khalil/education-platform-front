import { Injectable, signal } from '@angular/core';
import { TokenPair } from '../models/auth.model';

const REFRESH_KEY = 'eduflow.refresh-token';

/**
 * The access token stays in memory so it is never readable from disk; the refresh token has to
 * persist for reload to work, and the API offers no httpOnly cookie, so localStorage is the only
 * option available. That leaves it exposed to XSS — moving refresh to a cookie server-side is the
 * real fix.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorage {
  private readonly _accessToken = signal<string | null>(null);
  readonly accessToken = this._accessToken.asReadonly();

  get refreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  }

  store(tokens: TokenPair): void {
    this._accessToken.set(tokens.accessToken);
    try {
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    } catch {
      // Storage blocked: the session still works until this tab is closed.
    }
  }

  clear(): void {
    this._accessToken.set(null);
    try {
      localStorage.removeItem(REFRESH_KEY);
    } catch {
      // Nothing to do.
    }
  }
}
