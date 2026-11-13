import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Level, User } from '../../core/models/user.model';
import { Offer, PaymentSettings, Plan, PlanRequest } from './subscriptions.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/subscriptions`;

  /** Public: the plans on sale and where to pay. */
  offer(): Observable<Offer> {
    return this.http.get<Offer>(`${this.base}/offer`);
  }

  plans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.base}/plans`);
  }

  savePlan(level: Level, body: PlanRequest): Observable<Plan> {
    return this.http.put<Plan>(`${this.base}/plans/${level}`, body);
  }

  paymentSettings(): Observable<PaymentSettings> {
    return this.http.get<PaymentSettings>(`${this.base}/payment-settings`);
  }

  savePaymentSettings(body: PaymentSettings): Observable<PaymentSettings> {
    return this.http.put<PaymentSettings>(`${this.base}/payment-settings`, body);
  }

  /** Last day the student may sign in (ISO date). */
  setAccessUntil(studentId: number, accessUntil: string): Observable<User> {
    return this.http.put<User>(`${this.base}/students/${studentId}/access-until`, { accessUntil });
  }
}
