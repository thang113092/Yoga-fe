import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin, finalize, catchError, of } from 'rxjs';
import { BookingApi, StudentBookingDetail, WorkoutHistoryItem } from '@yoga/mod-schedule/data-access';
import { AuthService } from '@yoga/platform/auth';

@Component({
  selector: 'yoga-workout-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './workout-history.component.html',
  styleUrl: './workout-history.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkoutHistoryComponent implements OnInit {
  private readonly bookingApi = inject(BookingApi);
  protected readonly auth = inject(AuthService);

  protected readonly workoutHistory = signal<readonly WorkoutHistoryItem[]>([]);
  protected readonly historyPeriodFilter = signal<'ALL' | 'MONTH' | '3MONTHS' | 'YEAR'>('ALL');
  protected readonly historyBranchFilter = signal<string>('ALL');
  protected readonly historySearchQuery = signal<string>('');
  protected readonly selectedWorkoutForDetail = signal<WorkoutHistoryItem | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly totalMinutesPracticed = computed(() =>
    this.workoutHistory().reduce((sum, item) => sum + (item.durationMinutes || 60), 0)
  );

  protected readonly totalHoursPracticed = computed(() => {
    const mins = this.totalMinutesPracticed();
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours === 0) return `${mins} phút`;
    return remMins > 0 ? `${hours} giờ ${remMins} phút` : `${hours} giờ`;
  });

  protected readonly thisMonthWorkoutsCount = computed(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return this.workoutHistory().filter((item) => {
      const d = new Date(item.startTime);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  });

  protected readonly favoriteClass = computed(() => {
    const hist = this.workoutHistory();
    if (hist.length === 0) return null;
    const countMap: Record<string, number> = {};
    for (const item of hist) {
      countMap[item.className] = (countMap[item.className] || 0) + 1;
    }
    let topName = '';
    let max = 0;
    for (const [name, cnt] of Object.entries(countMap)) {
      if (cnt > max) {
        topName = name;
        max = cnt;
      }
    }
    return topName ? { name: topName, count: max } : null;
  });

  protected readonly availableHistoryBranches = computed(() => {
    const set = new Set<string>();
    for (const item of this.workoutHistory()) {
      if (item.branchName) set.add(item.branchName);
    }
    return Array.from(set);
  });

  protected readonly filteredWorkoutHistory = computed(() => {
    let list = [...this.workoutHistory()];
    const period = this.historyPeriodFilter();
    const branch = this.historyBranchFilter();
    const q = this.historySearchQuery().trim().toLowerCase();

    // Lọc theo thời gian
    const now = Date.now();
    if (period === 'MONTH') {
      const oneMonthAgo = now - 30 * 86400000;
      list = list.filter((item) => Date.parse(item.startTime) >= oneMonthAgo);
    } else if (period === '3MONTHS') {
      const threeMonthsAgo = now - 90 * 86400000;
      list = list.filter((item) => Date.parse(item.startTime) >= threeMonthsAgo);
    } else if (period === 'YEAR') {
      const oneYearAgo = now - 365 * 86400000;
      list = list.filter((item) => Date.parse(item.startTime) >= oneYearAgo);
    }

    // Lọc theo chi nhánh
    if (branch !== 'ALL') {
      list = list.filter((item) => item.branchName === branch || item.branchId === branch);
    }

    // Tìm kiếm theo từ khóa
    if (q) {
      list = list.filter((item) =>
        (item.className && item.className.toLowerCase().includes(q)) ||
        (item.instructorName && item.instructorName.toLowerCase().includes(q)) ||
        (item.bookingCode && item.bookingCode.toLowerCase().includes(q)) ||
        (item.membershipCode && item.membershipCode.toLowerCase().includes(q)) ||
        (item.roomName && item.roomName.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
  });

  constructor() {
    effect(() => {
      const id = this.auth.currentUserId();
      if (id) {
        untracked(() => {
          this.loadHistory();
        });
      }
    });
  }

  ngOnInit(): void {
    if (this.auth.currentUserId() && !this.isLoading()) {
      this.loadHistory();
    }
  }

  loadHistory(): void {
    const id = this.auth.currentUserId();
    if (!id || this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin([
      this.bookingApi.getStudentWorkoutHistory(id).pipe(catchError(() => of([]))),
      this.bookingApi.getStudentBookingDetails(id).pipe(catchError(() => of([]))),
    ])
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: ([history, bookings]) => {
          if (history && history.length > 0) {
            this.workoutHistory.set(history);
          } else {
            // Tự động suy ra lịch sử từ các ca ATTENDED
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
        error: (err) => {
          this.errorMessage.set(err?.error?.message || 'Không thể tải lịch sử tập luyện. Vui lòng thử lại.');
        },
      });
  }

  intensityLabel(intensity?: string): string {
    switch (intensity) {
      case 'BEGINNER':
        return 'Căn bản';
      case 'INTERMEDIATE':
        return 'Trung cấp';
      case 'ADVANCED':
        return 'Nâng cao';
      case 'ALL_LEVELS':
      default:
        return 'Mọi cấp độ';
    }
  }

  attendanceStatusLabel(status?: string): string {
    switch (status) {
      case 'PRESENT':
        return 'Đúng giờ';
      case 'LATE':
        return 'Đi trễ nhẹ';
      case 'LEFT_EARLY':
        return 'Về sớm';
      case 'ATTENDED':
        return 'Đã hoàn thành';
      default:
        return status || 'Đã hoàn thành';
    }
  }

  checkInMethodLabel(method?: string): string {
    switch (method) {
      case 'QR_SCAN':
        return 'Quét mã QR tại cơ sở';
      case 'MANUAL_STAFF':
        return 'Tiếp tân đón tiếp ghi nhận';
      case 'INSTRUCTOR_CONFIRM':
        return 'Huấn luyện viên xác nhận';
      default:
        return 'Điểm danh tại quầy';
    }
  }

  openWorkoutDetailModal(item: WorkoutHistoryItem): void {
    this.selectedWorkoutForDetail.set(item);
  }

  closeWorkoutDetailModal(): void {
    this.selectedWorkoutForDetail.set(null);
  }

  setHistoryPeriod(period: 'ALL' | 'MONTH' | '3MONTHS' | 'YEAR'): void {
    this.historyPeriodFilter.set(period);
  }

  setHistoryBranch(branch: string): void {
    this.historyBranchFilter.set(branch);
  }
}
