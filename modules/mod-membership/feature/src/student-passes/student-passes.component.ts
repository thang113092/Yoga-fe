import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, finalize, catchError, of } from 'rxjs';
import { MembershipApi, MembershipResp, PosApi, StudentOrderHistoryResp } from '@yoga/mod-membership/data-access';
import { Branch, BranchApi } from '@yoga/mod-branch/data-access';
import { BookingApi, StudentBookingDetail, StudentWaitlistResp, WaitlistApi, WorkoutHistoryItem } from '@yoga/mod-schedule/data-access';
import { AuthService } from '@yoga/platform/auth';
import { QrCodeComponent } from '@yoga/platform/api';

@Component({
  selector: 'yoga-student-passes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, QrCodeComponent],
  templateUrl: './student-passes.component.html',
  styleUrl: './student-passes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentPassesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly membershipApi = inject(MembershipApi);
  private readonly bookingApi = inject(BookingApi);
  private readonly waitlistApi = inject(WaitlistApi);
  private readonly posApi = inject(PosApi, { optional: true });
  private readonly branchApi = inject(BranchApi, { optional: true });

  protected readonly auth = inject(AuthService);
  protected readonly activeTab = signal<'passes' | 'bookings' | 'waitlist'>('passes');
  protected readonly passes = signal<readonly MembershipResp[]>([]);
  protected readonly bookings = signal<readonly StudentBookingDetail[]>([]);
  protected readonly waitlists = signal<readonly StudentWaitlistResp[]>([]);
  protected readonly orders = signal<readonly StudentOrderHistoryResp[]>([]);
  protected readonly branches = signal<readonly Branch[]>([]);
  protected readonly workoutHistory = signal<readonly WorkoutHistoryItem[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedPassForQr = signal<MembershipResp | null>(null);
  protected readonly selectedBookingForQr = signal<StudentBookingDetail | null>(null);

  protected readonly nextBooking = computed(() =>
    this.bookings()
      .filter((b) => b.status === 'CONFIRMED' && Date.parse(b.startTime) > Date.now())
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0] ?? null
  );

  protected readonly upcomingBookings = computed(() =>
    this.bookings().filter((b) => b.status === 'CONFIRMED' && Date.parse(b.startTime) > Date.now())
  );

  protected readonly activeWaitlistCount = computed(
    () => this.waitlists().filter((w) => w.status === 'WAITING').length
  );

  // Thẻ đang hoạt động hoặc đang bảo lưu (thẻ hiện tại có hiệu lực)
  protected readonly activePasses = computed(() =>
    this.passes().filter((p) => p.status === 'ACTIVE' || p.status === 'FROZEN')
  );

  // Thẻ lịch sử / không còn hoạt động (đã thay thế, hết hạn, đã hủy...)
  protected readonly pastPasses = computed(() =>
    this.passes().filter((p) => p.status !== 'ACTIVE' && p.status !== 'FROZEN')
  );

  // Toàn bộ các thẻ đã từng mua sắp xếp theo thời gian mới nhất lên trước
  protected readonly allPurchasedPasses = computed(() => {
    return [...this.passes()].sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      const timeA = a.startDate ? Date.parse(a.startDate) : 0;
      const timeB = b.startDate ? Date.parse(b.startDate) : 0;
      return timeB - timeA;
    });
  });

  constructor() {
    effect(() => {
      const id = this.auth.currentUserId();
      if (id) {
        untracked(() => {
          this.refreshAllData();
        });
      }
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const tab = params['tab'];
      if (tab === 'history') {
        this.router.navigate(['/membership/history']);
        return;
      }
      if (tab === 'passes' || tab === 'bookings' || tab === 'waitlist') {
        this.activeTab.set(tab);
      }
    });

    if (this.auth.currentUserId() && !this.isLoading()) {
      this.refreshAllData();
    }
  }

  setTab(tab: 'passes' | 'bookings' | 'waitlist'): void {
    this.activeTab.set(tab);
    if (!this.isLoading() && this.passes().length === 0 && this.auth.currentUserId()) {
      this.refreshAllData();
    }
  }

  refreshAllData(): void {
    const id = this.auth.currentUserId();
    if (!id || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    const orders$ = this.posApi
      ? this.posApi.getStudentOrders(id).pipe(catchError(() => of([])))
      : of([]);

    const branches$ = this.branchApi
      ? this.branchApi.getAll().pipe(catchError(() => of([])))
      : of([]);

    const workoutHistory$ = this.bookingApi.getStudentWorkoutHistory(id).pipe(catchError(() => of([])));

    forkJoin([
      this.membershipApi.getStudentMemberships(id),
      this.bookingApi.getStudentBookingDetails(id).pipe(catchError(() => of([]))),
      this.waitlistApi.getStudentWaitlists(id).pipe(catchError(() => of([]))),
      orders$,
      branches$,
      workoutHistory$,
    ])
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ([passes, bookings, waitlists, orders, branches, workouts]) => {
          this.passes.set(passes);
          this.bookings.set(bookings);
          this.waitlists.set(waitlists);
          this.orders.set(orders as StudentOrderHistoryResp[]);
          this.branches.set(branches as Branch[]);

          const history = (workouts as WorkoutHistoryItem[]) || [];
          if (history.length > 0) {
            this.workoutHistory.set(history);
          } else {
            // Tự động suy ra lịch sử tập từ các ca ATTENDED nếu chưa có bản ghi attendance riêng
            const fallback: WorkoutHistoryItem[] = (bookings as StudentBookingDetail[])
              .filter((b) => b.status === 'ATTENDED')
              .map((b) => ({
                bookingId: b.id,
                bookingCode: b.bookingCode,
                scheduleId: b.scheduleId,
                className: b.className,
                intensityLevel: 'ALL_LEVELS',
                instructorName: b.instructorName,
                roomName: b.roomName,
                branchName: b.branchName,
                startTime: b.startTime,
                endTime: b.endTime,
                durationMinutes: Math.max(30, Math.round((Date.parse(b.endTime) - Date.parse(b.startTime)) / 60000)) || 60,
                matNumber: b.matNumber,
                status: 'ATTENDED',
                checkedInAt: b.startTime,
                checkInMethod: 'QR_SCAN',
                attendanceStatus: 'PRESENT',
              }));
            this.workoutHistory.set(fallback);
          }
        },
        error: (err) =>
          this.errorMessage.set(
            err?.error?.message || 'Không tải được dữ liệu. Vui lòng thử lại.'
          ),
      });
  }

  getBranchName(branchId?: string, pass?: MembershipResp): string {
    if (branchId) {
      const found = this.branches().find((b) => b.id === branchId);
      if (found) return found.name;
    }
    if (pass?.membershipCode) {
      const matchedOrder = this.orders().find((o) =>
        o.items?.some((item) => item.membershipCode === pass.membershipCode)
      );
      if (matchedOrder?.branchName) return matchedOrder.branchName;
      if (matchedOrder?.branchId) {
        const found = this.branches().find((b) => b.id === matchedOrder.branchId);
        if (found) return found.name;
      }
    }
    if (this.branches().length === 1) {
      return this.branches()[0].name;
    }
    return 'Cơ sở đăng ký';
  }

  membershipStatusLabel(status: string | undefined): string {
    if (!status) return '---';
    return (
      {
        ACTIVE: 'Đang hoạt động',
        FROZEN: 'Đang bảo lưu',
        EXPIRED: 'Hết hạn',
        PENDING_PAYMENT: 'Chờ thanh toán',
        REPLACED: 'Đã thay thế',
        CANCELLED: 'Đã hủy',
        TRANSFERRED: 'Đã chuyển nhượng',
      } as Record<string, string>
    )[status] ?? status;
  }

  paymentMethodLabel(method?: string): string {
    return (
      {
        CASH: 'Tiền mặt',
        POS_CARD: 'Quẹt thẻ POS',
        BANK_TRANSFER_QR: 'Chuyển khoản QR',
      } as Record<string, string>
    )[method ?? ''] ?? (method || 'Tiền mặt');
  }

  orderStatusLabel(status?: string): string {
    return (
      {
        PAID: 'Đã thanh toán',
        PENDING: 'Chờ thanh toán',
        CANCELLED: 'Đã hủy',
      } as Record<string, string>
    )[status ?? ''] ?? (status || '---');
  }

  openPassQrModal(pass: MembershipResp): void {
    this.selectedPassForQr.set(pass);
    this.selectedBookingForQr.set(null);
  }

  openPassByCode(code: string | undefined): void {
    if (!code) return;
    const found = this.passes().find((p) => p.membershipCode === code);
    if (found) {
      this.openPassQrModal(found);
    } else {
      this.selectedPassForQr.set({
        id: '',
        membershipCode: code,
        studentId: this.auth.currentUserId() ?? '',
        planId: '',
        registeredBranchId: '',
        isAllBranches: true,
        startDate: '',
        status: 'ACTIVE',
        purchasedPrice: 0,
      });
      this.selectedBookingForQr.set(null);
    }
  }

  openBookingQrModal(booking: StudentBookingDetail): void {
    this.selectedBookingForQr.set(booking);
    this.selectedPassForQr.set(null);
  }

  closeQrModal(): void {
    this.selectedPassForQr.set(null);
    this.selectedBookingForQr.set(null);
  }

  cancelBooking(booking: StudentBookingDetail): void {
    if (this.isLoading() || !confirm('Hủy ca ' + booking.className + '?')) return;
    this.isLoading.set(true);
    this.bookingApi.cancelBooking(booking.id, 'Học viên hủy trên ứng dụng').subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Đã hủy đặt chỗ và hoàn lượt nếu thẻ có giới hạn số buổi.');
        this.refreshAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Không hủy được đặt chỗ.');
      },
    });
  }

  cancelWaitlist(item: StudentWaitlistResp): void {
    const id = this.auth.currentUserId();
    if (!id || this.isLoading() || !confirm('Rút khỏi hàng chờ lớp ' + item.className + '?')) return;
    this.isLoading.set(true);
    this.waitlistApi.cancelWaitlist(item.id, id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('Đã rút khỏi hàng chờ.');
        this.refreshAllData();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'Không rút được khỏi hàng chờ.');
      },
    });
  }

  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.successMessage.set('Đã sao chép mã đặt chỗ.');
    } catch {
      this.errorMessage.set('Không sao chép được. Vui lòng chọn mã và sao chép thủ công.');
    }
  }
}
