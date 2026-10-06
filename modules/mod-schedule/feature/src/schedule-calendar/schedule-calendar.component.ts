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
    return this.studentPasses().map(pass => ({
      value: pass.id,
      label: `Thẻ ${pass.membershipCode}`,
      sublabel: `Còn ${pass.remainingSessions !== null && pass.remainingSessions !== undefined ? pass.remainingSessions : '∞'} buổi`
    }));
  });

  // State Signals
  readonly activeTab = signal<'calendar' | 'my-bookings'>('calendar');
  readonly branches = signal<BranchItem[]>([]);
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

  // Booking Modal State
  readonly bookingModalSchedule = signal<ClassSchedule | null>(null);
  readonly waitlistModalSchedule = signal<ClassSchedule | null>(null);
  readonly selectedPassId = signal<string>('');
  readonly selectedMatNumber = signal<number>(1);
  readonly isSubmittingBooking = signal(false);
  readonly isSubmittingWaitlist = signal(false);

  // Filtered schedules
  readonly filteredSchedules = computed(() => {
    const list = this.schedules();
    const cat = this.selectedCategory();
    const upcoming = list.filter(s => s.status === 'SCHEDULED' && Date.parse(s.startTime) > Date.now());
    if (cat === 'ALL') return upcoming;
    return upcoming.filter(s => s.className.toLowerCase().includes(cat.toLowerCase()));
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
        if (data && data.length > 0 && !this.selectedBranch()) {
          this.selectedBranch.set(data[0].id);
          this.loadSchedules();
        }
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

  openBookingModal(schedule: ClassSchedule): void {
    if (!this.auth.isStudent()) { this.errorMessage.set('Đăng nhập tài khoản học viên để đặt chỗ.'); return; }
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
        this.successMessage.set(`🎉 Đặt chỗ thành công! Mã booking: ${booking.bookingCode}. Vị trí thảm số ${booking.matNumber ?? 'được sắp xếp tại phòng'}. Hệ thống đã giữ 1 lượt tập.`);

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
        this.successMessage.set(`⏳ Đã đăng ký vào Hàng chờ thành công! Bạn đang ở vị trí #${res.queuePosition}. Khi có học viên hủy chỗ, hệ thống sẽ tự động đôn bạn lên và giữ chỗ!`);
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
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(schedule.startTime));
    return this.studentPasses().filter(p => p.status === 'ACTIVE' && (p.remainingSessions == null || p.remainingSessions > 0)
      && p.startDate <= date && (!p.endDate || p.endDate >= date) && (p.isAllBranches || p.registeredBranchId === schedule.branchId));
  }

  isBooked(scheduleId: string): boolean {
    return this.myBookings().some(b => b.scheduleId === scheduleId && b.status === 'CONFIRMED');
  }

  getWaitingItem(scheduleId: string): StudentWaitlistResp | undefined {
    return this.myWaitlists().find(w => w.scheduleId === scheduleId && w.status === 'WAITING');
  }
}
