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

  describe('hybrid classes', () => {
    const hybrid = (over: any = {}) => ({ id: 'hy', branchId: 'b1', deliveryMode: 'HYBRID', startTime: '2026-10-10T10:00:00Z', endTime: '2026-10-10T11:00:00Z',
      maxCapacity: 20, bookedCount: 3, availableSlots: 17, onlineCapacity: 30, onlineBookedCount: 5, status: 'SCHEDULED', ...over } as any);
    const studioPass = { id: 'studio', status: 'ACTIVE', remainingSessions: 5, isAllBranches: false, registeredBranchId: 'b1' } as any;

    it('sends the chosen seat type when booking a hybrid class', () => {
      const page = TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
      page.studentPasses.set([studioPass]);
      page.openBookingModal(hybrid());
      expect(page.bookingSeatChoices().map(c => [c.mode, c.disabled])).toEqual([['IN_PERSON', false], ['ONLINE', false]]);
      expect(page.selectedAttendanceMode()).toBe('IN_PERSON');
      page.selectSeat(page.bookingSeatChoices()[1]);
      page.submitBooking();
      expect(createBooking.mock.calls[0][0]).toEqual({ scheduleId: 'hy', studentId: 'student-actual', membershipId: 'studio', attendanceMode: 'ONLINE' });
    });

    it('disables a full seat type and defaults to the free one', () => {
      const page = TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
      page.studentPasses.set([studioPass]);
      const full = hybrid({ bookedCount: 20, availableSlots: 0 });
      expect(page.hasBookableSeat(full)).toBe(true);
      page.openBookingModal(full);
      const studio = page.bookingSeatChoices()[0];
      expect(studio.full).toBe(true);
      expect(studio.disabled).toBe(true);
      expect(page.selectedAttendanceMode()).toBe('ONLINE');
      page.selectSeat(studio);
      expect(page.selectedAttendanceMode()).toBe('ONLINE');
      // Waitlist is only for the full seat type.
      page.closeBookingModal();
      page.openWaitlistModal(full);
      expect(page.waitlistSeatChoices().map(c => c.disabled)).toEqual([false, true]);
      expect(page.selectedAttendanceMode()).toBe('IN_PERSON');
    });

    it('offers the waitlist when every seat the pass may take is full', () => {
      const page = TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
      page.studentPasses.set([{ ...studioPass, accessScope: 'ONLINE' }]);
      expect(page.hasBookableSeat(hybrid({ onlineBookedCount: 30 }))).toBe(false);
      expect(page.hasBookableSeat(hybrid())).toBe(true);
    });

    it('forces an online pass to an online seat', () => {
      const page = TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
      page.studentPasses.set([{ ...studioPass, id: 'online', accessScope: 'ONLINE' }]);
      expect(page.canBookSchedule(hybrid())).toBe(true);
      page.openBookingModal(hybrid());
      const [studio, online] = page.bookingSeatChoices();
      expect(studio.allowed).toBe(false);
      expect(studio.disabled).toBe(true);
      expect(online.disabled).toBe(false);
      expect(page.selectedAttendanceMode()).toBe('ONLINE');
      page.submitBooking();
      expect(createBooking.mock.calls[0][0].attendanceMode).toBe('ONLINE');
    });

    it('lets a single-branch pass of another branch take only an online seat', () => {
      const page = TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
      page.studentPasses.set([{ ...studioPass, registeredBranchId: 'b2' }]);
      expect(page.eligiblePasses(hybrid()).map(p => p.id)).toEqual(['studio']);
      expect(page.passSeats(hybrid(), page.studentPasses()[0])).toEqual(['ONLINE']);
      expect(page.canBookSchedule({ ...hybrid(), deliveryMode: 'IN_PERSON' })).toBe(false);
      page.studentPasses.set([{ ...studioPass, registeredBranchId: 'b2', isAllBranches: true }]);
      expect(page.passSeats(hybrid(), page.studentPasses()[0])).toEqual(['IN_PERSON', 'ONLINE']);
    });

    it('shows the join button only for the online seat of a hybrid class', () => {
      const page = TestBed.createComponent(ScheduleCalendarComponent).componentInstance;
      const b = { id: 'bk', status: 'CONFIRMED', deliveryMode: 'HYBRID', startTime: '2026-11-04T12:00:00Z', endTime: '2026-11-04T13:00:00Z' } as any;
      page.now.set(Date.parse('2026-11-04T12:05:00Z'));
      expect(page.canJoinOnline({ ...b, attendanceMode: 'ONLINE' })).toBe(true);
      expect(page.canJoinOnline({ ...b, attendanceMode: 'IN_PERSON' })).toBe(false);
      expect(page.canJoinOnline(b)).toBe(false);
      expect(page.canJoinOnline({ ...b, deliveryMode: 'ONLINE' })).toBe(true);
    });

    it('renders the hybrid label, both availabilities and the seat choice', async () => {
      Object.assign(TestBed.inject(AuthService), { canManageClasses: () => false });
      const fixture = TestBed.createComponent(ScheduleCalendarComponent);
      const page = fixture.componentInstance;
      fixture.detectChanges(); await fixture.whenStable();
      page.studentPasses.set([studioPass]);
      page.schedules.set([hybrid({ startTime: '2099-10-10T10:00:00Z', endTime: '2099-10-10T11:00:00Z', className: 'Hatha', instructorName: 'Lan', roomName: 'Studio' })]);
      fixture.detectChanges(); await fixture.whenStable();
      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Hybrid');
      expect(text.replace(/\s+/g, ' ')).toContain('Tại phòng 3/20 · Online 5/30');
      page.openBookingModal(page.schedules()[0]);
      fixture.detectChanges(); await fixture.whenStable();
      const seats = document.querySelectorAll('.seat-option');
      expect(seats.length).toBe(2);
      expect(document.body.textContent).toContain('Học tại phòng');
      expect(document.body.textContent).toContain('Học online');
    });
  });
});