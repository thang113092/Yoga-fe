import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { Observable } from 'rxjs';
import { BranchItem, ClassSchedule, ClassTypeItem, CreateClassTypeReq, CreateScheduleReq, InstructorItem, RoomItem, ScheduleAttendee, StudentPassItem } from './schedule.models';

@Injectable({ providedIn: 'root' })
export class ScheduleApi {
  private readonly api = inject(ApiClient);

  getSchedules(branchId?: string, start?: string, end?: string, instructorId?: string): Observable<ClassSchedule[]> {
    const params: Record<string, string | number | boolean> = {};
    if (branchId) params['branchId'] = branchId;
    if (instructorId) params['instructorId'] = instructorId;
    if (start) params['start'] = start;
    if (end) params['end'] = end;

    return this.api.get<ClassSchedule[]>('/schedules', params);
  }

  getScheduleById(id: string): Observable<ClassSchedule> {
    return this.api.get<ClassSchedule>(`/schedules/${id}`);
  }

  createSchedule(req: CreateScheduleReq): Observable<ClassSchedule> {
    return this.api.post<ClassSchedule>('/schedules', req);
  }

  cancelSchedule(id: string): Observable<ClassSchedule> {
    return this.api.put<ClassSchedule>(`/schedules/${id}/cancel`, {});
  }

  getScheduleAttendees(id: string): Observable<ScheduleAttendee[]> {
    return this.api.get<ScheduleAttendee[]>(`/schedules/${id}/attendees`);
  }

  getBranches(): Observable<BranchItem[]> {
    return this.api.get<BranchItem[]>('/branches');
  }

  getRoomsByBranch(branchId: string): Observable<RoomItem[]> {
    return this.api.get<RoomItem[]>(`/branches/${branchId}/rooms`);
  }

  getClassTypes(activeOnly = false): Observable<ClassTypeItem[]> {
    return this.api.get<ClassTypeItem[]>('/class-types', { activeOnly });
  }

  createClassType(req: CreateClassTypeReq): Observable<ClassTypeItem> {
    return this.api.post<ClassTypeItem>('/class-types', req);
  }

  deleteClassType(id: string): Observable<void> {
    return this.api.delete<void>(`/class-types/${id}`);
  }

  getInstructors(branchId?: string): Observable<InstructorItem[]> {
    const params: Record<string, string | number | boolean> = { roleCode: 'INSTRUCTOR' };
    if (branchId) params['branchId'] = branchId;
    return this.api.get<InstructorItem[]>('/users', params);
  }

  getStudentMemberships(studentId: string): Observable<StudentPassItem[]> {
    return this.api.get<StudentPassItem[]>(`/memberships/student/${studentId}`);
  }
}
