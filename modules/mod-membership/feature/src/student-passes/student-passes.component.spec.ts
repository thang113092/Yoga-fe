import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { MembershipApi } from '@yoga/mod-membership/data-access';
import { BookingApi, WaitlistApi } from '@yoga/mod-schedule/data-access';
import { StudentPassesComponent } from './student-passes.component';
describe('Student portal', () => {
  const getPasses=vi.fn(); const getBookings=vi.fn();
  beforeEach(() => { getPasses.mockReset().mockReturnValue(of([])); getBookings.mockReset().mockReturnValue(of([])); TestBed.configureTestingModule({imports:[StudentPassesComponent],providers:[provideExperimentalZonelessChangeDetection(),provideRouter([]),{provide:AuthService,useValue:{ currentUserId: () => 'student-actual', isStudent: () => true, isSuperAdmin: () => false, isAuthenticated: () => true, userRole: () => 'STUDENT', userFullName: () => 'Học viên thực', profile: () => ({ phone: '0901234567' }), branchIds: () => ['b-actual'], canAccessPos: () => false, canAccessCheckIn: () => false, canManageUsers: () => false, logout: vi.fn() }},{provide:MembershipApi,useValue:{getStudentMemberships:getPasses}},{provide:BookingApi,useValue:{getStudentBookingDetails:getBookings}},{provide:WaitlistApi,useValue:{getStudentWaitlists:()=>of([])}}]}); });
  it('loads the logged-in student rather than the seed account', () => { const fixture=TestBed.createComponent(StudentPassesComponent); fixture.detectChanges(); expect(getPasses).toHaveBeenCalledWith('student-actual'); expect(getBookings).toHaveBeenCalledWith('student-actual'); expect(fixture.nativeElement.textContent).not.toContain('Vũ Hoàng An'); });
  it('selects the nearest future class rather than the most recently created booking', () => { const component=TestBed.createComponent(StudentPassesComponent).componentInstance; const booking=(hours:number)=>({id:String(hours),status:'CONFIRMED',startTime:new Date(Date.now()+hours*3600000).toISOString()}); component['bookings'].set([booking(10),booking(-1),booking(2)] as any); expect(component['nextBooking']()?.id).toBe('2'); });
  it('shows a load error instead of claiming no passes exist', () => { getPasses.mockReturnValue(throwError(()=>({status:0}))); const fixture=TestBed.createComponent(StudentPassesComponent); fixture.detectChanges(); expect(fixture.componentInstance['errorMessage']()).toBeTruthy(); });
});