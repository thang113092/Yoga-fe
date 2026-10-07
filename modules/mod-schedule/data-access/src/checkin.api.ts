import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { CheckInReq, CheckInResp } from './schedule.models';

@Injectable({ providedIn: 'root' })
export class CheckInApi {
  private readonly api = inject(ApiClient);

  processCheckIn(req: CheckInReq): Observable<CheckInResp> {
    return this.api.post<CheckInResp>('/check-in', req);
  }

  revertCheckIn(bookingId: string): Observable<void> {
    return this.api.post<void>(`/check-in/revert/${bookingId}`, {});
  }
}
