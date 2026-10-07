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
            isInstructor: () => false,
            currentUserId: () => 'user-1',
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
            isInstructor: () => false,
            currentUserId: () => 'user-1',
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

    // Filtered schedules must only contain schedules belonging to branch-2 (clearing date filter to test branch isolation)
    comp.clearDateFilter();
    expect(comp.filteredSchedules().length).toBe(1);
    expect(comp.filteredSchedules()[0].branchId).toBe('branch-2');

    // Modal is locked to branch-2
    comp.openCreateScheduleModal();
    expect(comp.scheduleForm().branchId).toBe('branch-2');
    comp.onScheduleFormBranchChange('branch-1');
    expect(comp.scheduleForm().branchId).toBe('branch-2');
  });

  it('defaults date filter to today and allows clearing / resetting to today', () => {
    TestBed.configureTestingModule({
      imports: [ClassManagementComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isSuperAdmin: () => true,
            isBranchManager: () => false,
            isInstructor: () => false,
            currentUserId: () => 'admin-1',
            userHomeBranchId: () => null
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

    // Defaults to today in YYYY-MM-DD
    const todayStr = comp.getTodayDateStr();
    expect(comp.dateFilter()).toBe(todayStr);

    // Can clear date filter
    comp.clearDateFilter();
    expect(comp.dateFilter()).toBe('');

    // Can set back to today
    comp.setDateToToday();
    expect(comp.dateFilter()).toBe(todayStr);
  });

  it('defaults instructor filter to own instructor ID for Instructor role', () => {
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const instructorSchedules = [
      {
        id: 's-ins-1',
        branchId: 'branch-1',
        instructorId: 'ins-1',
        className: 'Hatha Flow',
        instructorName: 'An Yên Master',
        roomName: 'Studio 1',
        startTime: `${todayStr}T08:00:00Z`,
        endTime: `${todayStr}T09:00:00Z`,
        status: 'SCHEDULED',
        maxCapacity: 20,
        bookedCount: 5,
        availableSlots: 15
      },
      {
        id: 's-other',
        branchId: 'branch-1',
        instructorId: 'ins-2',
        className: 'Vinyasa Pro',
        instructorName: 'Other Master',
        roomName: 'Studio 2',
        startTime: `${todayStr}T10:00:00Z`,
        endTime: `${todayStr}T11:00:00Z`,
        status: 'SCHEDULED',
        maxCapacity: 20,
        bookedCount: 8,
        availableSlots: 12
      }
    ];

    scheduleApiMock.getSchedules = vi.fn().mockReturnValue(of(instructorSchedules));

    TestBed.configureTestingModule({
      imports: [ClassManagementComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isSuperAdmin: () => false,
            isBranchManager: () => false,
            isInstructor: () => true,
            currentUserId: () => 'ins-1',
            userFullName: () => 'An Yên Master',
            userHomeBranchId: () => 'branch-1',
            branchIds: () => ['branch-1']
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

    // Instructor filter defaults to self ('ins-1')
    expect(comp.selectedInstructorId()).toBe('ins-1');

    // Date filter defaults to today
    expect(comp.dateFilter()).toBe(todayStr);

    // Filtered schedules only shows own schedule
    const filtered = comp.filteredSchedules();
    expect(filtered.length).toBe(1);
    expect(filtered[0].instructorId).toBe('ins-1');
    expect(filtered[0].className).toBe('Hatha Flow');

    // Instructor options show '(Tôi)'
    const options = comp.instructorFilterOptions();
    const selfOption = options.find(o => o.value === 'ins-1');
    expect(selfOption).toBeDefined();
    expect(selfOption?.label).toContain('(Tôi)');

    // Resetting filters restores instructor filter back to self and today's date
    comp.selectedInstructorId.set('ALL');
    comp.dateFilter.set('');
    expect(comp.selectedInstructorId()).toBe('ALL');
    expect(comp.dateFilter()).toBe('');

    comp.resetFilters();
    expect(comp.selectedInstructorId()).toBe('ins-1');
    expect(comp.dateFilter()).toBe(todayStr);
  });
});
