import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { RevenueFilterReq, RevenueReportResponse } from './revenue.models';

@Injectable({ providedIn: 'root' })
export class RevenueApi {
  private readonly api = inject(ApiClient);

  getRevenueReport(filter: RevenueFilterReq = {}): Observable<RevenueReportResponse> {
    const params: Record<string, string> = {};
    if (filter.startDate) params['startDate'] = filter.startDate;
    if (filter.endDate) params['endDate'] = filter.endDate;
    if (filter.branchId) params['branchId'] = filter.branchId;
    if (filter.paymentMethod && filter.paymentMethod !== 'ALL') params['paymentMethod'] = filter.paymentMethod;

    return this.api.get<RevenueReportResponse>('/revenue/report', params);
  }
}
