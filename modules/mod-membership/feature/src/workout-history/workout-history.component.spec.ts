import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { BookingApi } from '@yoga/mod-schedule/data-access';
import { WorkoutHistoryComponent } from './workout-history.component';

describe('WorkoutHistoryComponent', () => {
  const getWorkoutHistory = vi.fn();
  const getBookings = vi.fn();

  beforeEach(() => {
    getWorkoutHistory.mockReset().mockReturnValue(of([]));
    getBookings.mockReset().mockReturnValue(of([]));

    TestBed.configureTestingModule({
      imports: [WorkoutHistoryComponent],
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
            userFullName: () => 'Nguyễn Văn Yoga',
            profile: () => ({ phone: '0901234567' }),
          },
        },
        {
          provide: BookingApi,
          useValue: {
            getStudentWorkoutHistory: getWorkoutHistory,
            getStudentBookingDetails: getBookings,
          },
        },
      ],
    });
  });

  it('loads and renders workout history with stats bento and cards list', () => {
    const workoutItems = [
      {
        bookingId: 'b-1',
        bookingCode: 'BK-001',
        scheduleId: 's-1',
        className: 'Hatha Yoga Căn Bản',
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
        instructorName: 'Trần Văn An',
        roomName: 'Studio Bamboo',
        branchName: 'Cơ sở Thảo Điền',
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
    const fixture = TestBed.createComponent(WorkoutHistoryComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp['workoutHistory']().length).toBe(2);
    expect(comp['totalMinutesPracticed']()).toBe(135);
    expect(comp['favoriteClass']()?.name).toBeDefined();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Lịch Sử Tập Luyện');
    expect(text).toContain('Hatha Yoga Căn Bản');
    expect(text).toContain('Vinyasa Flow');
    expect(text).toContain('Phạm Mỹ Linh');
    expect(text).toContain('Thảm 8');
  });

  it('correctly filters workout history by search keyword', () => {
    const workoutItems = [
      {
        bookingId: 'b-1',
        bookingCode: 'BK-001',
        scheduleId: 's-1',
        className: 'Hatha Yoga Căn Bản',
        instructorName: 'Mỹ Linh',
        roomName: 'Studio Lotus',
        branchName: 'Cơ sở Quận 1',
        startTime: '2026-10-06T18:00:00Z',
        endTime: '2026-10-06T19:00:00Z',
        durationMinutes: 60,
        status: 'ATTENDED',
      },
      {
        bookingId: 'b-2',
        bookingCode: 'BK-002',
        scheduleId: 's-2',
        className: 'Yin Yoga Phục Hồi',
        instructorName: 'Hoàng Lan',
        roomName: 'Studio Zen',
        branchName: 'Cơ sở Cầu Giấy',
        startTime: '2026-10-05T18:00:00Z',
        endTime: '2026-10-05T19:15:00Z',
        durationMinutes: 75,
        status: 'ATTENDED',
      },
    ];

    getWorkoutHistory.mockReturnValue(of(workoutItems));
    const fixture = TestBed.createComponent(WorkoutHistoryComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    comp['historySearchQuery'].set('Yin');
    expect(comp['filteredWorkoutHistory']().length).toBe(1);
    expect(comp['filteredWorkoutHistory']()[0].className).toBe('Yin Yoga Phục Hồi');

    comp['historySearchQuery'].set('Linh');
    expect(comp['filteredWorkoutHistory']().length).toBe(1);
    expect(comp['filteredWorkoutHistory']()[0].className).toBe('Hatha Yoga Căn Bản');
  });
});
