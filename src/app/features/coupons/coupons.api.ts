import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse } from '../../core/models/api.model';
import { Coupon, CouponBatch, CreateCouponBatchRequest } from './coupons.model';

@Injectable({ providedIn: 'root' })
export class CouponsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/coupons/batches`;

  listBatches(page = 0, size = 50): Observable<PageResponse<CouponBatch>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PageResponse<CouponBatch>>(this.base, { params });
  }

  createBatch(body: CreateCouponBatchRequest): Observable<CouponBatch> {
    return this.http.post<CouponBatch>(this.base, body);
  }

  listCoupons(batchId: number): Observable<Coupon[]> {
    return this.http.get<Coupon[]>(`${this.base}/${batchId}/coupons`);
  }
}
