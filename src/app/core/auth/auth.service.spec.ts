import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TokenPair } from '../models/auth.model';
import { AuthService } from './auth.service';
import { TokenStorage } from './token-storage';

function tokenPair(accessToken: string, refreshToken: string): TokenPair {
  return {
    accessToken,
    accessTokenExpiresAt: '2030-01-01T00:00:00Z',
    refreshToken,
    refreshTokenExpiresAt: '2030-01-31T00:00:00Z',
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    TestBed.inject(TokenStorage).store(tokenPair('expired-access', 'refresh-1'));
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('collapses concurrent refreshes into a single request', () => {
    const received: string[] = [];

    // Three requests racing on a 401, as happens when a dashboard fires parallel calls.
    service.refreshTokens().subscribe((pair) => received.push(pair.accessToken));
    service.refreshTokens().subscribe((pair) => received.push(pair.accessToken));
    service.refreshTokens().subscribe((pair) => received.push(pair.accessToken));

    // expectOne fails outright if the rotation endpoint was hit more than once.
    const request = httpMock.expectOne('/api/v1/auth/refresh');
    expect(request.request.body).toEqual({ refreshToken: 'refresh-1' });
    request.flush(tokenPair('fresh-access', 'refresh-2'));

    expect(received).toEqual(['fresh-access', 'fresh-access', 'fresh-access']);
  });

  it('stores the rotated refresh token for the next attempt', () => {
    service.refreshTokens().subscribe();
    httpMock.expectOne('/api/v1/auth/refresh').flush(tokenPair('fresh-access', 'refresh-2'));

    expect(TestBed.inject(TokenStorage).refreshToken).toBe('refresh-2');
    expect(TestBed.inject(TokenStorage).accessToken()).toBe('fresh-access');
  });

  it('issues a new request once the in-flight one has settled', () => {
    service.refreshTokens().subscribe();
    httpMock.expectOne('/api/v1/auth/refresh').flush(tokenPair('access-2', 'refresh-2'));

    service.refreshTokens().subscribe();
    const second = httpMock.expectOne('/api/v1/auth/refresh');
    expect(second.request.body).toEqual({ refreshToken: 'refresh-2' });
    second.flush(tokenPair('access-3', 'refresh-3'));
  });

  it('clears the session when the refresh token is rejected', () => {
    let failed = false;
    service.refreshTokens().subscribe({ error: () => (failed = true) });

    httpMock
      .expectOne('/api/v1/auth/refresh')
      .flush({ detail: 'Session expirée' }, { status: 401, statusText: 'Unauthorized' });

    expect(failed).toBeTrue();

    // A later attempt must not reuse the dead observable.
    service.refreshTokens().subscribe({ error: () => undefined });
    httpMock.expectOne('/api/v1/auth/refresh').flush(tokenPair('access-2', 'refresh-2'));
  });
});
