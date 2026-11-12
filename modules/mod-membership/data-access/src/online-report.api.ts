import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { OnlineReport, OnlineReportFilter } from './online-report.models';

/** Online learning report: live online classes, online plans/courses and the video library. */
@Injectable({ providedIn: 'root' })
export class OnlineReportApi {
  private readonly api = inject(ApiClient);

  getReport(filter: OnlineReportFilter = {}): Observable<OnlineReport> {
    const params: Record<string, string> = {};
    if (filter.startDate) params['startDate'] = filter.startDate;
    if (filter.endDate) params['endDate'] = filter.endDate;
    if (filter.branchId) params['branchId'] = filter.branchId;
    return this.api.get<OnlineReport>('/reports/online', params);
  }
}
