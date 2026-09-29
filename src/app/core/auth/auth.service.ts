import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, finalize, firstValueFrom, map, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { LoginRequest, LoginResponse, RegisterRequest, TokenPair } from '../models/auth.model';
import { User } from '../models/user.model';
import { AuthApi } from './auth.api';
import { TokenStorage } from './token-storage';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApi);
  private readonly tokens = inject(TokenStorage);
  private readonly router = inject(Router);

  private readonly _user = signal<User | null>(null);

  /**
   * Holds the in-progress refresh so concurrent 401s share one call. The backend rotates and
   * revokes the refresh token on every use, so firing two refreshes logs the user straight out.
   */
  private refreshInFlight: Observable<TokenPair> | null = null;

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  login(credentials: LoginRequest): Observable<User> {
    return this.api.login(credentials).pipe(
      tap((response) => this.startSession(response)),
      map((response) => response.user),
    );
  }

  /** Registration returns a session too, so the student is signed in the moment they sign up. */
  register(request: RegisterRequest): Observable<User> {
    return this.api.register(request).pipe(
      tap((response) => this.startSession(response)),
      map((response) => response.user),
    );
  }

  updateProfile(fullName: string): Observable<User> {
    const notifyByEmail = this._user()?.notifyByEmail ?? true;
    return this.api.updateProfile({ fullName, notifyByEmail }).pipe(tap((user) => this._user.set(user)));
  }

  /**
   * The backend revokes every refresh token on a password change, this session's included, so
   * signing straight back in with the new password is what keeps the user logged in.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    const email = this._user()?.email ?? '';
    return this.api.changePassword({ currentPassword, newPassword }).pipe(
      switchMap(() => this.api.login({ email, password: newPassword })),
      tap((response) => this.startSession(response)),
      map(() => undefined),
    );
  }

  /** Runs before the first render so guards see a settled authentication state. */
  async restoreSession(): Promise<void> {
    if (!this.tokens.refreshToken) {
      return;
    }
    try {
      await firstValueFrom(this.refreshTokens());
      this._user.set(await firstValueFrom(this.api.me()));
    } catch {
      this.clearSession();
    }
  }

  refreshTokens(): Observable<TokenPair> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    const refreshToken = this.tokens.refreshToken;
    if (!refreshToken) {
      return throwError(() => new Error('Aucun jeton de rafraîchissement disponible'));
    }

    this.refreshInFlight = this.api.refresh({ refreshToken }).pipe(
      tap((pair) => this.tokens.store(pair)),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshInFlight;
  }

  logout(): void {
    const refreshToken = this.tokens.refreshToken;
    if (refreshToken) {
      // Fire and forget — the local session ends whatever the server replies.
      this.api.logout({ refreshToken }).pipe(catchError(() => EMPTY)).subscribe();
    }
    this.clearSession();
    void this.router.navigate(['/login']);
  }

  /** The refresh token was rejected, so the session cannot be recovered. */
  forceLogout(): void {
    this.clearSession();
    void this.router.navigate(['/login'], { queryParams: { expired: '1' } });
  }

  private startSession(response: LoginResponse): void {
    this.tokens.store(response.tokens);
    this._user.set(response.user);
  }

  private clearSession(): void {
    this.tokens.clear();
    this._user.set(null);
    this.refreshInFlight = null;
  }
}
