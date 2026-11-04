import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { ZEN_UI, ZenConfirmService, ZenToastService, ZenTone } from '@yoga/platform/ui';
import {
  BranchItem,
  ClassSchedule,
  ClassTypeItem,
  InstructorItem,
  RoomItem,
  ScheduleApi,
  ScheduleAttendee
} from '@yoga/mod-schedule/data-access';
import { OnlineSessionPanelComponent } from './online-session-panel.component';

const VN_OFFSET = '+07:00';

function vnToday(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

interface OnlineClassForm {
  branchId: string;
  roomId: string;
  classTypeId: string;
  instructorId: string;
  date: string;
  time: string;
  durationMinutes: number;
  maxCapacity: number;
}

/**
 * Online classes of every studio branch: list, create, Zoom room status and attendees.
 * Super admins see all branches, other staff their own branches, instructors the classes they teach.
 */
@Component({
  selector: 'yoga-online-classes',
  standalone: true,
  imports: [CommonModule, FormsModule, OnlineSessionPanelComponent, ...ZEN_UI],
  templateUrl: './online-classes.component.html',
  styleUrls: ['./online-classes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnlineClassesComponent implements OnInit {
  private readonly scheduleApi = inject(ScheduleApi);
  private readonly toast = inject(ZenToastService);
  private readonly confirm = inject(ZenConfirmService);
  protected readonly auth = inject(AuthService);

  readonly branches = signal<BranchItem[]>([]);
  readonly schedules = signal<ClassSchedule[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly branchFilter = signal<string>('ALL');
  readonly fromDate = signal<string>(vnToday());
  readonly toDate = signal<string>(vnToday(30));
  readonly search = signal('');
  readonly showCancelled = signal(false);

  readonly selected = signal<ClassSchedule | null>(null);
  readonly attendees = signal<ScheduleAttendee[]>([]);
  readonly loadingAttendees = signal(false);
  readonly cancelling = signal(false);

  readonly formOpen = signal(false);
  readonly form = signal<OnlineClassForm | null>(null);
  readonly formRooms = signal<RoomItem[]>([]);
  readonly formInstructors = signal<InstructorItem[]>([]);
  readonly classTypes = signal<ClassTypeItem[]>([]);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);

  readonly canManage = computed(() => this.auth.isSuperAdmin() || this.auth.isBranchManager());
  /** Instructors only see the classes they teach, in any branch. */
  readonly ownClassesOnly = computed(() => this.auth.isInstructor());

  readonly branchOptions = computed(() => {
    const list = this.branches().map(b => ({ value: b.id, label: b.name, sublabel: b.address }));
    return list.length > 1 ? [{ value: 'ALL', label: 'Tất cả cơ sở', sublabel: 'Mọi cơ sở bạn quản lý' }, ...list] : list;
  });
  readonly formBranchOptions = computed(() => this.branches().map(b => ({ value: b.id, label: b.name, sublabel: b.address })));
  readonly formRoomOptions = computed(() => this.formRooms().map(r => ({
    value: r.id,
    label: r.name,
    sublabel: `${r.maxCapacity} chỗ · Zoom: ${r.liveHostAccount || 'tài khoản mặc định'}`
  })));
  readonly formTypeOptions = computed(() => this.classTypes().map(t => ({ value: t.id, label: t.name, sublabel: `${t.defaultDurationMinutes} phút` })));
  readonly formInstructorOptions = computed(() => this.formInstructors().map(i => ({ value: i.id, label: i.fullName, sublabel: i.phone })));
  readonly selectedFormRoom = computed(() => this.formRooms().find(r => r.id === this.form()?.roomId) ?? null);

  readonly visibleSchedules = computed(() => {
    const allowed = new Set(this.branches().map(b => b.id));
    const query = this.search().trim().toLowerCase();
    const branch = this.branchFilter();
    return this.schedules()
      .filter(s => this.ownClassesOnly() || allowed.has(s.branchId))
      .filter(s => branch === 'ALL' || s.branchId === branch)
      .filter(s => this.showCancelled() || s.status !== 'CANCELLED')
      .filter(s => !query || [s.className, s.instructorName, s.branchName, s.roomName].some(v => v?.toLowerCase().includes(query)))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  readonly stats = computed(() => {
    const list = this.visibleSchedules().filter(s => s.status !== 'CANCELLED');
    const now = Date.now();
    return {
      total: list.length,
      live: list.filter(s => Date.parse(s.startTime) <= now && now < Date.parse(s.endTime)).length,
      booked: list.reduce((sum, s) => sum + (s.bookedCount || 0), 0)
    };
  });

  ngOnInit(): void {
    this.scheduleApi.getBranches().subscribe({
      next: (list) => {
        const home = this.auth.userHomeBranchId();
        const mine = new Set(this.auth.branchIds());
        this.branches.set((list || []).filter(b => !b.isVirtual && b.isActive !== false
          && (this.auth.isSuperAdmin() || this.ownClassesOnly() || b.id === home || mine.has(b.id))));
        if (this.branches().length === 1) this.branchFilter.set(this.branches()[0].id);
        this.load();
      },
      error: (err) => this.error.set(err?.error?.message || 'Không tải được danh sách cơ sở.')
    });
  }

  load(): void {
    const from = this.fromDate(), to = this.toDate();
    if (!from || !to || from > to) {
      this.error.set('Khoảng ngày không hợp lệ.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const branchId = this.branchFilter() !== 'ALL' && !this.ownClassesOnly() ? this.branchFilter() : undefined;
    const instructorId = this.ownClassesOnly() ? this.auth.currentUserId() ?? undefined : undefined;
    this.scheduleApi.getSchedules(branchId, `${from}T00:00:00${VN_OFFSET}`, `${to}T23:59:59${VN_OFFSET}`, instructorId, 'ONLINE').subscribe({
      next: (list) => {
        this.schedules.set(list || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.schedules.set([]);
        this.error.set(err?.error?.message || 'Không tải được lớp online (khoảng ngày tối đa 93 ngày).');
      }
    });
  }

  onBranchFilter(id: string): void {
    this.branchFilter.set(id);
    this.load();
  }

  isLive(s: ClassSchedule): boolean {
    const now = Date.now();
    return s.status !== 'CANCELLED' && Date.parse(s.startTime) <= now && now < Date.parse(s.endTime);
  }

  statusLabel(s: ClassSchedule): string {
    if (s.status === 'CANCELLED') return 'Đã hủy';
    if (this.isLive(s)) return 'Đang diễn ra';
    if (Date.parse(s.endTime) <= Date.now() || s.status === 'COMPLETED') return 'Đã kết thúc';
    return 'Sắp diễn ra';
  }

  statusTone(s: ClassSchedule): ZenTone {
    if (s.status === 'CANCELLED') return 'neutral';
    if (this.isLive(s)) return 'info';
    if (Date.parse(s.endTime) <= Date.now()) return 'neutral';
    return 'success';
  }

  attendeeLabel(status: string): string {
    return ({ CONFIRMED: 'Đã đặt chỗ', ATTENDED: 'Đã vào lớp', NO_SHOW: 'Vắng', CANCELLED: 'Đã hủy' } as Record<string, string>)[status] ?? status;
  }

  attendeeTone(status: string): ZenTone {
    return ({ CONFIRMED: 'success', ATTENDED: 'info', NO_SHOW: 'warning' } as Record<string, ZenTone>)[status] ?? 'neutral';
  }

  // --- Detail ---
  open(s: ClassSchedule): void {
    this.selected.set(s);
    this.attendees.set([]);
    this.loadingAttendees.set(true);
    this.scheduleApi.getScheduleAttendees(s.id).subscribe({
      next: (list) => {
        if (this.selected()?.id === s.id) this.attendees.set(list || []);
        this.loadingAttendees.set(false);
      },
      error: (err) => {
        this.loadingAttendees.set(false);
        this.toast.error(err?.error?.message || 'Không tải được danh sách học viên.');
      }
    });
  }

  close(): void {
    if (!this.cancelling()) this.selected.set(null);
  }

  canCancel(s: ClassSchedule): boolean {
    return this.canManage() && s.status === 'SCHEDULED' && Date.parse(s.startTime) > Date.now();
  }

  async cancel(s: ClassSchedule): Promise<void> {
    if (s.bookedCount > 0) {
      this.toast.error('Lớp đã có học viên đặt chỗ. Hãy hủy các lượt đặt chỗ (hoàn buổi cho học viên) trước khi hủy lớp.');
      return;
    }
    const ok = await this.confirm.confirmCancel({
      title: 'Hủy lớp online',
      itemName: `${s.className} · ${this.formatDateTime(s.startTime)}`,
      details: 'Phòng Zoom của buổi học sẽ được xóa.',
      confirmText: 'Hủy lớp'
    });
    if (!ok) return;
    this.cancelling.set(true);
    this.scheduleApi.cancelSchedule(s.id).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.selected.set(null);
        this.toast.success('Đã hủy lớp online.');
        this.load();
      },
      error: (err) => {
        this.cancelling.set(false);
        this.toast.error(err?.error?.message || 'Không thể hủy lớp.');
      }
    });
  }

  // --- Create ---
  openCreate(): void {
    const branchId = this.branchFilter() !== 'ALL' ? this.branchFilter() : (this.branches()[0]?.id ?? '');
    this.form.set({ branchId, roomId: '', classTypeId: '', instructorId: '', date: vnToday(), time: '', durationMinutes: 40, maxCapacity: 20 });
    this.formError.set(null);
    this.formOpen.set(true);
    if (!this.classTypes().length) {
      this.scheduleApi.getClassTypes(true).subscribe({ next: (list) => this.classTypes.set(list || []), error: () => this.classTypes.set([]) });
    }
    if (branchId) this.loadBranchOptions(branchId);
  }

  closeCreate(): void {
    if (!this.saving()) this.formOpen.set(false);
  }

  patchForm(patch: Partial<OnlineClassForm>): void {
    const current = this.form();
    if (!current) return;
    this.form.set({ ...current, ...patch });
    if (patch.branchId && patch.branchId !== current.branchId) {
      this.form.set({ ...this.form()!, roomId: '', instructorId: '' });
      this.loadBranchOptions(patch.branchId);
    }
    if (patch.classTypeId) {
      const type = this.classTypes().find(t => t.id === patch.classTypeId);
      if (type && !current.classTypeId && patch.durationMinutes === undefined) this.form.set({ ...this.form()!, durationMinutes: type.defaultDurationMinutes });
    }
  }

  private loadBranchOptions(branchId: string): void {
    this.formRooms.set([]);
    this.formInstructors.set([]);
    forkJoin([this.scheduleApi.getRoomsByBranch(branchId), this.scheduleApi.getInstructors(branchId)]).subscribe({
      next: ([rooms, instructors]) => {
        if (this.form()?.branchId !== branchId) return;
        const online = (rooms || []).filter(r => r.roomType === 'VIRTUAL' && r.isActive);
        this.formRooms.set(online);
        this.formInstructors.set(instructors || []);
        const f = this.form()!;
        this.form.set({ ...f, roomId: f.roomId || online[0]?.id || '', maxCapacity: Math.min(f.maxCapacity, online[0]?.maxCapacity ?? f.maxCapacity) });
      },
      error: (err) => this.formError.set(err?.error?.message || 'Không tải được phòng online và huấn luyện viên của cơ sở.')
    });
  }

  submit(): void {
    const f = this.form();
    if (!f || this.saving()) return;
    if (!f.branchId || !f.roomId || !f.classTypeId || !f.instructorId || !f.date || !f.time) {
      this.formError.set('Vui lòng chọn đủ cơ sở, phòng online, bộ môn, huấn luyện viên, ngày và giờ bắt đầu.');
      return;
    }
    const start = new Date(`${f.date}T${f.time}:00${VN_OFFSET}`);
    const duration = Number(f.durationMinutes);
    const capacity = Number(f.maxCapacity);
    const room = this.selectedFormRoom();
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) {
      this.formError.set('Giờ bắt đầu phải ở tương lai.');
      return;
    }
    if (!(duration >= 15 && duration <= 240)) {
      this.formError.set('Thời lượng từ 15 đến 240 phút.');
      return;
    }
    if (!(capacity >= 1) || (room && capacity > room.maxCapacity)) {
      this.formError.set(`Sĩ số từ 1 đến ${room?.maxCapacity ?? 'sức chứa phòng'}.`);
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.scheduleApi.createSchedule({
      branchId: f.branchId,
      roomId: f.roomId,
      classTypeId: f.classTypeId,
      instructorId: f.instructorId,
      startTime: start.toISOString(),
      endTime: new Date(start.getTime() + duration * 60_000).toISOString(),
      maxCapacity: capacity
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success('Đã tạo lớp online. Phòng Zoom sẽ được tạo trong khoảng 30 giây.');
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message || 'Không thể tạo lớp online.');
      }
    });
  }

  formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }
}
