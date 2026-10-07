import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { MembershipApi, PosApi } from '@yoga/mod-membership/data-access';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { BookingApi, WaitlistApi } from '@yoga/mod-schedule/data-access';
import { StudentPassesComponent } from './student-passes.component';

describe('Student portal', () => {
  const getPasses = vi.fn();
  const getBookings = vi.fn();
  const getOrders = vi.fn();
  const getWorkoutHistory = vi.fn();

  beforeEach(() => {
    getPasses.mockReset().mockReturnValue(of([]));
    getBookings.mockReset().mockReturnValue(of([]));
    getOrders.mockReset().mockReturnValue(of([]));
    getWorkoutHistory.mockReset().mockReturnValue(of([]));

    TestBed.configureTestingModule({
      imports: [StudentPassesComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUserId: () => 'student-actual',
            isStudent: () => true,
            isSuperAdmin: () => false,
            isAuthenticated: () => true,
            userRole: () => 'STUDENT',
            userFullName: () => 'Học viên thực',
            profile: () => ({ phone: '0901234567' }),
            branchIds: () => ['b-actual'],
            canAccessPos: () => false,
            canAccessCheckIn: () => false,
            canManageUsers: () => false,
            logout: vi.fn(),
          },
        },
        { provide: MembershipApi, useValue: { getStudentMemberships: getPasses } },
        { provide: BookingApi, useValue: { getStudentBookingDetails: getBookings, getStudentWorkoutHistory: getWorkoutHistory } },
        { provide: WaitlistApi, useValue: { getStudentWaitlists: () => of([]) } },
        { provide: PosApi, useValue: { getStudentOrders: getOrders } },
        { provide: BranchApi, useValue: { getAll: () => of([]) } },
      ],
    });
  });

  it('loads the logged-in student rather than the seed account', () => {
    const fixture = TestBed.createComponent(StudentPassesComponent);
    fixture.detectChanges();
    expect(getPasses).toHaveBeenCalledWith('student-actual');
    expect(getBookings).toHaveBeenCalledWith('student-actual');
    expect(fixture.nativeElement.textContent).not.toContain('Vũ Hoàng An');
  });

  it('selects the nearest future class rather than the most recently created booking', () => {
    const component = TestBed.createComponent(StudentPassesComponent).componentInstance;
    const booking = (hours: number) => ({
      id: String(hours),
      status: 'CONFIRMED',
      startTime: new Date(Date.now() + hours * 3600000).toISOString(),
    });
    component['bookings'].set([booking(10), booking(-1), booking(2)] as any);
    expect(component['nextBooking']()?.id).toBe('2');
  });

  it('shows a load error instead of claiming no passes exist', () => {
    getPasses.mockReturnValue(throwError(() => ({ status: 0 })));
    const fixture = TestBed.createComponent(StudentPassesComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance['errorMessage']()).toBeTruthy();
  });

  it('places active pass at top and replaced/past pass in purchase history below', () => {
    const activePass = {
      id: 'pass-active',
      membershipCode: 'MB-ACTIVE-001',
      studentId: 'student-actual',
      status: 'ACTIVE',
      isAllBranches: true,
      remainingSessions: 30,
      totalSessions: 30,
      startDate: '2026-10-07',
      endDate: '2027-04-04',
      purchasedPrice: 3000000,
    };
    const replacedPass = {
      id: 'pass-old',
      membershipCode: 'MB-REPLACED-002',
      studentId: 'student-actual',
      status: 'REPLACED',
      isAllBranches: false,
      remainingSessions: null,
      totalSessions: null,
      startDate: '2026-05-01',
      endDate: '2026-11-05',
      purchasedPrice: 2000000,
    };

    getPasses.mockReturnValue(of([replacedPass, activePass]));
    const fixture = TestBed.createComponent(StudentPassesComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp['activePasses']().map(p => p.membershipCode)).toEqual(['MB-ACTIVE-001']);
    expect(comp['pastPasses']().map(p => p.membershipCode)).toEqual(['MB-REPLACED-002']);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Thẻ đang hoạt động');
    expect(text).toContain('Lịch sử mua thẻ');
    expect(text).toContain('MB-ACTIVE-001');
    expect(text).toContain('MB-REPLACED-002');
  });

  it('displays the registered branch name for single-branch active pass', () => {
    const singleBranchPass = {
      id: 'pass-single',
      membershipCode: 'MB-CAUGIAY-001',
      studentId: 'student-actual',
      status: 'ACTIVE',
      registeredBranchId: 'branch-cg',
      isAllBranches: false,
      remainingSessions: 12,
      totalSessions: 12,
      startDate: '2026-10-07',
      endDate: '2027-01-07',
      purchasedPrice: 1500000,
    };
    getPasses.mockReturnValue(of([singleBranchPass]));
    const fixture = TestBed.createComponent(StudentPassesComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;
    comp['branches'].set([
      { id: 'branch-cg', code: 'CG', name: 'Chi nhánh Cầu Giấy', address: '123 Cầu Giấy', phone: '0987654321', active: true },
    ]);
    fixture.detectChanges();

    expect(comp.getBranchName('branch-cg')).toBe('Chi nhánh Cầu Giấy');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Chi nhánh Cầu Giấy');
  });

  it('loads and renders workout history tab with stats and session list', () => {
    const workoutItems = [
      {
        bookingId: 'b-1',
        bookingCode: 'BK-001',
        scheduleId: 's-1',
        className: 'Hatha Yoga Căn Bản',
        intensityLevel: 'BEGINNER',
        instructorName: 'Phạm Mỹ Linh',
        roomName: 'Studio Lotus',
        branchName: 'Cơ sở Quận 1',
        startTime: '2026-10-06T18:00:00Z',
        endTime: '2026-10-06T19:00:00Z',
        durationMinutes: 60,
        matNumber: 8,
        status: 'ATTENDED',
        checkedInAt: '2026-10-06T17:50:00Z',
        checkInMethod: 'QR_SCAN',
        attendanceStatus: 'PRESENT',
        membershipCode: 'MB-ALL-001',
      },
      {
        bookingId: 'b-2',
        bookingCode: 'BK-002',
        scheduleId: 's-2',
        className: 'Vinyasa Flow',
        intensityLevel: 'INTERMEDIATE',
        instructorName: 'Nguyễn Văn A',
        roomName: 'Studio Zen',
        branchName: 'Cơ sở Cầu Giấy',
        startTime: '2026-10-04T07:00:00Z',
        endTime: '2026-10-04T08:15:00Z',
        durationMinutes: 75,
        matNumber: 3,
        status: 'ATTENDED',
        checkedInAt: '2026-10-04T06:55:00Z',
        checkInMethod: 'QR_SCAN',
        attendanceStatus: 'PRESENT',
        membershipCode: 'MB-ALL-001',
      },
    ];

    getWorkoutHistory.mockReturnValue(of(workoutItems));
    const fixture = TestBed.createComponent(StudentPassesComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp['workoutHistory']().length).toBe(2);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('2 buổi đã rèn luyện');
  });
});