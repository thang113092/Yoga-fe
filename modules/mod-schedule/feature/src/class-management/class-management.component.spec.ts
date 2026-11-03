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
    { id: 's-1', branchId: 'branch-1', roomId: 'room-1', className: 'Hatha Q1', instructorName: 'HLV 1', roomName: 'Studio Sen Vàng', startTime: '2026-10-10T08:00:00Z', endTime: '2026-10-10T09:00:00Z', status: 'SCHEDULED', maxCapacity: 20, bookedCount: 5, availableSlots: 15 },
    { id: 's-2', branchId: 'branch-2', roomId: 'room-2', className: 'Hatha Thao Dien', instructorName: 'HLV 2', roomName: 'Studio Trúc Xanh', startTime: '2026-10-10T08:00:00Z', endTime: '2026-10-10T09:00:00Z', status: 'SCHEDULED', maxCapacity: 20, bookedCount: 10, availableSlots: 10 }
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

    comp.dateFilter.set('2026-10-11');
    expect(comp.weekDays().map(day=>day.iso)).toEqual(['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11']);
    const column=comp.weekColumns().find(day=>day.iso==='2026-10-10')!;
    expect(column.items).toHaveLength(2);
    expect(column.items.map(item=>item.lane)).toEqual([0,1]);
    expect(column.items.every(item=>item.lanes===2)).toBe(true);
    expect(column.items[0].start).toBe(15*60);
    comp.moveWeek(1);
    expect(comp.weekDays()[0].iso).toBe('2026-10-12');
    expect(comp.filteredSchedules()).toHaveLength(0);
    comp.moveWeek(-1);
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

  it('supports room filtering: displays only class name when specific room is chosen, and displays all rooms (green if class, red if no class) when ALL rooms are chosen', () => {
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

    // Verify room filter options include 'ALL' (Tất cả các phòng) and individual rooms
    const roomOptions = comp.roomFilterOptions();
    expect(roomOptions[0].value).toBe('ALL');
    expect(roomOptions[0].label).toBe('Tất cả các phòng');
    expect(roomOptions.some(o => o.value === 'room-1')).toBe(true);
    expect(roomOptions.some(o => o.value === 'room-2')).toBe(true);

    // Initial state: selectedRoomId is 'ALL'
    expect(comp.selectedRoomId()).toBe('ALL');
    expect(comp.isSingleRoomSelected()).toBe(false);

    // Set date filter to '2026-10-10' (matches mockSchedules date)
    comp.dateFilter.set('2026-10-10');
    const dayColumn = comp.weekColumns().find(day => day.iso === '2026-10-10')!;
    expect(dayColumn).toBeDefined();

    // Mode 2: When 'ALL' rooms are chosen, each slot cluster shows ALL rooms
    expect(dayColumn.clusters.length).toBeGreaterThan(0);
    const cluster = dayColumn.clusters[0];
    // Both room-1 and room-2 have classes in this slot in mockSchedules
    expect(cluster.rooms.length).toBe(2);
    expect(cluster.rooms.every(r => r.hasClass)).toBe(true);

    // Mode 1: When a specific room is selected, filters to that room
    comp.onRoomFilterChange('room-1');
    expect(comp.selectedRoomId()).toBe('room-1');
    expect(comp.isSingleRoomSelected()).toBe(true);

    const singleRoomFiltered = comp.filteredSchedules();
    expect(singleRoomFiltered.length).toBe(1);
    expect(singleRoomFiltered[0].roomId).toBe('room-1');
    expect(singleRoomFiltered[0].className).toBe('Hatha Q1');

    // Resetting filters restores selectedRoomId to 'ALL'
    comp.resetFilters();
    expect(comp.selectedRoomId()).toBe('ALL');
    expect(comp.isSingleRoomSelected()).toBe(false);
  });

  it('manages slot details modal: opens with room list, allows creating schedule for vacant room, and closes modal', () => {
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

    const mockCluster = {
      startTimeStr: '08:00',
      endTimeStr: '09:00',
      rooms: [
        {
          roomId: 'room-1',
          roomName: 'Studio Sen Vàng',
          hasClass: true,
          schedule: mockSchedules[0]
        },
        {
          roomId: 'room-2',
          roomName: 'Studio Trúc Xanh',
          hasClass: false,
          schedule: null
        }
      ]
    };

    expect(comp.slotDetailsModalData()).toBeNull();
    expect(comp.getOccupiedRoomCount(mockCluster.rooms)).toBe(1);

    // Open slot details modal
    comp.openSlotDetailsModal('2026-10-10', mockCluster);
    const modalData = comp.slotDetailsModalData();
    expect(modalData).not.toBeNull();
    expect(modalData?.dateIso).toBe('2026-10-10');
    expect(modalData?.cluster.startTimeStr).toBe('08:00');
    expect(modalData?.cluster.rooms.length).toBe(2);

    // Cancel permission check
    expect(comp.canCancelSchedule(mockSchedules[0] as any)).toBe(true);
    expect(comp.canCancelSchedule({ ...mockSchedules[0], status: 'CANCELLED' } as any)).toBe(false);

    // Click to add schedule on vacant room-2
    comp.onSlotRoomCreateSchedule('2026-10-10', '08:00', 'room-2');
    expect(comp.slotDetailsModalData()).toBeNull();
    expect(comp.isCreateScheduleOpen()).toBe(true);
    expect(comp.scheduleForm().date).toBe('2026-10-10');
    expect(comp.scheduleForm().startTimeStr).toBe('08:00');
    expect(comp.scheduleForm().roomId).toBe('room-2');

    // Close create modal
    comp.closeCreateScheduleModal();
    expect(comp.isCreateScheduleOpen()).toBe(false);
  });

  it('Solution 1 Multi-lane: handles overlapping classes with different durations in ALL rooms view', () => {
    // Room 1: 08:00 - 09:00 (60 mins)
    // Room 2: 08:00 - 09:30 (90 mins, different duration!)
    const variableDurationSchedules = [
      {
        id: 's-room1-60m',
        branchId: 'branch-1',
        roomId: 'room-1',
        className: 'Hatha Yoga 60p',
        instructorName: 'HLV 1',
        roomName: 'Studio Sen Vàng',
        startTime: '2026-10-10T08:00:00Z',
        endTime: '2026-10-10T09:00:00Z',
        status: 'SCHEDULED',
        maxCapacity: 20,
        bookedCount: 5,
        availableSlots: 15
      },
      {
        id: 's-room2-90m',
        branchId: 'branch-1',
        roomId: 'room-2',
        className: 'Ashtanga Advanced 90p',
        instructorName: 'HLV 2',
        roomName: 'Studio Trúc Xanh',
        startTime: '2026-10-10T08:00:00Z',
        endTime: '2026-10-10T09:30:00Z',
        status: 'SCHEDULED',
        maxCapacity: 15,
        bookedCount: 12,
        availableSlots: 3
      }
    ];

    scheduleApiMock.getSchedules = vi.fn().mockReturnValue(of(variableDurationSchedules));

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
    comp.dateFilter.set('2026-10-10');

    const dayColumn = comp.weekColumns().find(day => day.iso === '2026-10-10')!;
    expect(dayColumn).toBeDefined();

    // Verify both items are calculated in parallel lanes (lanes === 2)
    expect(dayColumn.items.length).toBe(2);
    expect(dayColumn.items[0].lanes).toBe(2);
    expect(dayColumn.items[1].lanes).toBe(2);
    expect(dayColumn.items[0].lane).not.toBe(dayColumn.items[1].lane);

    // Verify independent start and end durations:
    const item60 = dayColumn.items.find(i => i.schedule.id === 's-room1-60m')!;
    const item90 = dayColumn.items.find(i => i.schedule.id === 's-room2-90m')!;
    expect(item60).toBeDefined();
    expect(item90).toBeDefined();
    // 60 mins vs 90 mins
    expect(item60.end - item60.start).toBe(60);
    expect(item90.end - item90.start).toBe(90);

    // Verify room theme assignment
    expect(comp.getRoomThemeIndex('room-1')).toBe(0);
    expect(comp.getRoomThemeIndex('room-2')).toBe(1);

    // Verify day-track click opens create schedule for that slot
    const mockTarget = document.createElement('div');
    mockTarget.className = 'day-track';
    vi.spyOn(mockTarget, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      bottom: 1320,
      right: 200,
      width: 200,
      height: 1320,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    const mockEvent = {
      target: mockTarget,
      clientY: 288 // 288 / 1.2 = 240 mins from 4am -> 480 mins total = 08:00
    } as unknown as MouseEvent;

    comp.onDayTrackClick(mockEvent, '2026-10-10');
    expect(comp.isCreateScheduleOpen()).toBe(true);
    expect(comp.scheduleForm().date).toBe('2026-10-10');
    expect(comp.scheduleForm().startTimeStr).toBe('08:00');
  });

  it('Solution 2 Day-Resource View: separates rooms into individual columns for the active day', () => {
    // Room 1: 08:00 - 09:00 (60 mins)
    // Room 2: 08:00 - 09:30 (90 mins, different duration!)
    const variableDurationSchedules = [
      {
        id: 's-room1-60m',
        branchId: 'branch-1',
        roomId: 'room-1',
        className: 'Hatha Yoga 60p',
        instructorName: 'HLV 1',
        roomName: 'Studio Sen Vàng',
        startTime: '2026-10-10T08:00:00Z',
        endTime: '2026-10-10T09:00:00Z',
        status: 'SCHEDULED',
        maxCapacity: 20,
        bookedCount: 5,
        availableSlots: 15
      },
      {
        id: 's-room2-90m',
        branchId: 'branch-1',
        roomId: 'room-2',
        className: 'Ashtanga Advanced 90p',
        instructorName: 'HLV 2',
        roomName: 'Studio Trúc Xanh',
        startTime: '2026-10-10T08:00:00Z',
        endTime: '2026-10-10T09:30:00Z',
        status: 'SCHEDULED',
        maxCapacity: 15,
        bookedCount: 12,
        availableSlots: 3
      }
    ];

    scheduleApiMock.getSchedules = vi.fn().mockReturnValue(of(variableDurationSchedules));

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
    comp.dateFilter.set('2026-10-10');

    // Day-Resource View computed property: dayRoomColumns
    expect(comp.activeDayIso()).toBe('2026-10-10');
    const roomCols = comp.dayRoomColumns();
    expect(roomCols.length).toBe(2);

    const room1Col = roomCols.find(r => r.roomId === 'room-1')!;
    const room2Col = roomCols.find(r => r.roomId === 'room-2')!;
    expect(room1Col).toBeDefined();
    expect(room2Col).toBeDefined();

    // Room 1 has only room 1's class (60 mins)
    expect(room1Col.items.length).toBe(1);
    expect(room1Col.items[0].schedule.className).toBe('Hatha Yoga 60p');
    expect(room1Col.items[0].end - room1Col.items[0].start).toBe(60);

    // Room 2 has only room 2's class (90 mins)
    expect(room2Col.items.length).toBe(1);
    expect(room2Col.items[0].schedule.className).toBe('Ashtanga Advanced 90p');
    expect(room2Col.items[0].end - room2Col.items[0].start).toBe(90);

    // Day navigation
    expect(comp.formatDayNumber('2026-10-10')).toBe('10');
    comp.goToNextDay();
    expect(comp.activeDayIso()).toBe('2026-10-11');
    comp.goToPrevDay();
    expect(comp.activeDayIso()).toBe('2026-10-10');

    // Click on room track opens create schedule modal with room pre-filled
    const mockRoomTrack = document.createElement('div');
    mockRoomTrack.className = 'room-track';
    vi.spyOn(mockRoomTrack, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      left: 0,
      bottom: 1320,
      right: 200,
      width: 200,
      height: 1320,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    const mockEvent = {
      target: mockRoomTrack,
      clientY: 288 // 08:00
    } as unknown as MouseEvent;

    comp.onRoomTrackClick(mockEvent, 'room-2');
    expect(comp.isCreateScheduleOpen()).toBe(true);
    expect(comp.scheduleForm().date).toBe('2026-10-10');
    expect(comp.scheduleForm().startTimeStr).toBe('08:00');
    expect(comp.scheduleForm().roomId).toBe('room-2');
  });
});
