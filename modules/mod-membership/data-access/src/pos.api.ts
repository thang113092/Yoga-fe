import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { CreateOrderReq, OrderResp, PaymentReq, PaymentResp } from './membership.models';

@Injectable({ providedIn: 'root' })
export class PosApi {
  private readonly api = inject(ApiClient);

  createOrder(req: CreateOrderReq, key: string): Observable<OrderResp> {
    return this.api.post<OrderResp>('/pos/orders', req, { 'Idempotency-Key': key });
  }

  processPayment(req: PaymentReq): Observable<PaymentResp> {
    return this.api.post<PaymentResp>('/pos/payments', req);
  }
}
