import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { CreateOrderReq, OrderResp, PaymentReq, PaymentResp } from './membership.models';

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

  createOrder(req: CreateOrderReq, key: string): Observable<OrderResp> {
    return this.api.post<OrderResp>('/pos/orders', req, { 'Idempotency-Key': key });
  }

  processPayment(req: PaymentReq): Observable<PaymentResp> {
    return this.api.post<PaymentResp>('/pos/payments', req);
  }

  getStudentOrders(studentId: string): Observable<import('./membership.models').StudentOrderHistoryResp[]> {
    return this.api.get<import('./membership.models').StudentOrderHistoryResp[]>(`/pos/orders/student/${studentId}`);
  }
}
