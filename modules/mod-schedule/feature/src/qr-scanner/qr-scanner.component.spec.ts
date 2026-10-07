import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { CheckInApi, ScheduleApi } from '@yoga/mod-schedule/data-access';
import { QrScannerComponent } from './qr-scanner.component';

describe('Instructor Attendance Component', () => {
  const processCheckIn = vi.fn();
  const revertCheckIn = vi.fn();
  const getSchedules = vi.fn();
  const getScheduleAttendees = vi.fn();

  const mockSchedules = [
    {
      id: 'sched-01',
      branchId: 'b-actual',
      branchName: 'Chi nhánh Quận 1',
      roomId: 'room-01',
      instructorId: 'inst-01',
      className: 'Hatha Yoga Căn Bản',
      instructorName: 'Phạm Mỹ Linh',
      roomName: 'Studio Lotus',
      startTime: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 50 * 60 * 1000).toISOString(),
      maxCapacity: 20,
      bookedCount: 2,
      availableSlots: 18,
      status: 'SCHEDULED' as const
    }
  ];

  const mockAttendees = [
    {
      id: 'book-01',
      bookingCode: 'BK-101',
      studentId: 'student-01',
      studentName: 'Vũ Hoàng An',
      studentPhone: '0909111222',
      matNumber: 1,
      status: 'CONFIRMED' as const,
      bookingTime: new Date().toISOString()
    },
    {
      id: 'book-02',
      bookingCode: 'BK-102',
      studentId: 'student-02',
      studentName: 'Đoàn Thanh Bình',
      studentPhone: '0909333444',
      matNumber: 2,
      status: 'ATTENDED' as const,
      bookingTime: new Date().toISOString(),
      checkedInAt: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    processCheckIn.mockReset().mockReturnValue(of({
      attendanceId: 'att-01',
      bookingId: 'book-01',
      bookingCode: 'BK-101',
      studentId: 'student-01',
      studentName: 'Vũ Hoàng An',
      className: 'Hatha Yoga Căn Bản',
      branchName: 'Chi nhánh Quận 1',
      checkedInAt: new Date().toISOString(),
      attendanceStatus: 'PRESENT',
      matNumber: 1,
      alreadyCheckedIn: false
    }));

    revertCheckIn.mockReset().mockReturnValue(of(undefined));
    getSchedules.mockReset().mockReturnValue(of(mockSchedules));
    getScheduleAttendees.mockReset().mockReturnValue(of(mockAttendees));

    TestBed.configureTestingModule({
      imports: [QrScannerComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        {
          provide: AuthService,
          useValue: {
            currentUserId: () => 'inst-01',
            isStudent: () => false,
            isInstructor: () => true,
            isSuperAdmin: () => false,
            isAuthenticated: () => true,
            userRole: () => 'INSTRUCTOR',
            userFullName: () => 'Phạm Mỹ Linh',
            profile: () => ({ phone: '0901000004' }),
            branchIds: () => ['b-actual'],
            canAccessPos: () => false,
            canAccessCheckIn: () => true,
            canManageUsers: () => false,
            logout: vi.fn()
          }
        },
        {
          provide: BranchApi,
          useValue: {
            getAll: () => of([{ id: 'b-actual', name: 'Cơ sở Quận 1', isActive: true }])
          }
        },
        {
          provide: ScheduleApi,
          useValue: {
            getSchedules,
            getScheduleAttendees
          }
        },
        {
          provide: CheckInApi,
          useValue: {
            processCheckIn,
            revertCheckIn
          }
        }
      ]
    });
  });

  it('initializes and automatically selects current class and loads attendees', async () => {
    const fixture = TestBed.createComponent(QrScannerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(getSchedules).toHaveBeenCalled();
    expect(fixture.componentInstance.selectedScheduleId()).toBe('sched-01');
    expect(getScheduleAttendees).toHaveBeenCalledWith('sched-01');
    expect(fixture.componentInstance.attendees().length).toBe(2);
  });

  it('allows instructor to check in an un-attended student', async () => {
    const fixture = TestBed.createComponent(QrScannerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const unCheckedStudent = fixture.componentInstance.attendees()[0];
    fixture.componentInstance.checkInAttendee(unCheckedStudent);

    expect(processCheckIn).toHaveBeenCalledWith({
      bookingId: 'book-01',
      scheduleId: 'sched-01',
      branchId: 'b-actual',
      checkedInBy: 'inst-01',
      checkInMethod: 'INSTRUCTOR_CONFIRM'
    });

    const updated = fixture.componentInstance.attendees().find(a => a.id === 'book-01');
    expect(updated?.status).toBe('ATTENDED');
  });

  it('allows instructor to revert attendance for an attended student', async () => {
    const fixture = TestBed.createComponent(QrScannerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const attendedStudent = fixture.componentInstance.attendees()[1];
    fixture.componentInstance.revertCheckInAttendee(attendedStudent);

    expect(revertCheckIn).toHaveBeenCalledWith('book-02');
    const updated = fixture.componentInstance.attendees().find(a => a.id === 'book-02');
    expect(updated?.status).toBe('CONFIRMED');
  });

  it('renders scanner input when scanner panel is toggled and handles QR checkin', async () => {
    const fixture = TestBed.createComponent(QrScannerComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.showScannerPanel.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('input[name="qrInput"]')).toBeTruthy();

    fixture.componentInstance.qrInput.set('BK-101');
    fixture.componentInstance.submitCheckIn();

    expect(processCheckIn).toHaveBeenCalledWith(expect.objectContaining({
      bookingCode: 'BK-101',
      checkedInBy: 'inst-01',
      branchId: 'b-actual'
    }));
  });

  it('renders API errors gracefully', () => {
    processCheckIn.mockReturnValue(throwError(() => ({ error: { message: 'Ca học chưa mở điểm danh' } })));
    const fixture = TestBed.createComponent(QrScannerComponent);
    fixture.detectChanges();

    const student = fixture.componentInstance.attendees()[0];
    fixture.componentInstance.checkInAttendee(student);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ca học chưa mở điểm danh');
  });
});