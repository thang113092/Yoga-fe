import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { CheckoutQuote, CreateOrderReq, OnlinePaymentResp, OnlineReconciliationRow, OrderResp, PaymentReq, PaymentResp } from './membership.models';

export interface OrderListRow {
  id: string; orderCode: string; branchId: string; branchName: string | null;
  customerId: string; customerName: string | null; customerPhone: string | null; customerEmail: string | null;
  orderDate: string; totalAmount: number; status: string;
}
export interface OrderListResult {
  content: OrderListRow[]; totalElements: number; totalPages: number; number: number;
}

@Injectable({ providedIn: 'root' })
export class PosApi {
  private readonly api = inject(ApiClient);

  listOrders(params: Record<string, string | number>): Observable<OrderListResult> {
    return this.api.get<OrderListResult>('/pos/orders', params);
  }

  getCheckoutQuote(studentId: string, planId: string, branchId: string): Observable<CheckoutQuote> {
    return this.api.get<CheckoutQuote>('/pos/quote', { studentId, planId, branchId });
  }

  cancelPendingOrder(orderId: string): Observable<void> {
    return this.api.post<void>(`/pos/orders/${orderId}/cancel`, {});
  }

  createOrder(req: CreateOrderReq, key: string): Observable<OrderResp> {
    return this.api.post<OrderResp>('/pos/orders', req, { 'Idempotency-Key': key });
  }

  processPayment(req: PaymentReq): Observable<PaymentResp> {
    return this.api.post<PaymentResp>('/pos/payments', req);
  }

  /** Same key, or an order with an open link, returns that link instead of creating another. */
  startOnlinePayment(orderId: string, key: string): Observable<OnlinePaymentResp> {
    return this.api.post<OnlinePaymentResp>(`/pos/orders/${orderId}/online-payments`, {}, { 'Idempotency-Key': key });
  }

  getOnlinePayment(id: string): Observable<OnlinePaymentResp> {
    return this.api.get<OnlinePaymentResp>(`/pos/online-payments/${id}`);
  }

  refreshOnlinePayment(id: string): Observable<OnlinePaymentResp> {
    return this.api.post<OnlinePaymentResp>(`/pos/online-payments/${id}/refresh`, {});
  }

  cancelOnlinePayment(id: string): Observable<OnlinePaymentResp> {
    return this.api.post<OnlinePaymentResp>(`/pos/online-payments/${id}/cancel`, {});
  }

  /** Managers only: money received at the gateway whose order could not be activated. */
  listOnlineReconciliation(branchId?: string): Observable<OnlineReconciliationRow[]> {
    return this.api.get<OnlineReconciliationRow[]>('/pos/online-payments/reconciliation', branchId ? { branchId } : {});
  }

  resolveOnlineReconciliation(id: string, note: string): Observable<void> {
    return this.api.post<void>(`/pos/online-payments/${id}/resolve`, { note });
  }

  getStudentOrders(studentId: string): Observable<import('./membership.models').StudentOrderHistoryResp[]> {
    return this.api.get<import('./membership.models').StudentOrderHistoryResp[]>(`/pos/orders/student/${studentId}`);
  }
}
