import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { CheckoutQuote, OnlinePaymentResp, OrderResp, SelfServiceOrderReq } from './membership.models';

/** A student buying or renewing their own membership online (`/me/...`). */
@Injectable({ providedIn: 'root' })
export class SelfCheckoutApi {
  private readonly api = inject(ApiClient);

  getQuote(planId: string, branchId: string): Observable<CheckoutQuote> {
    return this.api.get<CheckoutQuote>('/me/checkout/quote', { planId, branchId });
  }

  createOrder(req: SelfServiceOrderReq, key: string): Observable<OrderResp> {
    return this.api.post<OrderResp>('/me/orders', req, { 'Idempotency-Key': key });
  }

  /** Also closes the order's open payment link, so a cancelled order cannot be paid. */
  cancelOrder(orderId: string): Observable<void> {
    return this.api.post<void>(`/me/orders/${orderId}/cancel`, {});
  }

  /** Same key, or an order with an open link, returns that link instead of creating another. */
  startOnlinePayment(orderId: string, key: string): Observable<OnlinePaymentResp> {
    return this.api.post<OnlinePaymentResp>(`/me/orders/${orderId}/online-payments`, {}, { 'Idempotency-Key': key });
  }

  getOnlinePayment(id: string): Observable<OnlinePaymentResp> {
    return this.api.get<OnlinePaymentResp>(`/me/online-payments/${id}`);
  }

  refreshOnlinePayment(id: string): Observable<OnlinePaymentResp> {
    return this.api.post<OnlinePaymentResp>(`/me/online-payments/${id}/refresh`, {});
  }

  cancelOnlinePayment(id: string): Observable<OnlinePaymentResp> {
    return this.api.post<OnlinePaymentResp>(`/me/online-payments/${id}/cancel`, {});
  }
}
