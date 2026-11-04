import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { OnlineJoinResp, OnlineSessionInfo } from './schedule.models';

/** Online (Zoom) classes: student join link and the instructor/staff room status. */
@Injectable({ providedIn: 'root' })
export class OnlineClassApi {
  private readonly api = inject(ApiClient);

  /** Records the student's attendance and returns their personal join link. */
  join(bookingId: string): Observable<OnlineJoinResp> {
    return this.api.post<OnlineJoinResp>(`/me/bookings/${bookingId}/online-join`, {});
  }

  getSession(scheduleId: string): Observable<OnlineSessionInfo> {
    return this.api.get<OnlineSessionInfo>(`/online-sessions/${scheduleId}`);
  }

  resync(scheduleId: string): Observable<OnlineSessionInfo> {
    return this.api.post<OnlineSessionInfo>(`/online-sessions/${scheduleId}/sync`, {});
  }
}
