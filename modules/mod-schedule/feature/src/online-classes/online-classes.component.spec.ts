import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZenConfirmService, ZenToastService } from '@yoga/platform/ui';
import { OnlineClassApi, ScheduleApi } from '@yoga/mod-schedule/data-access';
import { OnlineClassesComponent } from './online-classes.component';

describe('OnlineClassesComponent', () => {
  const branches = [
    { id: 'b1', name: 'Cơ sở 1', address: 'a', isActive: true },
    { id: 'b2', name: 'Cơ sở 2', address: 'b', isActive: true },
    { id: 'old-online', name: 'Lớp học Online', address: 'z', isActive: false, isVirtual: true }
  ];
  let scheduleApi: Record<string, ReturnType<typeof vi.fn>>;

  function setup(role: 'SUPER_ADMIN' | 'BRANCH_MANAGER' | 'INSTRUCTOR') {
    scheduleApi = {
      getBranches: vi.fn().mockReturnValue(of(branches)),
      getSchedules: vi.fn().mockReturnValue(of([
        { id: 's1', branchId: 'b1', branchName: 'Cơ sở 1', className: 'Hatha', instructorName: 'Lan', roomName: 'Phòng online', startTime: '2099-01-01T05:00:00Z', endTime: '2099-01-01T06:00:00Z', bookedCount: 2, maxCapacity: 20, status: 'SCHEDULED', deliveryMode: 'ONLINE' },
        { id: 's2', branchId: 'b2', branchName: 'Cơ sở 2', className: 'Yin', instructorName: 'Mai', roomName: 'Phòng online', startTime: '2099-01-02T05:00:00Z', endTime: '2099-01-02T06:00:00Z', bookedCount: 0, maxCapacity: 20, status: 'SCHEDULED', deliveryMode: 'ONLINE' }
      ])),
      getRoomsByBranch: vi.fn().mockReturnValue(of([
        { id: 'studio', branchId: 'b1', name: 'Studio', maxCapacity: 25, isActive: true, roomType: 'PHYSICAL' },
        { id: 'zoom1', branchId: 'b1', name: 'Phòng online', maxCapacity: 100, isActive: true, roomType: 'VIRTUAL' }
      ])),
      getInstructors: vi.fn().mockReturnValue(of([{ id: 'i1', fullName: 'Lan', phone: '1' }])),
      getClassTypes: vi.fn().mockReturnValue(of([{ id: 't1', name: 'Hatha', defaultDurationMinutes: 45 }])),
      createSchedule: vi.fn().mockReturnValue(of({})),
      getScheduleAttendees: vi.fn().mockReturnValue(of([])),
      cancelSchedule: vi.fn().mockReturnValue(of({}))
    };
    TestBed.configureTestingModule({
      imports: [OnlineClassesComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        { provide: ScheduleApi, useValue: scheduleApi },
        { provide: OnlineClassApi, useValue: { getSession: vi.fn().mockReturnValue(of(null)), resync: vi.fn() } },
        { provide: ZenToastService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: ZenConfirmService, useValue: { confirmCancel: vi.fn().mockResolvedValue(true) } },
        {
          provide: AuthService,
          useValue: {
            isSuperAdmin: () => role === 'SUPER_ADMIN',
            isBranchManager: () => role === 'BRANCH_MANAGER',
            isInstructor: () => role === 'INSTRUCTOR',
            isReceptionist: () => false,
            userHomeBranchId: () => 'b1',
            branchIds: () => ['b1'],
            currentUserId: () => 'me'
          }
        }
      ]
    });
    const page = TestBed.createComponent(OnlineClassesComponent).componentInstance;
    page.ngOnInit();
    return page;
  }

  it('loads only online classes and hides the retired virtual branch', () => {
    const page = setup('SUPER_ADMIN');
    expect(scheduleApi['getSchedules'].mock.calls[0][4]).toBe('ONLINE');
    expect(page.branches().map(b => b.id)).toEqual(['b1', 'b2']);
    expect(page.visibleSchedules().length).toBe(2);
  });

  it('limits a branch manager to their own branch', () => {
    const page = setup('BRANCH_MANAGER');
    expect(page.branches().map(b => b.id)).toEqual(['b1']);
    expect(scheduleApi['getSchedules'].mock.calls.at(-1)?.[0]).toBe('b1');
    expect(page.visibleSchedules().map(s => s.id)).toEqual(['s1']);
  });

  it('shows an instructor the classes they teach in every branch', () => {
    const page = setup('INSTRUCTOR');
    const call = scheduleApi['getSchedules'].mock.calls.at(-1)!;
    expect(call[0]).toBeUndefined();
    expect(call[3]).toBe('me');
    expect(page.visibleSchedules().length).toBe(2);
    expect(page.canManage()).toBe(false);
  });

  it('creates an online class in a virtual room with Vietnam time', () => {
    const page = setup('BRANCH_MANAGER');
    page.openCreate();
    expect(page.formRooms().map(r => r.id)).toEqual(['zoom1']);
    expect(page.form()!.roomId).toBe('zoom1');
    page.patchForm({ classTypeId: 't1', instructorId: 'i1', date: '2099-03-01', time: '19:30', durationMinutes: 40, maxCapacity: 15 });
    page.submit();
    expect(scheduleApi['createSchedule']).toHaveBeenCalledWith({
      branchId: 'b1', roomId: 'zoom1', classTypeId: 't1', instructorId: 'i1',
      startTime: '2099-03-01T12:30:00.000Z', endTime: '2099-03-01T13:10:00.000Z', maxCapacity: 15
    });
  });

  it('refuses to cancel a class that still has bookings', async () => {
    const page = setup('BRANCH_MANAGER');
    await page.cancel(page.visibleSchedules()[0]);
    expect(scheduleApi['cancelSchedule']).not.toHaveBeenCalled();
  });
});
