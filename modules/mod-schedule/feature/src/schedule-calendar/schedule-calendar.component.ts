import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@yoga/platform/auth';
import { ZenSelectComponent, ZenConfirmService, ZenToastService } from '@yoga/platform/api';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  BookingApi,
  BranchItem,
  ClassSchedule,
  CreateBookingReq,
  ScheduleApi,
  StudentBookingDetail,
  StudentPassItem,
  StudentWaitlistResp,
  WaitlistApi,
  WaitlistJoinReq
} from '@yoga/mod-schedule/data-access';

@Component({
  selector: 'yoga-schedule-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ZenSelectComponent],
  templateUrl: './schedule-calendar.component.html',
  styleUrls: ['./schedule-calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScheduleCalendarComponent implements OnInit {
  private readonly scheduleApi = inject(ScheduleApi);
  private readonly bookingApi = inject(BookingApi);
  private readonly waitlistApi = inject(WaitlistApi);
  private readonly confirmService = inject(ZenConfirmService);
  private readonly toast = inject(ZenToastService);

  protected readonly auth = inject(AuthService);
  get currentStudentId(): string { return this.auth.currentUserId() ?? ''; }
  readonly defaultBranchId = '';
  private scheduleRequest = 0;

  onBranchChange(id: string): void {
    this.selectedBranch.set(id);
    this.loadSchedules();
  }

  protected readonly bookingPassOptions = computed(() => {
    const list = this.eligiblePasses(this.bookingModalSchedule());
    return list.map(pass => ({
      value: pass.id,
      label: `Thẻ ${pass.membershipCode}`,
      sublabel: `Còn ${pass.remainingSessions !== null && pass.remainingSessions !== undefined ? pass.remainingSessions : '∞'} buổi`
    }));
  });

  protected readonly waitlistPassOptions = computed(() => {
    const list = this.eligiblePasses(this.waitlistModalSchedule());
    return list.map(pass => ({
      value: pass.id,
      label: `Thẻ ${pass.membershipCode}`,
      sublabel: `Còn ${pass.remainingSessions !== null && pass.remainingSessions !== undefined ? pass.remainingSessions : '∞'} buổi`
    }));
  });

  // State Signals
  readonly activeTab = signal<'calendar' | 'my-bookings'>('calendar');
  readonly branches = signal<BranchItem[]>([]);
  readonly branchOptions = computed<Array<{ id: string; name: string }>>(() => [
    { id: '', name: 'Tất cả cơ sở' },
    ...this.branches()
  ]);
  readonly schedules = signal<ClassSchedule[]>([]);
  readonly myBookings = signal<StudentBookingDetail[]>([]);
  readonly myWaitlists = signal<StudentWaitlistResp[]>([]);
  readonly studentPasses = signal<StudentPassItem[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filter Signals
  readonly selectedBranch = signal<string>(this.defaultBranchId);
  readonly selectedCategory = signal<string>('ALL');
  readonly selectedDate = signal<string>('ALL');
  readonly searchQuery = signal<string>('');

  // Booking Modal State
  readonly bookingModalSchedule = signal<ClassSchedule | null>(null);
  readonly waitlistModalSchedule = signal<ClassSchedule | null>(null);
  readonly selectedPassId = signal<string>('');
  readonly selectedMatNumber = signal<number>(1);
  readonly isSubmittingBooking = signal(false);
  readonly isSubmittingWaitlist = signal(false);

  // Month & Day Calendar State
  readonly currentMonth = signal<Date>(new Date());

  readonly currentMonthLabel = computed(() => {
    const d = this.currentMonth();
    return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  });

  readonly monthDays = computed(() => {
    const monthDate = this.currentMonth();
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const list = this.schedules().filter(s => s.status === 'SCHEDULED' && Date.parse(s.startTime) > Date.now());
    const scheduleCountMap = new Map<string, number>();
    for (const s of list) {
      const dateKey = s.startTime.substring(0, 10);
      scheduleCountMap.set(dateKey, (scheduleCountMap.get(dateKey) || 0) + 1);
    }

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    const numDays = new Date(year, month + 1, 0).getDate();
    const shortDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const fullDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

    const days = [];
    for (let day = 1; day <= numDays; day++) {
      const d = new Date(year, month, day);
      const dayStr = String(day).padStart(2, '0');
      const monthStr = String(month + 1).padStart(2, '0');
      const isoDate = `${year}-${monthStr}-${dayStr}`;
      const isToday = isoDate === todayStr;
      const count = scheduleCountMap.get(isoDate) || 0;

      days.push({
        isoDate,
        dayNumber: dayStr,
        dayName: shortDays[d.getDay()],
        fullDayName: fullDays[d.getDay()],
        isToday,
        count
      });
    }

    return days;
  });

  prevMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() - 1);
    this.currentMonth.set(d);
  }

  nextMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() + 1);
    this.currentMonth.set(d);
  }

  // Available unique dates for day picker
  readonly availableDates = computed(() => {
    const list = this.schedules().filter(s => s.status === 'SCHEDULED' && Date.parse(s.startTime) > Date.now());
    const dateMap = new Map<string, number>();

    for (const s of list) {
      const dateKey = s.startTime.substring(0, 10);
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    }

    const sortedDateKeys = Array.from(dateMap.keys()).sort();
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    return sortedDateKeys.map(dateKey => {
      const d = new Date(dateKey + 'T00:00:00');
      const shortDays = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const fullDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const isToday = dateKey === todayStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');

      return {
        isoDate: dateKey,
        dayName: isToday ? 'Hôm nay' : shortDays[d.getDay()],
        fullDayName: isToday ? 'Hôm nay' : fullDays[d.getDay()],
        dateStr: `${day}/${month}`,
        isToday,
        count: dateMap.get(dateKey) || 0
      };
    });
  });

  // Filtered schedules
  readonly filteredSchedules = computed(() => {
    const list = this.schedules();
    const cat = this.selectedCategory();
    const date = this.selectedDate();
    const query = this.searchQuery().trim().toLowerCase();
    const branch = this.selectedBranch();

    return list.filter(s => {
      if (s.status !== 'SCHEDULED' || Date.parse(s.startTime) <= Date.now()) {
        return false;
      }
      if (branch && s.branchId && s.branchId !== branch) {
        return false;
      }
      if (cat !== 'ALL' && !s.className.toLowerCase().includes(cat.toLowerCase())) {
        return false;
      }
      if (date !== 'ALL') {
        const sDate = s.startTime.substring(0, 10);
        if (sDate !== date) return false;
      }
      if (query) {
        const matchName = s.className?.toLowerCase().includes(query);
        const matchTeacher = s.instructorName?.toLowerCase().includes(query);
        const matchRoom = s.roomName?.toLowerCase().includes(query);
        const matchBranch = s.branchName?.toLowerCase().includes(query);
        if (!matchName && !matchTeacher && !matchRoom && !matchBranch) return false;
      }
      return true;
    });
  });

  // Upcoming confirmed bookings count
  readonly upcomingBookingCount = computed(() => {
    return this.myBookings().filter(b => b.status === 'CONFIRMED').length;
  });

  // Active waitlists count
  readonly activeWaitlistCount = computed(() => {
    return this.myWaitlists().filter(w => w.status === 'WAITING').length;
  });

  ngOnInit(): void {
    this.loadBranches();
    this.loadStudentPasses();
    this.loadSchedules();
    this.loadMyBookings();
    this.loadMyWaitlists();
  }

  loadBranches(): void {
    this.scheduleApi.getBranches().subscribe({
      next: (data) => {
        this.branches.set(data || []);
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'Không thể tải danh sách chi nhánh từ cơ sở dữ liệu');
      }
    });
  }

  loadStudentPasses(): void {
    if (!this.auth.isStudent()) return;
    this.scheduleApi.getStudentMemberships(this.currentStudentId).subscribe({
      next: (passes) => {
        this.studentPasses.set((passes || []).filter(p => p.status === 'ACTIVE' && (p.remainingSessions == null || p.remainingSessions > 0)));
        this.selectedPassId.set(this.studentPasses()[0]?.id ?? '');

      },
      error: () => {
        this.studentPasses.set([]);
        this.errorMessage.set("Không tải được thẻ tập. Hãy thử lại trước khi đặt chỗ.");
      }
    });
  }

  loadSchedules(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const version = ++this.scheduleRequest;
    this.scheduleApi.getSchedules(this.selectedBranch() || undefined).subscribe({
      next: (data) => {
        if (version !== this.scheduleRequest) return;
        this.schedules.set(data || []);
        if (data && data.length > 0) {
          const firstUpcoming = data.find(s => Date.parse(s.startTime) > Date.now());
          if (firstUpcoming) {
            this.currentMonth.set(new Date(firstUpcoming.startTime));
          }
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        if (version !== this.scheduleRequest) return;
        this.isLoading.set(false);
        this.schedules.set([]);
        this.errorMessage.set(err?.error?.message || 'Không thể kết nối máy chủ để tải lịch học');
      }
    });
  }

  loadMyBookings(): void {
    if (!this.auth.isStudent()) return;
    this.bookingApi.getStudentBookingDetails(this.currentStudentId).subscribe({
      next: (list) => {
        this.myBookings.set(list || []);
      },
      error: () => {
        this.myBookings.set([]);
        this.errorMessage.set("Không tải được lịch đã đặt.");
      }
    });
  }

  loadMyWaitlists(): void {
    if (!this.auth.isStudent()) return;
    this.waitlistApi.getStudentWaitlists(this.currentStudentId).subscribe({
      next: (list) => {
        this.myWaitlists.set(list || []);
      },
      error: () => {
        this.myWaitlists.set([]);
        this.errorMessage.set("Không tải được hàng chờ.");
      }
    });
  }

  canBookSchedule(schedule: ClassSchedule): boolean {
    if (!this.auth.isStudent()) return false;
    return this.eligiblePasses(schedule).length > 0;
  }

  isDifferentBranchOnly(schedule: ClassSchedule): boolean {
    if (!this.auth.isStudent()) return false;
    if (this.canBookSchedule(schedule)) return false;
    // Student has active passes, but none eligible for this schedule (e.g. single-branch at another branch)
    return this.studentPasses().some(p => p.status === 'ACTIVE');
  }

  openBookingModal(schedule: ClassSchedule): void {
    if (!this.auth.isStudent()) { this.errorMessage.set('Đăng nhập tài khoản học viên để đặt chỗ.'); return; }
    if (!this.canBookSchedule(schedule)) {
      this.toast.error('Lớp học thuộc cơ sở khác. Thẻ tập đơn cơ sở của bạn không áp dụng tại cơ sở này.');
      return;
    }
    if (this.hasTimeConflict(schedule)) {
      this.alertConflict(schedule);
      return;
    }
    this.bookingModalSchedule.set(schedule);
    const passes = this.eligiblePasses(schedule);
    this.selectedPassId.set(passes[0]?.id ?? '');
    this.selectedMatNumber.set(1);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  closeBookingModal(): void {
    if (this.isSubmittingBooking()) return;
    this.bookingModalSchedule.set(null);
  }

  openWaitlistModal(schedule: ClassSchedule): void {
    if (!this.auth.isStudent()) { this.errorMessage.set('Đăng nhập tài khoản học viên để tham gia hàng chờ.'); return; }
    if (!this.canBookSchedule(schedule)) {
      this.toast.error('Lớp học thuộc cơ sở khác. Thẻ tập đơn cơ sở của bạn không áp dụng tại cơ sở này.');
      return;
    }
    if (this.hasTimeConflict(schedule)) {
      this.alertConflict(schedule);
      return;
    }
    this.waitlistModalSchedule.set(schedule);
    const passes = this.eligiblePasses(schedule);
    this.selectedPassId.set(passes[0]?.id ?? '');
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  closeWaitlistModal(): void {
    if (this.isSubmittingWaitlist()) return;
    this.waitlistModalSchedule.set(null);
  }

  submitBooking(): void {
    const schedule = this.bookingModalSchedule();
    const passId = this.selectedPassId();
    if (!schedule || !passId || !this.auth.isStudent() || this.isSubmittingBooking() || this.isSubmittingWaitlist()) return;

    if (!this.canBookSchedule(schedule)) {
      this.toast.error('Lớp học thuộc cơ sở khác. Thẻ tập đơn cơ sở của bạn không áp dụng tại cơ sở này.');
      return;
    }

    if (this.hasTimeConflict(schedule)) {
      this.alertConflict(schedule);
      return;
    }

    this.isSubmittingBooking.set(true);
    this.errorMessage.set(null);

    const req: CreateBookingReq = {
      scheduleId: schedule.id,
      studentId: this.currentStudentId,
      membershipId: passId
    };

    this.bookingApi.createBooking(req).subscribe({
      next: (booking) => {
        this.isSubmittingBooking.set(false);
        this.closeBookingModal();
        this.successMessage.set(`Đặt chỗ thành công! Mã booking: ${booking.bookingCode}. Vị trí thảm số ${booking.matNumber ?? 'được sắp xếp tại phòng'}. Hệ thống đã giữ 1 lượt tập.`);

        // Nạp lại dữ liệu đồng bộ từ Database
        this.loadStudentPasses();
        this.loadMyBookings();
        this.loadSchedules();
      },
      error: (err) => {
        this.isSubmittingBooking.set(false);
        const msg = err?.error?.message || err?.message || 'Không thể đặt chỗ. Thẻ tập không hợp lệ hoặc đã kín chỗ.';
        this.errorMessage.set(msg);
      }
    });
  }

  submitWaitlist(): void {
    const schedule = this.waitlistModalSchedule();
    const passId = this.selectedPassId();
    if (!schedule || !passId || !this.auth.isStudent() || this.isSubmittingBooking() || this.isSubmittingWaitlist()) return;

    if (!this.canBookSchedule(schedule)) {
      this.toast.error('Lớp học thuộc cơ sở khác. Thẻ tập đơn cơ sở của bạn không áp dụng tại cơ sở này.');
      return;
    }

    if (this.hasTimeConflict(schedule)) {
      this.alertConflict(schedule);
      return;
    }

    this.isSubmittingWaitlist.set(true);
    this.errorMessage.set(null);

    const req: WaitlistJoinReq = {
      scheduleId: schedule.id,
      studentId: this.currentStudentId,
      membershipId: passId
    };

    this.waitlistApi.joinWaitlist(req).subscribe({
      next: (res) => {
        this.isSubmittingWaitlist.set(false);
        this.closeWaitlistModal();
        this.successMessage.set(`Đã đăng ký vào hàng chờ thành công! Bạn đang ở vị trí #${res.queuePosition}. Khi có học viên hủy chỗ, hệ thống sẽ tự động đôn bạn lên và giữ chỗ.`);
        this.loadMyWaitlists();
        this.loadSchedules();
      },
      error: (err) => {
        this.isSubmittingWaitlist.set(false);
        const msg = err?.error?.message || err?.message || 'Không thể đăng ký hàng chờ. Vui lòng kiểm tra lại thẻ tập.';
        this.errorMessage.set(msg);
      }
    });
  }

  async cancelWaitlist(item: StudentWaitlistResp): Promise<void> {
    if (this.isLoading()) return;

    const confirmed = await this.confirmService.confirmCancel({
      title: 'Rút Khỏi Hàng Chờ',
      itemName: `Lớp ${item.className}`,
      details: 'Bạn sẽ rời khỏi danh sách chờ của ca học này.',
      confirmText: 'Xác Nhận Rút'
    });

    if (!confirmed) {
      return;
    }

    this.isLoading.set(true);
    this.waitlistApi.cancelWaitlist(item.id, this.currentStudentId).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success(`Đã rút khỏi hàng chờ lớp ${item.className}.`);
        this.loadMyWaitlists();
        this.loadSchedules();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err?.error?.message || 'Không thể rút khỏi hàng chờ.');
      }
    });
  }

  async cancelBooking(booking: StudentBookingDetail): Promise<void> {
    const confirmed = await this.confirmService.confirmCancel({
      title: 'Xác Nhận Hủy Đặt Chỗ',
      itemName: `Mã ${booking.bookingCode} - Lớp ${booking.className}`,
      details: 'Hệ thống sẽ tự động hoàn trả 1 lượt tập vào thẻ của bạn và chuyển suất cho học viên chờ (nếu có).',
      confirmText: 'Hủy Đặt Chỗ'
    });

    if (!confirmed) {
      return;
    }

    this.isLoading.set(true);
    this.bookingApi.cancelBooking(booking.id, 'Học viên hủy trên ứng dụng').subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success(`Đã hủy đặt chỗ ${booking.bookingCode}. Hệ thống đã tự động hoàn trả 1 lượt tập vào thẻ của bạn.`);
        this.loadStudentPasses();
        this.loadMyBookings();
        this.loadSchedules();
        this.loadMyWaitlists();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error(err?.error?.message || 'Không thể hủy đặt chỗ.');
      }
    });
  }

  eligiblePasses(schedule: ClassSchedule | null): StudentPassItem[] {
    if (!schedule) return [];
    let date = '';
    try {
      if (schedule.startTime) {
        date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(schedule.startTime));
      }
    } catch {
      date = '';
    }
    return this.studentPasses().filter(p => {
      if (p.status !== 'ACTIVE' || (p.remainingSessions != null && p.remainingSessions <= 0)) {
        return false;
      }
      if (date) {
        if (p.startDate && p.startDate > date) return false;
        if (p.endDate && p.endDate < date) return false;
      }
      if (!p.isAllBranches && schedule.branchId && p.registeredBranchId !== schedule.branchId) {
        return false;
      }
      return true;
    });
  }

  isBooked(scheduleId: string): boolean {
    return this.myBookings().some(b => b.scheduleId === scheduleId && b.status === 'CONFIRMED');
  }

  getWaitingItem(scheduleId: string): StudentWaitlistResp | undefined {
    return this.myWaitlists().find(w => w.scheduleId === scheduleId && w.status === 'WAITING');
  }

  hasTimeConflict(schedule: ClassSchedule): boolean {
    return !!this.getConflictingBooking(schedule);
  }

  getConflictingBooking(schedule: ClassSchedule): StudentBookingDetail | undefined {
    const targetStart = new Date(schedule.startTime).getTime();
    const targetEnd = new Date(schedule.endTime).getTime();

    return this.myBookings().find(b => {
      if (b.status !== 'CONFIRMED' || b.scheduleId === schedule.id) {
        return false;
      }
      const existingStart = new Date(b.startTime).getTime();
      const existingEnd = new Date(b.endTime).getTime();
      return targetStart < existingEnd && targetEnd > existingStart;
    });
  }

  formatTime(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return '';
    }
  }

  getInitials(name?: string): string {
    if (!name) return 'HL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getDurationMinutes(start: string, end: string): number {
    try {
      const diff = new Date(end).getTime() - new Date(start).getTime();
      return Math.max(0, Math.round(diff / (1000 * 60)));
    } catch {
      return 60;
    }
  }

  formatDateLabel(iso: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[d.getDay()];
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${dayName}, ${day}/${month}/${year}`;
    } catch {
      return '';
    }
  }

  getCategoryBadge(className: string): { label: string; type: string } {
    const lower = (className || '').toLowerCase();
    if (lower.includes('hatha')) return { label: 'Hatha Yoga', type: 'hatha' };
    if (lower.includes('vinyasa')) return { label: 'Vinyasa Flow', type: 'vinyasa' };
    if (lower.includes('yin') || lower.includes('chuông')) return { label: 'Yin & Chuông', type: 'yin' };
    if (lower.includes('ashtanga')) return { label: 'Ashtanga', type: 'ashtanga' };
    return { label: 'Zen Yoga', type: 'zen' };
  }

  alertConflict(schedule: ClassSchedule): void {
    const conflict = this.getConflictingBooking(schedule);
    const timeRange = conflict
      ? `(${this.formatTime(conflict.startTime)} - ${this.formatTime(conflict.endTime)}: ${conflict.className})`
      : '';
    const msg = `Bạn đã có ca học khác trong cùng khung giờ ${timeRange}. Vui lòng chọn ca học khác hoặc hủy lịch đã đặt trước đó.`;
    this.errorMessage.set(msg);
    this.toast.error(msg);
  }
}

