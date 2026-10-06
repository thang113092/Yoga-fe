import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZenConfirmService, ZenToastService } from '@yoga/platform/api';
import { ScheduleApi } from '@yoga/mod-schedule/data-access';
import { ClassManagementComponent } from './class-management.component';

describe('ClassManagementComponent', () => {
  const mockBranches = [
    { id: 'branch-1', name: 'Chi nhánh Quận 1', address: '123 Lê Lợi' },
    { id: 'branch-2', name: 'Chi nhánh Thảo Điền', address: '456 Quốc Hương' }
  ];

  const mockRooms = [
    { id: 'room-1', branchId: 'branch-1', name: 'Studio Sen Vàng', maxCapacity: 20, isActive: true },
    { id: 'room-2', branchId: 'branch-2', name: 'Studio Trúc Xanh', maxCapacity: 15, isActive: true }
  ];

  const mockClassTypes = [
    { id: 'ct-1', code: 'HATHA', name: 'Hatha Yoga', defaultDurationMinutes: 60, intensityLevel: 'ALL_LEVELS', isActive: true }
  ];

  const mockInstructors = [
    { id: 'ins-1', fullName: 'An Yên Master', phone: '0901234567' }
  ];

  const mockSchedules = [
    { id: 's-1', branchId: 'branch-1', className: 'Hatha Q1', instructorName: 'HLV 1', roomName: 'R1', startTime: '2026-10-10T08:00:00Z', endTime: '2026-10-10T09:00:00Z', status: 'SCHEDULED', maxCapacity: 20, bookedCount: 5, availableSlots: 15 },
    { id: 's-2', branchId: 'branch-2', className: 'Hatha Thao Dien', instructorName: 'HLV 2', roomName: 'R2', startTime: '2026-10-10T08:00:00Z', endTime: '2026-10-10T09:00:00Z', status: 'SCHEDULED', maxCapacity: 20, bookedCount: 10, availableSlots: 10 }
  ];

  let scheduleApiMock: any;
  let confirmMock: any;
  let toastMock: any;

  beforeEach(() => {
    scheduleApiMock = {
      getBranches: vi.fn().mockReturnValue(of(mockBranches)),
      getRoomsByBranch: vi.fn((branchId: string) => of(mockRooms.filter(r => r.branchId === branchId))),
      getClassTypes: vi.fn().mockReturnValue(of(mockClassTypes)),
      getInstructors: vi.fn().mockReturnValue(of(mockInstructors)),
      getSchedules: vi.fn().mockReturnValue(of(mockSchedules)),
      createSchedule: vi.fn().mockReturnValue(of({ id: 'sched-1' }))
    };

    confirmMock = {
      confirmCancel: vi.fn().mockResolvedValue(true),
      confirmDelete: vi.fn().mockResolvedValue(true)
    };

    toastMock = {
      success: vi.fn(),
      error: vi.fn()
    };
  });

  it('allows Super Admin to view all branches in filter options and change branch filter', () => {
    const isSuperAdminSig = signal(true);
    const isBranchManagerSig = signal(false);
    const homeBranchSig = signal<string | null>(null);

    TestBed.configureTestingModule({
      imports: [ClassManagementComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isSuperAdmin: isSuperAdminSig,
            isBranchManager: isBranchManagerSig,
            userHomeBranchId: homeBranchSig
          }
        },
        { provide: ScheduleApi, useValue: scheduleApiMock },
        { provide: ZenConfirmService, useValue: confirmMock },
        { provide: ZenToastService, useValue: toastMock }
      ]
    });

    const fixture = TestBed.createComponent(ClassManagementComponent);
    const comp = fixture.componentInstance;
    comp.ngOnInit();

    // Super admin sees all branches in options
    expect(comp.branchSelectOptions().length).toBe(2);

    // Super admin can change filter branch
    comp.onBranchFilterChange('branch-2');
    expect(comp.selectedBranchId()).toBe('branch-2');

    // Super admin can open modal and change branch
    comp.openCreateScheduleModal();
    expect(comp.scheduleForm().branchId).toBe('branch-2');
    comp.onScheduleFormBranchChange('branch-1');
    expect(comp.scheduleForm().branchId).toBe('branch-1');
  });

  it('restricts branch filter options, list, and creation to assigned branch for Branch Manager', () => {
    const isSuperAdminSig = signal(false);
    const isBranchManagerSig = signal(true);
    const homeBranchSig = signal<string | null>('branch-2');

    TestBed.configureTestingModule({
      imports: [ClassManagementComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isSuperAdmin: isSuperAdminSig,
            isBranchManager: isBranchManagerSig,
            userHomeBranchId: homeBranchSig
          }
        },
        { provide: ScheduleApi, useValue: scheduleApiMock },
        { provide: ZenConfirmService, useValue: confirmMock },
        { provide: ZenToastService, useValue: toastMock }
      ]
    });

    const fixture = TestBed.createComponent(ClassManagementComponent);
    const comp = fixture.componentInstance;
    comp.ngOnInit();

    // Initial selectedBranch should match manager's homeBranchId ('branch-2')
    expect(comp.selectedBranchId()).toBe('branch-2');

    // Branch filter options must only contain their assigned branch
    expect(comp.branchSelectOptions().length).toBe(1);
    expect(comp.branchSelectOptions()[0].value).toBe('branch-2');

    // Branch manager cannot change filter branch
    comp.onBranchFilterChange('branch-1');
    expect(comp.selectedBranchId()).toBe('branch-2');

    // Filtered schedules must only contain schedules belonging to branch-2
    expect(comp.filteredSchedules().length).toBe(1);
    expect(comp.filteredSchedules()[0].branchId).toBe('branch-2');

    // Modal is locked to branch-2
    comp.openCreateScheduleModal();
    expect(comp.scheduleForm().branchId).toBe('branch-2');
    comp.onScheduleFormBranchChange('branch-1');
    expect(comp.scheduleForm().branchId).toBe('branch-2');
  });
});
