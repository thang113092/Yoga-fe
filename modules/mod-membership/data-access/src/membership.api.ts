import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { CreatePlanReq, MembershipPlan, MembershipResp, UpdatePlanReq } from './membership.models';

@Injectable({ providedIn: 'root' })
export class MembershipApi {
  private readonly api = inject(ApiClient);

  getActivePlans(): Observable<MembershipPlan[]> {
    return this.api.get<MembershipPlan[]>('/membership-plans');
  }

  getAllPlans(all = true): Observable<MembershipPlan[]> {
    return this.api.get<MembershipPlan[]>('/membership-plans', { all });
  }

  getPlanById(id: string): Observable<MembershipPlan> {
    return this.api.get<MembershipPlan>(`/membership-plans/${id}`);
  }

  createPlan(req: CreatePlanReq): Observable<MembershipPlan> {
    return this.api.post<MembershipPlan>('/membership-plans', req);
  }

  updatePlan(id: string, req: UpdatePlanReq): Observable<MembershipPlan> {
    return this.api.put<MembershipPlan>(`/membership-plans/${id}`, req);
  }

  deletePlan(id: string): Observable<void> {
    return this.api.delete<void>(`/membership-plans/${id}`);
  }

  getStudentMemberships(studentId: string): Observable<MembershipResp[]> {
    return this.api.get<MembershipResp[]>(`/memberships/student/${studentId}`);
  }

  getMembershipByCode(code: string): Observable<MembershipResp> {
    return this.api.get<MembershipResp>(`/memberships/code/${code}`);
  }
}
