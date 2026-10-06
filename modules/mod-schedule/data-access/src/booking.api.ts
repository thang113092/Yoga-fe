import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { Booking, CreateBookingReq, StudentBookingDetail } from './schedule.models';

@Injectable({ providedIn: 'root' })
export class BookingApi {
  private readonly api = inject(ApiClient);

  createBooking(req: CreateBookingReq): Observable<Booking> {
    return this.api.post<Booking>('/bookings', req);
  }

  cancelBooking(id: string, reason?: string): Observable<Booking> {
    return this.api.post<Booking>(`/bookings/${id}/cancel`, { reason });
  }

  getStudentBookings(studentId: string): Observable<Booking[]> {
    return this.api.get<Booking[]>(`/bookings/student/${studentId}`);
  }

  getStudentBookingDetails(studentId: string): Observable<StudentBookingDetail[]> {
    return this.api.get<StudentBookingDetail[]>(`/bookings/student/${studentId}/details`);
  }
}
