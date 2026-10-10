import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  RegisterRequest,
  SubmitAccessRequest,
  TokenPair,
  UpdateProfileRequest,
} from '../models/auth.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  login(body: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, body);
  }

  /** Returns a full session, so registering signs the student in without a second call. */
  register(body: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/auth/register`, body);
  }

  refresh(body: RefreshRequest): Observable<TokenPair> {
    return this.http.post<TokenPair>(`${this.base}/auth/refresh`, body);
  }

  logout(body: RefreshRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/logout`, body);
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.base}/me`);
  }

  updateProfile(body: UpdateProfileRequest): Observable<User> {
    return this.http.patch<User>(`${this.base}/me`, body);
  }

  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/me/password`, body);
  }

  /** Always 204, whether or not the address has an account. */
  forgotPassword(body: { email: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/forgot-password`, body);
  }

  resetPassword(body: { token: string; newPassword: string }): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/reset-password`, body);
  }

  submitAccessRequest(body: SubmitAccessRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/access-requests`, body);
  }
}
