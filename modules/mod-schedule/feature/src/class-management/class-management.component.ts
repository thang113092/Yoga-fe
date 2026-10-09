import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZenSelectComponent, ZenConfirmService, ZenToastService } from '@yoga/platform/api';
import {
  BranchItem,
  ClassSchedule,
  ClassTypeItem,
  CreateClassTypeReq,
  CreateScheduleReq,
  InstructorItem,
  RoomItem,
  ScheduleAttendee,
  ScheduleApi
} from '@yoga/mod-schedule/data-access';

function getTodayIsoDate(): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

@Component({
  selector: 'yoga-class-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ZenSelectComponent],
  templateUrl: './class-management.component.html',
  styleUrls: ['./class-management.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClassManagementComponent implements OnInit {
  private readonly scheduleApi = inject(ScheduleApi);
  protected readonly auth = inject(AuthService);
  private readonly confirmService = inject(ZenConfirmService);
  private readonly toast = inject(ZenToastService);

  private readonly route = inject(ActivatedRoute);
  // Active Tab
  readonly activeTab = signal<'schedules' | 'class-types'>('schedules');

  // Core Data
  readonly branches = signal<BranchItem[]>([]);
  readonly rooms = signal<RoomItem[]>([]);
  readonly classTypes = signal<ClassTypeItem[]>([]);
  readonly instructors = signal<InstructorItem[]>([]);
  readonly schedules = signal<ClassSchedule[]>([]);

  // Selected filters (default date to today; for instructor, default instructor to self)
  readonly selectedBranchId = signal<string>('ALL');
  readonly selectedInstructorId = signal<string>(
    this.auth.isInstructor() && this.auth.currentUserId() ? this.auth.currentUserId()! : 'ALL'
  );
  readonly searchQuery = signal<string>('');
  readonly dateFilter = signal<string>(getTodayIsoDate());
  readonly statusFilter = signal<string>('ALL');
  readonly selectedRoomId = signal<string>('ALL');
  readonly isSingleRoomSelected = computed(() => this.selectedRoomId() !== 'ALL');
  readonly dateRangeMode = signal<'week' | 'month' | 'custom'>('week');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');

  // Loading & Feedback
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Modal State: Create Schedule
  readonly isCreateScheduleOpen = signal(false);
  readonly isSubmittingSchedule = signal(false);
  readonly scheduleForm = signal<{
    branchId: string;
    roomId: string;
    classTypeId: string;
    instructorId: string;
    date: string;
    startTimeStr: string;
    durationMinutes: number;
    maxCapacity: number;
  }>({
    branchId: '',
    roomId: '',
    classTypeId: '',
    instructorId: '',
    date: this.getDefaultDate(),
    startTimeStr: '08:00',
    durationMinutes: 60,
    maxCapacity: 20
  });

  // Modal State: Create Class Type
  readonly isCreateClassTypeOpen = signal(false);
  readonly isSubmittingClassType = signal(false);
  readonly classTypeForm = signal<CreateClassTypeReq>({
    code: '',
    name: '',
    description: '',
    defaultDurationMinutes: 60,
    intensityLevel: 'ALL_LEVELS'
  });

  // Modal State: Attendees List
  readonly isAttendeesOpen = signal(false);
  readonly selectedScheduleForAttendees = signal<ClassSchedule | null>(null);
  readonly attendeesList = signal<ScheduleAttendee[]>([]);
  readonly isLoadingAttendees = signal(false);

  // Branch lock for Branch Manager & Instructor
  readonly isBranchLocked = computed(() => this.auth.isBranchManager() || this.auth.isInstructor());
  readonly userRestrictedBranchId = computed(() => this.auth.userHomeBranchId() || this.auth.branchIds()[0] || null);

  // Computed Options for ZenSelect
  readonly branchFilterOptions = computed(() => {
    let list = this.branches();
    if (this.isBranchLocked()) {
      const homeBranch = this.userRestrictedBranchId();
      if (homeBranch) {
        list = list.filter(b => b.id === homeBranch);
      }
      return list.map(b => ({
        value: b.id,
        label: b.name,
        sublabel: b.address
      }));
    }
    return [
      { value: 'ALL', label: 'Tất cả cơ sở', sublabel: 'Toàn bộ hệ thống phòng tập' },
      ...list.map(b => ({
        value: b.id,
        label: b.name,
        sublabel: b.address
      }))
    ];
  });

  readonly branchSelectOptions = computed(() => {
    let list = this.branches();
    if (this.isBranchLocked()) {
      const homeBranch = this.userRestrictedBranchId();
      if (homeBranch) {
        list = list.filter(b => b.id === homeBranch);
      }
    }
    return list.map(b => ({
      value: b.id,
      label: b.name,
      sublabel: b.address
    }));
  });

  readonly roomSelectOptions = computed(() => {
    return this.rooms().map(r => ({
      value: r.id,
      label: `${r.name}${r.floor ? ' (' + r.floor + ')' : ''}`,
      sublabel: `${r.maxCapacity} chỗ`
    }));
  });

  readonly currentContextRooms = computed<RoomItem[]>(() => {
    const branchId = this.selectedBranchId();
    let list = this.rooms();
    if (this.isBranchLocked()) {
      const homeBranch = this.userRestrictedBranchId();
      if (homeBranch) {
        list = list.filter(r => r.branchId === homeBranch);
      }
    } else if (branchId && branchId !== 'ALL') {
      list = list.filter(r => r.branchId === branchId);
    }
    return list;
  });

  getBranchNameByRoom(room: RoomItem): string {
    const b = this.branches().find(item => item.id === room.branchId);
    return b ? b.name : '';
  }

  readonly roomFilterOptions = computed(() => {
    const branchId = this.selectedBranchId();
    const list = this.currentContextRooms();
    return [
      {
        value: 'ALL',
        label: 'Tất cả các phòng',
        sublabel: 'Xem trạng thái đồng thời mọi phòng học'
      },
      ...list.map(r => ({
        value: r.id,
        label: `${r.name}${r.floor ? ' (' + r.floor + ')' : ''}`,
        sublabel: `${r.maxCapacity} chỗ tập${!branchId || branchId === 'ALL' ? (this.getBranchNameByRoom(r) ? ' • ' + this.getBranchNameByRoom(r) : '') : ''}`
      }))
    ];
  });

  onRoomFilterChange(roomId: string): void {
    this.selectedRoomId.set(roomId || 'ALL');
  }

  readonly classTypeSelectOptions = computed(() => {
    return this.classTypes().map(ct => ({
      value: ct.id,
      label: ct.name,
      sublabel: `${ct.defaultDurationMinutes} phút • ${this.getIntensityLabel(ct.intensityLevel)}`
    }));
  });

  readonly instructorSelectOptions = computed(() => {
    return this.instructors().map(ins => ({
      value: ins.id,
      label: ins.fullName,
      sublabel: `SĐT: ${ins.phone}`
    }));
  });

  readonly instructorFilterOptions = computed(() => {
    const myId = this.auth.currentUserId();
    return [
      { value: 'ALL', label: 'Tất cả huấn luyện viên' },
      ...this.instructors().map(ins => ({
        value: ins.id,
        label: ins.fullName + (myId && ins.id === myId ? ' (Tôi)' : ''),
        sublabel: ins.phone ? `SĐT: ${ins.phone}` : undefined
      }))
    ];
  });

  readonly statusFilterOptions = [
    { value: 'ALL', label: 'Tất cả trạng thái' },
    { value: 'SCHEDULED', label: 'Đang mở đăng ký' },
    { value: 'IN_PROGRESS', label: 'Đang diễn ra' },
    { value: 'COMPLETED', label: 'Đã hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy ca' }
  ];

  readonly datePickerInput = viewChild<ElementRef<HTMLInputElement>>('datePickerInput');

  triggerDatePicker(): void {
    const el = this.datePickerInput()?.nativeElement;
    if (el) {
      if (typeof el.showPicker === 'function') {
        try {
          el.showPicker();
          return;
        } catch {
          // fallback
        }
      }
      el.focus();
      el.click();
    }
  }

  isTodayDate(iso: string): boolean {
    if (!iso) return false;
    return iso === this.getTodayDateStr();
  }

  isTomorrowDate(iso: string): boolean {
    if (!iso) return false;
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(tomorrow);
      return iso === tomorrowStr;
    } catch {
      return false;
    }
  }

  formatDisplayDate(iso: string): string {
    if (!iso) return '';
    try {
      const [y, m, d] = iso.split('-').map(Number);
      if (!y || !m || !d) return iso;
      const date = new Date(y, m - 1, d);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
    } catch {
      return iso;
    }
  }

  getWeekdayDisplay(iso: string): string {
    if (!iso) return '';
    try {
      const [y, m, d] = iso.split('-').map(Number);
      if (!y || !m || !d) return '';
      const date = new Date(y, m - 1, d);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return days[date.getDay()] || '';
    } catch {
      return '';
    }
  }

  onDateSelect(newDate: string): void {
    this.dateFilter.set(newDate || '');
  }

  getBranchName(schedule: ClassSchedule): string {
    if (schedule.branchName) return schedule.branchName;
    const b = this.branches().find(item => item.id === schedule.branchId);
    return b ? b.name : 'Chi nhánh';
  }

  getTodayDateStr(): string {
    return getTodayIsoDate();
  }

  clearDateFilter(event?: Event): void {
    if (event) event.stopPropagation();
    this.dateFilter.set('');
  }

  setDateToToday(event?: Event): void {
    if (event) event.stopPropagation();
    this.dateFilter.set(getTodayIsoDate());
  }

  getScheduleDateStr(iso: string): string {
    if (!iso) return '';
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date(iso));
    } catch {
      return iso.substring(0, 10);
    }
  }


  resetFilters(): void {
    this.searchQuery.set('');
    this.dateFilter.set(getTodayIsoDate());
    if (this.auth.isInstructor()) {
      const myId = this.auth.currentUserId();
      this.selectedInstructorId.set(myId || 'ALL');
    } else {
      this.selectedInstructorId.set('ALL');
    }
    this.statusFilter.set('ALL');
    this.selectedRoomId.set('ALL');
    if (!this.isBranchLocked()) {
      this.selectedBranchId.set('ALL');
      this.loadSchedules();
    } else {
      const homeBranch = this.userRestrictedBranchId();
      if (homeBranch) {
        this.selectedBranchId.set(homeBranch);
        this.loadSchedules();
      }
    }
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.dateFilter.set('');
    this.selectedInstructorId.set('ALL');
    this.statusFilter.set('ALL');
    this.selectedRoomId.set('ALL');
    if (!this.isBranchLocked()) {
      this.selectedBranchId.set('ALL');
      this.loadSchedules();
    } else {
      const homeBranch = this.userRestrictedBranchId();
      if (homeBranch) {
        this.selectedBranchId.set(homeBranch);
        this.loadSchedules();
      }
    }
  }

  readonly hasActiveFilters = computed(() => {
    return !!(
      this.searchQuery().trim() ||
      this.dateFilter() ||
      (this.auth.isInstructor()
        ? this.selectedInstructorId() !== (this.auth.currentUserId() || 'ALL')
        : this.selectedInstructorId() !== 'ALL') ||
      this.statusFilter() !== 'ALL' ||
      this.selectedRoomId() !== 'ALL' ||
      (!this.isBranchLocked() && this.selectedBranchId() !== 'ALL')
    );
  });

  // Filtered schedules
  readonly filteredSchedules = computed(() => {
    let list = this.schedules();
    const query = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    const insId = this.selectedInstructorId();
    const roomId = this.selectedRoomId();

    if (this.isBranchLocked()) {
      const homeBranch = this.userRestrictedBranchId();
      if (homeBranch) {
        list = list.filter(s => s.branchId === homeBranch);
      }
    }

    if (st !== 'ALL') {
      list = list.filter(s => s.status === st);
    }

    if (insId && insId !== 'ALL') {
      list = list.filter(s => s.instructorId === insId);
    }

    if (roomId && roomId !== 'ALL') {
      list = list.filter(s => s.roomId === roomId);
    }

    list = list.filter(s => this.weekDays().some(day => day.iso === this.getScheduleDateStr(s.startTime)));

    if (query) {
      list = list.filter(s =>
        s.className.toLowerCase().includes(query) ||
        s.instructorName.toLowerCase().includes(query) ||
        s.roomName.toLowerCase().includes(query) ||
        this.getBranchName(s).toLowerCase().includes(query)
      );
    }

    return list;
  });

  getThisWeekRange(): { from: string; to: string } {
    const todayIso = getTodayIsoDate();
    const d = new Date(todayIso + 'T00:00:00Z');
    const dayOfWeek = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayOfWeek);
    const from = d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 6);
    const to = d.toISOString().slice(0, 10);
    return { from, to };
  }

  getThisMonthRange(): { from: string; to: string } {
    const todayIso = getTodayIsoDate();
    const [yStr, mStr] = todayIso.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { from, to };
  }

  selectThisWeek(): void {
    const range = this.getThisWeekRange();
    this.dateRangeMode.set('week');
    this.fromDate.set(range.from);
    this.toDate.set(range.to);
    this.dateFilter.set(getTodayIsoDate());
  }

  selectThisMonth(): void {
    const range = this.getThisMonthRange();
    this.dateRangeMode.set('month');
    this.fromDate.set(range.from);
    this.toDate.set(range.to);
  }

  onFromDateChange(val: string): void {
    this.dateRangeMode.set('custom');
    this.fromDate.set(val || '');
  }

  onToDateChange(val: string): void {
    this.dateRangeMode.set('custom');
    this.toDate.set(val || '');
  }

  readonly hours = Array.from({ length: 19 }, (_, i) => i + 4);

  readonly weekDays = computed(() => {
    const mode = this.dateRangeMode();
    const from = this.fromDate();
    const to = this.toDate();

    if ((mode === 'custom' || mode === 'month') && from && to) {
      try {
        const start = new Date(from + 'T00:00:00Z');
        const end = new Date(to + 'T00:00:00Z');
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
          const days: Array<{ iso: string; label: string }> = [];
          const dayLabels = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
          const cur = new Date(start);
          let count = 0;
          while (cur <= end && count < 35) {
            const iso = cur.toISOString().slice(0, 10);
            const dayOfWeek = cur.getUTCDay();
            days.push({
              iso,
              label: dayLabels[dayOfWeek]
            });
            cur.setUTCDate(cur.getUTCDate() + 1);
            count++;
          }
          if (days.length > 0) return days;
        }
      } catch {
        // fallback
      }
    }

    const date = new Date((this.dateFilter() || getTodayIsoDate()) + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(date);
      d.setUTCDate(d.getUTCDate() + i);
      return {
        iso: d.toISOString().slice(0, 10),
        label: ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'][i]
      };
    });
  });

  moveWeek(offset: number): void {
    const d = new Date(this.weekDays()[0].iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + offset * 7);
    this.dateFilter.set(d.toISOString().slice(0, 10));
  }
  private minutes(iso: string): number {
    const d = new Date(new Date(iso).getTime() + 7 * 3600000);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
  readonly weekColumns = computed(() => this.weekDays().map(day => {
    const dayFilteredSchedules = this.filteredSchedules().filter(s => this.getScheduleDateStr(s.startTime) === day.iso);

    // 1. Regular items calculation (maintained for backward-compatibility, single-room view, and tests)
    const items = dayFilteredSchedules.map(schedule => ({
      schedule,
      start: Math.max(240, this.minutes(schedule.startTime)),
      end: Math.min(1320, this.getScheduleDateStr(schedule.endTime) > day.iso ? 1440 : this.minutes(schedule.endTime)),
      lane: 0,
      lanes: 1
    })).filter(s => s.end > s.start).sort((a, b) => a.start - b.start || a.end - b.end);

    let group: typeof items = [];
    let groupEnd = 0;
    const finish = () => {
      const ends: number[] = [];
      for (const item of group) {
        let lane = ends.findIndex(end => end <= item.start);
        if (lane < 0) lane = ends.length;
        item.lane = lane;
        ends[lane] = item.end;
      }
      group.forEach(item => item.lanes = ends.length);
    };
    for (const item of items) {
      if (group.length && item.start >= groupEnd) {
        finish();
        group = [];
        groupEnd = 0;
      }
      group.push(item);
      groupEnd = Math.max(groupEnd, item.end);
    }
    finish();

    // 2. Clusters calculation for "Tất cả các phòng" view
    const contextRooms = this.currentContextRooms();
    const clusters: Array<{
      id: string;
      start: number;
      end: number;
      startTimeStr: string;
      endTimeStr: string;
      timeLabel: string;
      minHeight: number;
      rooms: Array<{
        roomId: string;
        roomName: string;
        hasClass: boolean;
        schedule?: ClassSchedule;
      }>;
    }> = [];

    let clusterGroup: typeof items = [];
    let clusterGroupEnd = 0;

    const finishCluster = () => {
      if (clusterGroup.length === 0) return;
      const cStart = Math.min(...clusterGroup.map(g => g.start));
      const cEnd = Math.max(...clusterGroup.map(g => g.end));

      const startH = Math.floor(cStart / 60);
      const startM = cStart % 60;
      const endH = Math.floor(cEnd / 60);
      const endM = cEnd % 60;
      const startTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      const timeLabel = `${startTimeStr} – ${endTimeStr}`;

      const roomsToEvaluate: Array<{ id: string; name: string }> = contextRooms.length > 0
        ? contextRooms.map(r => ({ id: r.id, name: r.name }))
        : Array.from(new Set(clusterGroup.map(g => g.schedule.roomId))).map(rId => {
            const found = clusterGroup.find(g => g.schedule.roomId === rId);
            return { id: rId, name: found?.schedule.roomName || 'Phòng học' };
          });

      const roomStatuses = roomsToEvaluate.map(room => {
        const matching = clusterGroup.find(g => g.schedule.roomId === room.id);
        return {
          roomId: room.id,
          roomName: room.name,
          hasClass: !!matching,
          schedule: matching?.schedule
        };
      });

      const minHeight = Math.max((cEnd - cStart) * 1.2, 36);

      clusters.push({
        id: `${day.iso}_${cStart}_${cEnd}`,
        start: cStart,
        end: cEnd,
        startTimeStr,
        endTimeStr,
        timeLabel,
        minHeight,
        rooms: roomStatuses
      });
    };

    for (const item of items) {
      if (clusterGroup.length && item.start >= clusterGroupEnd) {
        finishCluster();
        clusterGroup = [];
        clusterGroupEnd = 0;
      }
      clusterGroup.push(item);
      clusterGroupEnd = Math.max(clusterGroupEnd, item.end);
    }
    finishCluster();

    return { ...day, items, clusters };
  }));
  ngOnInit(): void {
    const weekRange = this.getThisWeekRange();
    this.fromDate.set(weekRange.from);
    this.toDate.set(weekRange.to);
    this.route.data.subscribe(data => this.activeTab.set(data['trainingTab'] === 'class-types' ? 'class-types' : 'schedules'));
    if (this.auth.isInstructor()) {
      const myId = this.auth.currentUserId();
      if (myId) {
        this.selectedInstructorId.set(myId);
      }
    }
    this.loadBranches();
    this.loadClassTypes();
    this.loadInstructors();
  }

  loadBranches(): void {
    this.scheduleApi.getBranches().subscribe({
      next: (data) => {
        this.branches.set(data || []);
        if (data && data.length > 0) {
          if (this.isBranchLocked()) {
            const homeBranch = this.userRestrictedBranchId();
            const target = (homeBranch ? data.find(b => b.id === homeBranch) : null) || data[0];
            this.selectedBranchId.set(target.id);
            this.loadSchedules();
            this.loadRooms(target.id);
          } else {
            // SUPER_ADMIN, RECEPTIONIST, v.v. mặc định xem Tất cả cơ sở
            this.selectedBranchId.set('ALL');
            this.loadSchedules();
            this.loadRooms('ALL');
          }
        }
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Không thể tải danh sách cơ sở.');
      }
    });
  }

  loadRooms(branchId: string): void {
    if (!branchId || branchId === 'ALL') {
      const bList = this.branches();
      if (bList.length > 0) {
        forkJoin(bList.map(b => this.scheduleApi.getRoomsByBranch(b.id))).subscribe({
          next: (results) => {
            this.rooms.set(results.flat());
          },
          error: () => {
            this.rooms.set([]);
          }
        });
      }
      return;
    }
    this.scheduleApi.getRoomsByBranch(branchId).subscribe({
      next: (rooms) => {
        this.rooms.set(rooms || []);
        if (rooms && rooms.length > 0) {
          const currentRoom = rooms[0];
          this.scheduleForm.update(f => ({
            ...f,
            roomId: currentRoom.id,
            maxCapacity: currentRoom.maxCapacity
          }));
        }
      },
      error: () => {
        this.rooms.set([]);
      }
    });
  }

  loadClassTypes(): void {
    this.scheduleApi.getClassTypes().subscribe({
      next: (types) => {
        this.classTypes.set(types || []);
        if (types && types.length > 0) {
          this.scheduleForm.update(f => ({
            ...f,
            classTypeId: types[0].id,
            durationMinutes: types[0].defaultDurationMinutes
          }));
        }
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Không thể tải danh mục bộ môn.');
      }
    });
  }

  loadInstructors(): void {
    const branchId = this.isBranchLocked() ? (this.userRestrictedBranchId() || undefined) : undefined;
    this.scheduleApi.getInstructors(branchId).subscribe({
      next: (instList) => {
        let list = instList || [];
        if (this.auth.isInstructor()) {
          const myId = this.auth.currentUserId();
          const myName = this.auth.userFullName();
          if (myId) {
            if (!list.some(i => i.id === myId)) {
              list = [{ id: myId, fullName: myName, phone: '' }, ...list];
            }
            this.selectedInstructorId.set(myId);
          }
        }
        this.instructors.set(list);
        if (list.length > 0) {
          this.scheduleForm.update(f => ({
            ...f,
            instructorId: this.auth.isInstructor() && this.auth.currentUserId()
              ? this.auth.currentUserId()!
              : list[0].id
          }));
        }
      },
      error: () => {
        if (this.auth.isInstructor()) {
          const myId = this.auth.currentUserId();
          if (myId) {
            this.instructors.set([{ id: myId, fullName: this.auth.userFullName(), phone: '' }]);
            this.selectedInstructorId.set(myId);
            return;
          }
        }
        this.instructors.set([]);
      }
    });
  }

  loadSchedules(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const rawBranchId = this.selectedBranchId();
    const branchId = this.isBranchLocked()
      ? (this.userRestrictedBranchId() || (rawBranchId !== 'ALL' ? rawBranchId : undefined))
      : (rawBranchId && rawBranchId !== 'ALL' ? rawBranchId : undefined);

    this.scheduleApi.getSchedules(branchId).subscribe({
      next: (res) => {
        let list = res || [];
        if (this.isBranchLocked() && branchId) {
          list = list.filter(s => s.branchId === branchId);
        }
        this.schedules.set(list);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.schedules.set([]);
        this.errorMessage.set(err?.error?.message || 'Không thể tải danh sách ca học.');
      }
    });
  }

  onBranchFilterChange(branchId: string): void {
    if (this.isBranchLocked()) {
      return;
    }
    this.selectedBranchId.set(branchId);
    this.selectedRoomId.set('ALL');
    this.loadSchedules();
    this.loadRooms(branchId);
  }

  openCreateScheduleForSlot(date: string, startTimeStr: string, roomId?: string): void {
    this.openCreateScheduleModal();
    let curBranch = this.scheduleForm().branchId;
    if (roomId) {
      const r = this.rooms().find(rm => rm.id === roomId);
      if (r && r.branchId) {
        curBranch = r.branchId;
      }
    }
    this.scheduleForm.update(f => ({
      ...f,
      branchId: curBranch,
      date: date || f.date,
      startTimeStr: startTimeStr || f.startTimeStr,
      roomId: roomId || f.roomId
    }));
  }

  // --- Modal Openers ---
  openCreateScheduleModal(): void {
    const rawBranch = this.selectedBranchId();
    let curBranch = (rawBranch && rawBranch !== 'ALL') ? rawBranch : (this.branches()[0]?.id ?? '');
    if (this.isBranchLocked()) {
      const managerBranchId = this.userRestrictedBranchId();
      if (managerBranchId) {
        curBranch = managerBranchId;
      }
    }

    const isSameBranchRooms = this.rooms().length > 0 && this.rooms()[0]?.branchId === curBranch;
    const initialRoom = isSameBranchRooms ? this.rooms()[0] : null;

    if (!isSameBranchRooms) {
      this.rooms.set([]);
    }
    this.loadRooms(curBranch);

    this.scheduleForm.set({
      branchId: curBranch,
      roomId: initialRoom?.id ?? '',
      classTypeId: this.classTypes()[0]?.id ?? '',
      instructorId: this.instructors()[0]?.id ?? '',
      date: this.getDefaultDate(),
      startTimeStr: '08:00',
      durationMinutes: this.classTypes()[0]?.defaultDurationMinutes ?? 60,
      maxCapacity: initialRoom?.maxCapacity ?? 20
    });

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isCreateScheduleOpen.set(true);
  }

  closeCreateScheduleModal(): void {
    if (this.isSubmittingSchedule()) return;
    this.isCreateScheduleOpen.set(false);
  }

  onScheduleFormBranchChange(branchId: string): void {
    if (this.auth.isBranchManager()) {
      return;
    }
    this.scheduleForm.update(f => ({ ...f, branchId }));
    this.loadRooms(branchId);
  }

  onScheduleFormRoomChange(roomId: string): void {
    const r = this.rooms().find(rm => rm.id === roomId);
    this.scheduleForm.update(f => ({
      ...f,
      roomId,
      maxCapacity: r ? r.maxCapacity : f.maxCapacity
    }));
  }

  onScheduleFormClassTypeChange(classTypeId: string): void {
    const ct = this.classTypes().find(c => c.id === classTypeId);
    this.scheduleForm.update(f => ({
      ...f,
      classTypeId,
      durationMinutes: ct ? ct.defaultDurationMinutes : f.durationMinutes
    }));
  }

  onScheduleFormInstructorChange(instructorId: string): void {
    this.scheduleForm.update(f => ({ ...f, instructorId }));
  }

  submitCreateSchedule(): void {
    const form = this.scheduleForm();
    if (this.auth.isBranchManager()) {
      const managerBranchId = this.auth.userHomeBranchId();
      if (managerBranchId && form.branchId !== managerBranchId) {
        this.errorMessage.set('Bạn chỉ có thể tạo ca học cho cơ sở mình đang phụ trách.');
        return;
      }
    }

    if (!form.branchId || !form.roomId || !form.classTypeId || !form.instructorId || !form.date || !form.startTimeStr) {
      this.toast.warning('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      this.errorMessage.set('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    // Build ISO timestamps
    const [startHour, startMinute] = form.startTimeStr.split(':').map(Number);
    const startDate = new Date(`${form.date}T00:00:00`);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(startDate.getTime() + form.durationMinutes * 60 * 1000);

    if (startDate.getTime() <= Date.now()) {
      this.toast.warning('Thời gian bắt đầu ca học phải ở thời điểm tương lai.');
      this.errorMessage.set('Thời gian bắt đầu ca học phải ở thời điểm tương lai.');
      return;
    }

    // Kiểm tra trùng lịch phòng tập và huấn luyện viên từ danh sách lịch đã tải
    const reqStartMs = startDate.getTime();
    const reqEndMs = endDate.getTime();

    const roomConflict = this.schedules().find(s =>
      s.roomId === form.roomId &&
      s.status !== 'CANCELLED' &&
      new Date(s.startTime).getTime() < reqEndMs &&
      new Date(s.endTime).getTime() > reqStartMs
    );
    if (roomConflict) {
      this.toast.error(`Phòng tập đã có ca học [${roomConflict.className}] (${this.formatTime(roomConflict.startTime)} - ${this.formatTime(roomConflict.endTime)}) trong khung giờ này.`);
      return;
    }

    const instructorConflict = this.schedules().find(s =>
      s.instructorId === form.instructorId &&
      s.status !== 'CANCELLED' &&
      new Date(s.startTime).getTime() < reqEndMs &&
      new Date(s.endTime).getTime() > reqStartMs
    );
    if (instructorConflict) {
      this.toast.error(`Huấn luyện viên đã có lịch dạy ca [${instructorConflict.className}] (${this.formatTime(instructorConflict.startTime)} - ${this.formatTime(instructorConflict.endTime)}) trong khung giờ này.`);
      return;
    }

    const req: CreateScheduleReq = {
      branchId: form.branchId,
      roomId: form.roomId,
      classTypeId: form.classTypeId,
      instructorId: form.instructorId,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      maxCapacity: Number(form.maxCapacity)
    };

    this.isSubmittingSchedule.set(true);
    this.errorMessage.set(null);

    this.scheduleApi.createSchedule(req).subscribe({
      next: () => {
        this.isSubmittingSchedule.set(false);
        this.isCreateScheduleOpen.set(false);
        this.toast.success('Đã mở ca học mới thành công vào lịch!');
        this.loadSchedules();
      },
      error: (err) => {
        this.isSubmittingSchedule.set(false);
        this.toast.error(err?.error?.message || 'Không thể tạo ca học. Vui lòng kiểm tra lại khung giờ và phòng tập.');
      }
    });
  }

  async cancelSchedule(schedule: ClassSchedule): Promise<void> {
    const confirmed = await this.confirmService.confirmCancel({
      title: 'Xác Nhận Hủy Ca Học',
      itemName: `${schedule.className} (${this.formatTime(schedule.startTime)} - ${this.formatDate(schedule.startTime)})`,
      details: 'Học viên đã đặt chỗ sẽ nhận được thông báo và được hoàn trả lượt tập vào tài khoản.',
      confirmText: 'Xác Nhận Hủy Ca'
    });

    if (!confirmed) {
      return;
    }

    this.isLoading.set(true);
    this.scheduleApi.cancelSchedule(schedule.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success(`Đã hủy ca học [${schedule.className}] thành công.`);
        this.loadSchedules();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err?.error?.message || 'Không thể hủy ca học.');
      }
    });
  }

  // --- Modal Openers: Attendees ---
  openAttendeesModal(schedule: ClassSchedule): void {
    this.selectedScheduleForAttendees.set(schedule);
    this.isAttendeesOpen.set(true);
    this.isLoadingAttendees.set(true);
    this.attendeesList.set([]);

    this.scheduleApi.getScheduleAttendees(schedule.id).subscribe({
      next: (list) => {
        this.attendeesList.set(list || []);
        this.isLoadingAttendees.set(false);
      },
      error: (err) => {
        this.isLoadingAttendees.set(false);
        this.errorMessage.set(err?.error?.message || 'Không thể tải danh sách học viên đăng ký.');
      }
    });
  }

  closeAttendeesModal(): void {
    this.isAttendeesOpen.set(false);
    this.selectedScheduleForAttendees.set(null);
  }

  // --- Modal Openers: Create Class Type ---
  openCreateClassTypeModal(): void {
    this.classTypeForm.set({
      code: '',
      name: '',
      description: '',
      defaultDurationMinutes: 60,
      intensityLevel: 'ALL_LEVELS'
    });
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.isCreateClassTypeOpen.set(true);
  }

  closeCreateClassTypeModal(): void {
    if (this.isSubmittingClassType()) return;
    this.isCreateClassTypeOpen.set(false);
  }

  submitCreateClassType(): void {
    const form = this.classTypeForm();
    if (!form.code.trim() || !form.name.trim() || !form.defaultDurationMinutes) {
      this.errorMessage.set('Vui lòng nhập đầy đủ mã, tên bộ môn và thời lượng.');
      return;
    }

    this.isSubmittingClassType.set(true);
    this.errorMessage.set(null);

    this.scheduleApi.createClassType({
      ...form,
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      defaultDurationMinutes: Number(form.defaultDurationMinutes)
    }).subscribe({
      next: () => {
        this.isSubmittingClassType.set(false);
        this.isCreateClassTypeOpen.set(false);
        this.successMessage.set('Đã thêm bộ môn / loại lớp học mới thành công!');
        this.loadClassTypes();
      },
      error: (err) => {
        this.isSubmittingClassType.set(false);
        this.errorMessage.set(err?.error?.message || 'Không thể thêm bộ môn. Mã bộ môn có thể đã tồn tại.');
      }
    });
  }

  async deleteClassType(ct: ClassTypeItem): Promise<void> {
    const confirmed = await this.confirmService.confirmDelete({
      title: 'Xóa Bộ Môn Yoga',
      itemName: `${ct.name} (${ct.code})`,
      details: 'Nếu bộ môn chưa từng có ca học nào, hệ thống sẽ xóa vĩnh viễn. Nếu đã có ca học liên kết trong lịch sử, bộ môn sẽ được chuyển sang trạng thái Tạm Dừng.',
      confirmText: 'Xác Nhận Xóa'
    });

    if (!confirmed) {
      return;
    }

    this.isLoading.set(true);
    this.scheduleApi.deleteClassType(ct.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success(`Đã xử lý xóa bộ môn [${ct.name}] thành công.`);
        this.loadClassTypes();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err?.error?.message || 'Không thể xóa bộ môn này.');
      }
    });
  }

  // Helpers
  private getDefaultDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  }

  getIntensityLabel(level: string): string {
    switch (level) {
      case 'BEGINNER': return 'Cơ bản';
      case 'INTERMEDIATE': return 'Trung cấp';
      case 'ADVANCED': return 'Nâng cao';
      default: return 'Mọi cấp độ';
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'status-scheduled';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'COMPLETED': return 'status-completed';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-neutral';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'SCHEDULED': return 'Đang mở đăng ký';
      case 'IN_PROGRESS': return 'Đang diễn ra';
      case 'COMPLETED': return 'Đã hoàn thành';
      case 'CANCELLED': return 'Đã hủy ca';
      default: return status;
    }
  }
}
