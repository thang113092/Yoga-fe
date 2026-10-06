import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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

  // Active Tab
  readonly activeTab = signal<'schedules' | 'class-types'>('schedules');

  // Core Data
  readonly branches = signal<BranchItem[]>([]);
  readonly rooms = signal<RoomItem[]>([]);
  readonly classTypes = signal<ClassTypeItem[]>([]);
  readonly instructors = signal<InstructorItem[]>([]);
  readonly schedules = signal<ClassSchedule[]>([]);

  // Selected filters
  readonly selectedBranchId = signal<string>('');
  readonly selectedInstructorId = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly dateFilter = signal<string>('');
  readonly statusFilter = signal<string>('ALL');

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

  // Computed Options for ZenSelect
  readonly branchSelectOptions = computed(() => {
    return this.branches().map(b => ({
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
    return [
      { value: 'ALL', label: 'Tất cả huấn luyện viên' },
      ...this.instructors().map(ins => ({
        value: ins.id,
        label: ins.fullName,
        sublabel: ins.phone
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

  getBranchName(schedule: ClassSchedule): string {
    if (schedule.branchName) return schedule.branchName;
    const b = this.branches().find(item => item.id === schedule.branchId);
    return b ? b.name : 'Chi nhánh';
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
    this.dateFilter.set('');
    this.selectedInstructorId.set('ALL');
    this.statusFilter.set('ALL');
  }

  readonly hasActiveFilters = computed(() => {
    return !!(
      this.searchQuery().trim() ||
      this.dateFilter() ||
      this.selectedInstructorId() !== 'ALL' ||
      this.statusFilter() !== 'ALL'
    );
  });

  // Filtered schedules
  readonly filteredSchedules = computed(() => {
    let list = this.schedules();
    const query = this.searchQuery().trim().toLowerCase();
    const st = this.statusFilter();
    const insId = this.selectedInstructorId();
    const targetDate = this.dateFilter();

    if (st !== 'ALL') {
      list = list.filter(s => s.status === st);
    }

    if (insId && insId !== 'ALL') {
      list = list.filter(s => s.instructorId === insId);
    }

    if (targetDate) {
      list = list.filter(s => this.getScheduleDateStr(s.startTime) === targetDate);
    }

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

  ngOnInit(): void {
    this.loadBranches();
    this.loadClassTypes();
    this.loadInstructors();
  }

  loadBranches(): void {
    this.scheduleApi.getBranches().subscribe({
      next: (data) => {
        this.branches.set(data || []);
        if (data && data.length > 0 && !this.selectedBranchId()) {
          // If branch manager, try to match homeBranchId
          const homeBranch = this.auth.userHomeBranchId();
          const target = data.find(b => b.id === homeBranch) || data[0];
          this.selectedBranchId.set(target.id);
          this.loadSchedules();
          this.loadRooms(target.id);
        }
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Không thể tải danh sách cơ sở.');
      }
    });
  }

  loadRooms(branchId: string): void {
    if (!branchId) return;
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
    this.scheduleApi.getInstructors().subscribe({
      next: (instList) => {
        this.instructors.set(instList || []);
        if (instList && instList.length > 0) {
          this.scheduleForm.update(f => ({
            ...f,
            instructorId: instList[0].id
          }));
        }
      },
      error: () => {
        this.instructors.set([]);
      }
    });
  }

  loadSchedules(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.scheduleApi.getSchedules(this.selectedBranchId() || undefined).subscribe({
      next: (res) => {
        this.schedules.set(res || []);
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
    this.selectedBranchId.set(branchId);
    this.loadSchedules();
    this.loadRooms(branchId);
  }

  // --- Modal Openers ---
  openCreateScheduleModal(): void {
    const curBranch = this.selectedBranchId() || (this.branches()[0]?.id ?? '');
    this.loadRooms(curBranch);

    this.scheduleForm.set({
      branchId: curBranch,
      roomId: this.rooms()[0]?.id ?? '',
      classTypeId: this.classTypes()[0]?.id ?? '',
      instructorId: this.instructors()[0]?.id ?? '',
      date: this.getDefaultDate(),
      startTimeStr: '08:00',
      durationMinutes: this.classTypes()[0]?.defaultDurationMinutes ?? 60,
      maxCapacity: this.rooms()[0]?.maxCapacity ?? 20
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
    if (!form.branchId || !form.roomId || !form.classTypeId || !form.instructorId || !form.date || !form.startTimeStr) {
      this.errorMessage.set('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    // Build ISO timestamps
    const [startHour, startMinute] = form.startTimeStr.split(':').map(Number);
    const startDate = new Date(`${form.date}T00:00:00`);
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date(startDate.getTime() + form.durationMinutes * 60 * 1000);

    if (startDate.getTime() <= Date.now()) {
      this.errorMessage.set('Thời gian bắt đầu ca học phải ở thời điểm tương lai.');
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
