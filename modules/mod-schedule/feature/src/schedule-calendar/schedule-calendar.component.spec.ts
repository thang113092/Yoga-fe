import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ScheduleApi, BookingApi, WaitlistApi } from '@yoga/mod-schedule/data-access';
import { ScheduleCalendarComponent } from './schedule-calendar.component';
describe('Calendar',()=>{
  let getSchedules:ReturnType<typeof vi.fn>; const createBooking=vi.fn();
  beforeEach(()=>{ getSchedules=vi.fn().mockReturnValue(of([]));createBooking.mockReset().mockReturnValue(of({bookingCode:'BK-real',matNumber:2}));TestBed.configureTestingModule({imports:[ScheduleCalendarComponent],providers:[provideExperimentalZonelessChangeDetection(),provideRouter([]),{provide:AuthService,useValue:{ currentUserId: () => 'student-actual', isStudent: () => true, isSuperAdmin: () => false, isAuthenticated: () => true, userRole: () => 'STUDENT', userFullName: () => 'Học viên thực', profile: () => ({ phone: '0901234567' }), branchIds: () => ['b-actual'], canAccessPos: () => false, canAccessCheckIn: () => false, canManageUsers: () => false, logout: vi.fn() }},{provide:ScheduleApi,useValue:{getSchedules,getBranches:()=>of([{id:'b-actual'}]),getStudentMemberships:()=>of([])}},{provide:BookingApi,useValue:{createBooking,getStudentBookingDetails:()=>of([])}},{provide:WaitlistApi,useValue:{getStudentWaitlists:()=>of([])}}]});});
  it('ignores an older response after changing branch',()=>{const first=new Subject<any[]>(); const second=new Subject<any[]>();getSchedules.mockReturnValueOnce(first).mockReturnValueOnce(second);const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;page.selectedBranch.set('a');page.loadSchedules();page.selectedBranch.set('b');page.loadSchedules();second.next([{id:'b'}]);first.next([{id:'a'}]);expect(page.schedules()[0].id).toBe('b');});
  it('submits the current student and lets the server allocate a mat',()=>{const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;page.bookingModalSchedule.set({id:'schedule'} as any);page.selectedPassId.set('membership');page.submitBooking();expect(createBooking.mock.calls[0][0]).toEqual({scheduleId:'schedule',studentId:'student-actual',membershipId:'membership'});});
});