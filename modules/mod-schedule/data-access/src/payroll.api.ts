import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';

/** Delivery mode of a payroll line, as returned by the backend. */
export type PayrollDeliveryMode = 'IN_PERSON' | 'ONLINE' | 'HYBRID';

export interface PayRatePolicy {
  id: string;
  instructorId: string;
  instructorName: string;
  branchId: string | null;
  branchName: string | null;
  basePayPerClass: number;
  /** Null means online sessions are paid at the studio rate. */
  onlinePayPerClass: number | null;
  headcountBonusPerStudent: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  active: boolean;
}

export interface SavePayRatePolicyReq {
  instructorId: string;
  branchId?: string | null;
  basePayPerClass: number;
  onlinePayPerClass?: number | null;
  headcountBonusPerStudent?: number | null;
  effectiveFrom?: string; // YYYY-MM-DD
}

export interface PayrollLine {
  scheduleId: string;
  startTime: string;
  deliveryMode: PayrollDeliveryMode | string;
  className: string;
  branchId: string | null;
  attended: number;
  onlineAttended: number;
  /** Null when no rate policy covers the session. */
  sessionRate: number | null;
  bonusPerStudent: number | null;
  lineTotal: number | null;
}

export interface InstructorPay {
  instructorId: string;
  instructorName: string;
  studioSessions: number;
  onlineSessions: number;
  hybridSessions: number;
  attended: number;
  onlineAttended: number;
  unpricedSessions: number;
  total: number;
  lines: PayrollLine[];
}

export interface PayrollPreview {
  year: number;
  month: number;
  branchId: string | null;
  instructors: InstructorPay[];
  total: number;
  unpricedSessions: number;
}

export interface PayrollPreviewQuery {
  year: number;
  month: number;
  branchId?: string;
  instructorId?: string;
}

/** Instructor pay: rate policies (studio / online) and the monthly payroll preview. */
@Injectable({ providedIn: 'root' })
export class PayrollApi {
  private readonly api = inject(ApiClient);

  getPolicies(instructorId?: string): Observable<PayRatePolicy[]> {
    return this.api.get<PayRatePolicy[]>('/payroll/rate-policies', instructorId ? { instructorId } : undefined);
  }

  createPolicy(req: SavePayRatePolicyReq): Observable<PayRatePolicy> {
    return this.api.post<PayRatePolicy>('/payroll/rate-policies', req);
  }

  deactivatePolicy(id: string): Observable<void> {
    return this.api.post<void>(`/payroll/rate-policies/${id}/deactivate`, {});
  }

  getPreview(query: PayrollPreviewQuery): Observable<PayrollPreview> {
    const params: Record<string, string | number> = { year: query.year, month: query.month };
    if (query.branchId) params['branchId'] = query.branchId;
    if (query.instructorId) params['instructorId'] = query.instructorId;
    return this.api.get<PayrollPreview>('/payroll/preview', params);
  }
}
