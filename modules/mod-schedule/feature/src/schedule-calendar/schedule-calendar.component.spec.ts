import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ScheduleApi, BookingApi, WaitlistApi, OnlineClassApi } from '@yoga/mod-schedule/data-access';
import { ScheduleCalendarComponent } from './schedule-calendar.component';
describe('Calendar',()=>{
  let getSchedules:ReturnType<typeof vi.fn>; const createBooking=vi.fn(); const join=vi.fn();
  beforeEach(()=>{ join.mockReset(); getSchedules=vi.fn().mockReturnValue(of([]));createBooking.mockReset().mockReturnValue(of({bookingCode:'BK-real',matNumber:2}));TestBed.configureTestingModule({imports:[ScheduleCalendarComponent],providers:[provideExperimentalZonelessChangeDetection(),provideRouter([]),{provide:AuthService,useValue:{ currentUserId: () => 'student-actual', isStudent: () => true, isSuperAdmin: () => false, isAuthenticated: () => true, userRole: () => 'STUDENT', userFullName: () => 'Học viên thực', profile: () => ({ phone: '0901234567' }), branchIds: () => ['b-actual'], canAccessPos: () => false, canAccessCheckIn: () => false, canManageUsers: () => false, logout: vi.fn() }},{provide:ScheduleApi,useValue:{getSchedules,getBranches:()=>of([{id:'b-actual'}]),getStudentMemberships:()=>of([])}},{provide:BookingApi,useValue:{createBooking,getStudentBookingDetails:()=>of([])}},{provide:WaitlistApi,useValue:{getStudentWaitlists:()=>of([])}},{provide:OnlineClassApi,useValue:{join}}]});});
  it('ignores an older response after changing branch',()=>{const first=new Subject<any[]>(); const second=new Subject<any[]>();getSchedules.mockReturnValueOnce(first).mockReturnValueOnce(second);const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;page.selectedBranch.set('a');page.loadSchedules();page.selectedBranch.set('b');page.loadSchedules();second.next([{id:'b'}]);first.next([{id:'a'}]);expect(page.schedules()[0].id).toBe('b');});
  it('submits the current student and lets the server allocate a mat',()=>{
    const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
    page.studentPasses.set([{id:'membership',status:'ACTIVE',remainingSessions:5,isAllBranches:true} as any]);
    page.bookingModalSchedule.set({id:'schedule',startTime:'2026-10-10T10:00:00'} as any);
    page.selectedPassId.set('membership');
    page.submitBooking();
    expect(createBooking.mock.calls[0][0]).toEqual({scheduleId:'schedule',studentId:'student-actual',membershipId:'membership'});
  });
  it('blocks booking when student has single branch pass for different branch',()=>{
    const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
    page.studentPasses.set([{id:'p1',status:'ACTIVE',remainingSessions:5,isAllBranches:false,registeredBranchId:'b-branch-1'} as any]);
    const diffBranchSchedule = {id:'sch-diff',branchId:'b-branch-2',startTime:'2026-10-10T10:00:00'} as any;
    expect(page.canBookSchedule(diffBranchSchedule)).toBe(false);
    expect(page.isDifferentBranchOnly(diffBranchSchedule)).toBe(true);
    page.bookingModalSchedule.set(diffBranchSchedule);
    page.selectedPassId.set('p1');
    page.submitBooking();
    expect(createBooking).not.toHaveBeenCalled();
  });
  it('provides "Tất cả cơ sở" as the default first branch option and fetches all branches schedules',()=>{const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;page.branches.set([{id:'b1',name:'Cơ sở 1'} as any]);expect(page.branchOptions()[0]).toEqual({id:'',name:'Tất cả cơ sở'});page.onBranchChange('');expect(getSchedules).toHaveBeenCalledWith(undefined);});
  it('lets a single-branch pass book an online class of the virtual branch',()=>{
    const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
    page.studentPasses.set([{id:'p1',status:'ACTIVE',remainingSessions:5,isAllBranches:false,registeredBranchId:'b-branch-1'} as any]);
    expect(page.canBookSchedule({id:'on',branchId:'b-online',deliveryMode:'ONLINE',startTime:'2026-10-10T10:00:00'} as any)).toBe(true);
  });
  it('keeps an online pass for online classes only',()=>{
    const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
    page.studentPasses.set([{id:'p1',status:'ACTIVE',remainingSessions:5,isAllBranches:true,accessScope:'ONLINE',registeredBranchId:'b1'} as any]);
    expect(page.canBookSchedule({id:'on',branchId:'b2',deliveryMode:'ONLINE',startTime:'2026-10-10T10:00:00'} as any)).toBe(true);
    expect(page.canBookSchedule({id:'st',branchId:'b1',deliveryMode:'IN_PERSON',startTime:'2026-10-10T10:00:00'} as any)).toBe(false);
  });
  it('opens the join button 15 minutes before an online class until it ends',()=>{
    const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
    const start=Date.parse('2026-11-04T12:00:00Z');
    const b={id:'bk',status:'CONFIRMED',deliveryMode:'ONLINE',startTime:'2026-11-04T12:00:00Z',endTime:'2026-11-04T13:00:00Z'} as any;
    page.now.set(start-16*60_000); expect(page.canJoinOnline(b)).toBe(false);
    page.now.set(start-15*60_000); expect(page.canJoinOnline(b)).toBe(true);
    page.now.set(start+59*60_000); expect(page.canJoinOnline({...b,status:'ATTENDED'})).toBe(true);
    page.now.set(start+60*60_000); expect(page.canJoinOnline(b)).toBe(false);
    page.now.set(start); expect(page.canJoinOnline({...b,deliveryMode:'IN_PERSON'})).toBe(false);
    expect(page.canJoinOnline({...b,status:'CANCELLED'})).toBe(false);
  });
  it('sends the student to their personal Zoom link in the tab opened on click',()=>{
    const tab={location:{href:''},opener:{},close:vi.fn()};
    const open=vi.spyOn(window,'open').mockReturnValue(tab as any);
    join.mockReturnValue(of({joinUrl:'https://zoom.us/w/1?tk=a'}));
    const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
    page.joinOnline({id:'bk',className:'Hatha',status:'CONFIRMED'} as any);
    expect(join).toHaveBeenCalledWith('bk');
    expect(tab.location.href).toBe('https://zoom.us/w/1?tk=a');
    expect(tab.opener).toBeNull();
    expect(page.joiningBookingId()).toBeNull();
    open.mockRestore();
  });
  it('closes the blank tab when joining is refused',()=>{
    const tab={location:{href:''},opener:{},close:vi.fn()};
    const open=vi.spyOn(window,'open').mockReturnValue(tab as any);
    join.mockReturnValue(throwError(()=>({error:{message:'Chưa đến giờ vào lớp'}})));
    const page=TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
    page.joinOnline({id:'bk',className:'Hatha',status:'CONFIRMED'} as any);
    expect(tab.close).toHaveBeenCalled();
    expect(tab.location.href).toBe('');
    open.mockRestore();
  });
});