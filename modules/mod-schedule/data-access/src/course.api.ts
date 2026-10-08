import { inject, Injectable } from '@angular/core';
import { ApiClient } from '@yoga/platform/api';
import { ClassTypeItem } from './schedule.models';

export interface ProgramSession { title: string; content: string; durationMinutes: number; }

export interface Course {
  id: string; code: string; name: string; description: string; classTypeId: string;
  totalSessions: number; defaultDurationMinutes: number; defaultFee: number; sessions?: ProgramSession[];
}
export interface CourseSession {
  id?: string; sessionNumber?: number; roomId: string; instructorId: string; startTime: string; endTime: string;
  plannedContent?: string; plannedDurationMinutes?: number; title?: string; sessionTitle?: string; roomName?: string; instructorName?: string; status?: string;
  bookingId?: string; bookingCode?: string; attendanceState?: string;
}
export interface CourseClass {
  id: string; courseId: string; code: string; name: string; courseName: string; description: string;
  branchId: string; branchName: string; plannedSessions: number; maxCapacity: number; tuitionFee: number;
  status: string; startTime: string; endTime: string; enrolledCount: number; heldSessions: number; sessions: CourseSession[];
}
export interface CourseEnrollment {
  id: string; enrollmentCode: string; courseClassId: string; studentId: string; studentName: string; studentPhone: string;
  className: string; classCode: string; courseName: string; branchName: string; status: string;
  orderId: string; paymentStatus: string; totalAmount: number; reservedUntil: string;
  plannedSessions: number; attendedSessions: number; heldSessions: number; startTime: string; endTime: string;
  sessions: CourseSession[];
}
export interface CreateCourseClass {
  courseId: string; branchId: string; code: string; name: string; maxCapacity: number; tuitionFee: number; sessions: CourseSession[];
}
export interface CourseConflict { sessionNumber: number; message: string; }
export interface CourseStudent { id: string; fullName: string; phone: string; }

@Injectable({ providedIn: 'root' })
export class CourseApi {
  private readonly api = inject(ApiClient);
  courses() { return this.api.get<Course[]>('/courses'); }
  createCourse(req: Omit<Course, 'id'>) { return this.api.post<Course>('/courses', req); }
  classes(branchId?: string) { return this.api.get<CourseClass[]>('/course-classes', branchId ? { branchId } : {}); }
  detail(id: string) { return this.api.get<CourseClass>(`/course-classes/${id}`); }
  preview(req: CreateCourseClass) { return this.api.post<CourseConflict[]>('/course-classes/preview', req); }
  createClass(req: CreateCourseClass) { return this.api.post<CourseClass>('/course-classes', req); }
  enroll(id: string, studentId: string) { return this.api.post<CourseEnrollment>(`/course-classes/${id}/enrollments`, { studentId }); }
  roster(id: string) { return this.api.get<CourseEnrollment[]>(`/course-classes/${id}/enrollments`); }
  mine() { return this.api.get<CourseEnrollment[]>('/me/course-enrollments'); }
  enrollment(id: string) { return this.api.get<CourseEnrollment>(`/course-enrollments/${id}`); }
  students(branchId: string) { return this.api.get<CourseStudent[]>('/users', { roleCode: 'STUDENT', branchId }); }
  changeSession(classId: string, id: string, req: CourseSession) { return this.api.put<void>(`/course-classes/${classId}/sessions/${id}`, req); }
  classTypes() { return this.api.get<ClassTypeItem[]>('/class-types', { activeOnly: true }); }
}
