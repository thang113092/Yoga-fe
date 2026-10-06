import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { StudentWaitlistResp, WaitlistJoinReq, WaitlistResp } from './schedule.models';

@Injectable({ providedIn: 'root' })
export class WaitlistApi {
  private readonly api = inject(ApiClient);

  joinWaitlist(req: WaitlistJoinReq): Observable<WaitlistResp> {
    return this.api.post<WaitlistResp>('/waitlists', req);
  }

  cancelWaitlist(id: string, studentId: string): Observable<WaitlistResp> {
    return this.api.post<WaitlistResp>(`/waitlists/${id}/cancel?studentId=${studentId}`, {});
  }

  getStudentWaitlists(studentId: string): Observable<StudentWaitlistResp[]> {
    return this.api.get<StudentWaitlistResp[]>(`/waitlists/student/${studentId}`);
  }

  getWaitingCount(scheduleId: string): Observable<number> {
    return this.api.get<number>(`/waitlists/schedule/${scheduleId}/count`);
  }
}
