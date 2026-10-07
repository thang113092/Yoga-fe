import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@yoga/platform/auth';
import { BranchApi, Branch } from '@yoga/mod-branch/data-access';
import { CheckInApi, CheckInReq, CheckInResp, ScheduleApi, ClassSchedule, ScheduleAttendee } from '@yoga/mod-schedule/data-access';
import type { IScannerControls } from '@zxing/browser';

interface CheckInHistoryItem {
  bookingCode: string;
  studentName: string;
  className: string;
  matNumber: number | string;
  time: string;
  status: 'PRESENT' | 'ALREADY_CHECKED_IN';
}

@Component({
  selector: 'yoga-qr-scanner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QrScannerComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly scheduleApi = inject(ScheduleApi);
  private readonly checkInApi = inject(CheckInApi);
  private readonly branchApi = inject(BranchApi);

  private readonly camera = viewChild<ElementRef<HTMLVideoElement>>('camera');
  private readonly datePickerInput = viewChild<ElementRef<HTMLInputElement>>('datePickerInput');
  private controls?: IScannerControls;
  private destroyed = false;
  private clockInterval?: any;

  // Clock
  readonly currentTime = signal<Date>(new Date());

  // Date selection (default today YYYY-MM-DD)
  readonly selectedDate = signal<string>(new Date().toISOString().substring(0, 10));
  readonly isToday = computed(() => {
    const today = new Date().toISOString().substring(0, 10);
    return this.selectedDate() === today;
  });

  // Instructor schedules
  readonly isLoadingSchedules = signal(false);
  readonly schedules = signal<ClassSchedule[]>([]);
  readonly selectedScheduleId = signal<string>('');

  // Computed selected schedule
  readonly selectedSchedule = computed(() =>
    this.schedules().find(s => s.id === this.selectedScheduleId()) ?? null
  );

  // Attendees for the selected schedule
  readonly isLoadingAttendees = signal(false);
  readonly attendees = signal<ScheduleAttendee[]>([]);
  readonly searchQuery = signal('');
  readonly filterStatus = signal<'ALL' | 'UNATTENDED' | 'ATTENDED'>('ALL');

  // Processing state for individual action
  readonly processingBookingId = signal<string | null>(null);
  readonly isBatchProcessing = signal(false);

  // QR Scanning & manual input modal/toggle
  readonly showScannerPanel = signal(false);
  readonly qrInput = signal('');
  readonly isProcessing = signal(false);
  readonly isCameraActive = signal(false);
  readonly checkInResult = signal<CheckInResp | null>(null);
  readonly recentCheckIns = signal<CheckInHistoryItem[]>([]);

  // Alert & feedback messages
  readonly errorMessage = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);
  private toastTimer?: any;

  // Branch reference (fallback)
  readonly branches = signal<Branch[]>([]);
  readonly branchId = signal('');
  readonly selectedBranchName = computed(() => {
    const sched = this.selectedSchedule();
    if (sched?.branchName) return sched.branchName;
    return this.branches().find(b => b.id === this.branchId())?.name ?? 'An Yên Yoga';
  });

  // Filtered attendees
  readonly filteredAttendees = computed(() => {
    const list = this.attendees();
    const q = this.searchQuery().trim().toLowerCase();
    const filter = this.filterStatus();

    return list.filter(a => {
      // Filter by status
      const isAttended = a.status === 'ATTENDED' || !!a.checkedInAt;
      if (filter === 'ATTENDED' && !isAttended) return false;
      if (filter === 'UNATTENDED' && isAttended) return false;

      // Filter by search query
      if (q) {
        const nameMatch = a.studentName?.toLowerCase().includes(q);
        const phoneMatch = a.studentPhone?.toLowerCase().includes(q);
        const emailMatch = a.studentEmail?.toLowerCase().includes(q);
        const codeMatch = a.bookingCode?.toLowerCase().includes(q);
        const matMatch = a.matNumber != null && String(a.matNumber).includes(q);
        return nameMatch || phoneMatch || emailMatch || codeMatch || matMatch;
      }
      return true;
    });
  });

  // Statistics
  readonly totalBooked = computed(() => this.attendees().length);
  readonly attendedCount = computed(() =>
    this.attendees().filter(a => a.status === 'ATTENDED' || !!a.checkedInAt).length
  );
  readonly unattendedCount = computed(() =>
    this.totalBooked() - this.attendedCount()
  );
  readonly attendancePercentage = computed(() =>
    this.totalBooked() > 0 ? Math.round((this.attendedCount() / this.totalBooked()) * 100) : 0
  );

  ngOnInit(): void {
    // Start real-time clock
    this.clockInterval = setInterval(() => {
      this.currentTime.set(new Date());
    }, 1000);

    // Load branches for fallback
    this.branchApi.getAll().subscribe({
      next: all => {
        const branches = all.filter(b => b.isActive);
        this.branches.set(branches);
        if (branches.length > 0 && !this.branchId()) {
          this.branchId.set(branches[0].id);
        }
      },
      error: () => {}
    });

    // Load schedules of current instructor for selected date
    this.loadInstructorSchedules(this.selectedDate());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.clockInterval) clearInterval(this.clockInterval);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.stopCamera();
  }

  onDateChange(newDate: string): void {
    if (!newDate) return;
    this.selectedDate.set(newDate);
    this.loadInstructorSchedules(newDate);
  }

  changeDateByDays(deltaDays: number): void {
    const cur = new Date(this.selectedDate());
    cur.setDate(cur.getDate() + deltaDays);
    const nextStr = cur.toISOString().substring(0, 10);
    this.onDateChange(nextStr);
  }

  openDatePicker(): void {
    const el = this.datePickerInput()?.nativeElement;
    if (el) {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
      } else {
        el.focus();
        el.click();
      }
    }
  }

  selectToday(): void {
    const todayStr = new Date().toISOString().substring(0, 10);
    this.selectedDate.set(todayStr);
    this.loadInstructorSchedules(todayStr);
  }

  loadInstructorSchedules(dateStr: string): void {
    const instructorId = this.auth.currentUserId() ?? undefined;
    this.isLoadingSchedules.set(true);
    this.errorMessage.set(null);

    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59).toISOString();

    this.scheduleApi.getSchedules(undefined, startOfDay, endOfDay, instructorId).subscribe({
      next: (list) => {
        this.isLoadingSchedules.set(false);
        const sorted = [...list].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        this.schedules.set(sorted);

        if (sorted.length > 0) {
          // Identify the class at current time
          const chosen = this.findCurrentOrNextSchedule(sorted);
          this.selectSchedule(chosen.id);
        } else {
          this.selectedScheduleId.set('');
          this.attendees.set([]);
        }
      },
      error: (err) => {
        this.isLoadingSchedules.set(false);
        this.errorMessage.set(err?.error?.message || 'Không thể tải lịch dạy của huấn luyện viên.');
      }
    });
  }

  private findCurrentOrNextSchedule(list: ClassSchedule[]): ClassSchedule {
    const now = Date.now();
    // 1. Check if any class is currently active (from 30 mins before start to 30 mins after end)
    const active = list.find(s => {
      const start = new Date(s.startTime).getTime() - 30 * 60 * 1000;
      const end = new Date(s.endTime).getTime() + 30 * 60 * 1000;
      return now >= start && now <= end;
    });
    if (active) return active;

    // 2. Nearest upcoming class
    const upcoming = list.find(s => new Date(s.startTime).getTime() > now);
    if (upcoming) return upcoming;

    // 3. Fallback: last class or first class
    return list[list.length - 1] ?? list[0];
  }

  selectSchedule(scheduleId: string): void {
    this.selectedScheduleId.set(scheduleId);
    const sched = this.selectedSchedule();
    if (sched?.branchId) {
      this.branchId.set(sched.branchId);
    }
    this.loadAttendees(scheduleId);
  }

  loadAttendees(scheduleId: string): void {
    if (!scheduleId) {
      this.attendees.set([]);
      return;
    }

    this.isLoadingAttendees.set(true);
    this.scheduleApi.getScheduleAttendees(scheduleId).subscribe({
      next: (data) => {
        this.isLoadingAttendees.set(false);
        this.attendees.set(data);
      },
      error: (err) => {
        this.isLoadingAttendees.set(false);
        this.errorMessage.set(err?.error?.message || 'Không thể tải danh sách học viên của ca học.');
      }
    });
  }

  isScheduleActive(schedule: ClassSchedule): boolean {
    const now = Date.now();
    const start = new Date(schedule.startTime).getTime() - 30 * 60 * 1000;
    const end = new Date(schedule.endTime).getTime() + 30 * 60 * 1000;
    return now >= start && now <= end;
  }

  // --- Attendance Actions ---

  checkInAttendee(attendee: ScheduleAttendee): void {
    const schedule = this.selectedSchedule();
    const instructorId = this.auth.currentUserId();
    if (!schedule || !instructorId) {
      this.errorMessage.set('Vui lòng chọn ca học trước khi điểm danh.');
      return;
    }

    this.processingBookingId.set(attendee.id);
    this.errorMessage.set(null);

    const req: CheckInReq = {
      bookingId: attendee.id,
      scheduleId: schedule.id,
      branchId: schedule.branchId,
      checkedInBy: instructorId,
      checkInMethod: 'INSTRUCTOR_CONFIRM'
    };

    this.checkInApi.processCheckIn(req).subscribe({
      next: (resp) => {
        this.processingBookingId.set(null);
        this.attendees.update(list => list.map(item => {
          if (item.id === attendee.id) {
            return {
              ...item,
              status: 'ATTENDED',
              checkedInAt: resp.checkedInAt
            };
          }
          return item;
        }));
        this.showToast(`Đã điểm danh cho học viên ${attendee.studentName}`);
      },
      error: (err) => {
        this.processingBookingId.set(null);
        this.errorMessage.set(err?.error?.message || `Không thể điểm danh cho ${attendee.studentName}.`);
      }
    });
  }

  revertCheckInAttendee(attendee: ScheduleAttendee): void {
    if (!confirm(`Xác nhận hoàn tác điểm danh cho học viên ${attendee.studentName}?`)) return;

    this.processingBookingId.set(attendee.id);
    this.errorMessage.set(null);

    this.checkInApi.revertCheckIn(attendee.id).subscribe({
      next: () => {
        this.processingBookingId.set(null);
        this.attendees.update(list => list.map(item => {
          if (item.id === attendee.id) {
            return {
              ...item,
              status: 'CONFIRMED',
              checkedInAt: undefined
            };
          }
          return item;
        }));
        this.showToast(`Đã hoàn tác điểm danh cho ${attendee.studentName}`);
      },
      error: (err) => {
        this.processingBookingId.set(null);
        this.errorMessage.set(err?.error?.message || 'Không thể hoàn tác điểm danh.');
      }
    });
  }

  checkInAllUnattended(): void {
    const unChecked = this.attendees().filter(a => a.status !== 'ATTENDED' && !a.checkedInAt);
    if (unChecked.length === 0) return;
    if (!confirm(`Xác nhận điểm danh cho tất cả ${unChecked.length} học viên chưa có mặt?`)) return;

    const schedule = this.selectedSchedule();
    const instructorId = this.auth.currentUserId();
    if (!schedule || !instructorId) return;

    this.isBatchProcessing.set(true);
    this.errorMessage.set(null);

    let completed = 0;
    let failed = 0;

    unChecked.forEach(attendee => {
      this.checkInApi.processCheckIn({
        bookingId: attendee.id,
        scheduleId: schedule.id,
        branchId: schedule.branchId,
        checkedInBy: instructorId,
        checkInMethod: 'INSTRUCTOR_CONFIRM'
      }).subscribe({
        next: (resp) => {
          completed++;
          this.attendees.update(list => list.map(item =>
            item.id === attendee.id ? { ...item, status: 'ATTENDED', checkedInAt: resp.checkedInAt } : item
          ));
          if (completed + failed === unChecked.length) {
            this.isBatchProcessing.set(false);
            this.showToast(`Đã điểm danh xong cho ${completed} học viên.`);
          }
        },
        error: () => {
          failed++;
          if (completed + failed === unChecked.length) {
            this.isBatchProcessing.set(false);
            this.showToast(`Điểm danh hoàn tất: ${completed} thành công, ${failed} lỗi.`);
          }
        }
      });
    });
  }

  // --- QR Scanner & Manual Booking Code Input ---

  toggleScannerPanel(): void {
    const nextState = !this.showScannerPanel();
    this.showScannerPanel.set(nextState);
    if (!nextState) {
      this.stopCamera();
    }
  }

  async startCamera(): Promise<void> {
    if (this.isCameraActive() || this.isProcessing()) return;
    this.isCameraActive.set(true);
    this.errorMessage.set(null);

    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (this.destroyed || !this.camera()) return;

      const controls = await new BrowserQRCodeReader().decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        this.camera()!.nativeElement,
        (result, error, controls) => {
          if (result && !this.isProcessing()) {
            controls.stop();
            this.isCameraActive.set(false);
            this.qrInput.set(result.getText());
            this.submitCheckIn();
          }
        }
      );
      if (this.destroyed || !this.isCameraActive()) controls.stop();
      else this.controls = controls;
    } catch {
      this.isCameraActive.set(false);
      this.errorMessage.set('Không thể mở camera. Vui lòng cho phép quyền truy cập camera hoặc nhập mã thủ công.');
    }
  }

  stopCamera(): void {
    this.controls?.stop();
    this.controls = undefined;
    this.isCameraActive.set(false);
  }

  submitCheckIn(): void {
    const raw = this.qrInput().trim();
    const actor = this.auth.currentUserId();
    if (!raw || this.isProcessing()) return;

    const schedule = this.selectedSchedule();
    const branchId = schedule?.branchId || this.branchId();

    if (!actor || !branchId) {
      this.errorMessage.set('Vui lòng đăng nhập và chọn ca học trước khi điểm danh.');
      return;
    }

    let bookingId: string | undefined;
    let bookingCode: string | undefined;
    try {
      if (raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        bookingId = parsed.bookingId ?? parsed.id;
        bookingCode = parsed.bookingCode ?? parsed.code;
      } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) {
        bookingId = raw;
      } else {
        bookingCode = raw;
      }
    } catch {
      this.errorMessage.set('Mã không hợp lệ. Vui lòng kiểm tra mã QR hoặc mã Booking.');
      return;
    }

    this.stopCamera();
    this.isProcessing.set(true);
    this.errorMessage.set(null);
    this.checkInResult.set(null);

    const req: CheckInReq = {
      bookingId,
      bookingCode,
      scheduleId: schedule?.id,
      branchId,
      checkedInBy: actor,
      checkInMethod: 'QR_SCAN'
    };

    this.checkInApi.processCheckIn(req).subscribe({
      next: (resp) => {
        this.isProcessing.set(false);
        this.checkInResult.set(resp);

        // Update student in attendee list if matches
        this.attendees.update(list => list.map(item => {
          if (item.id === resp.bookingId || item.bookingCode === resp.bookingCode) {
            return {
              ...item,
              status: 'ATTENDED',
              checkedInAt: resp.checkedInAt
            };
          }
          return item;
        }));

        this.recentCheckIns.update(list => [{
          bookingCode: resp.bookingCode,
          studentName: resp.studentName,
          className: resp.className,
          matNumber: resp.matNumber ?? 'Chưa chỉ định',
          time: new Date(resp.checkedInAt).toLocaleTimeString('vi-VN'),
          status: resp.alreadyCheckedIn ? 'ALREADY_CHECKED_IN' as const : 'PRESENT' as const
        }, ...list].slice(0, 50));

        this.showToast(`Điểm danh thành công: ${resp.studentName}`);
      },
      error: (err) => {
        this.isProcessing.set(false);
        this.errorMessage.set(err?.error?.message || 'Không thể điểm danh. Kiểm tra mã, chi nhánh và ca học.');
      }
    });
  }

  setPresetCode(code: string): void {
    this.qrInput.set(code);
    this.submitCheckIn();
  }

  clearResult(): void {
    this.checkInResult.set(null);
    this.errorMessage.set(null);
    this.qrInput.set('');
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastMessage.set(null);
    }, 4000);
  }

  // --- Formatters ---

  formatTime(iso?: string): string {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getShortRoom(roomName?: string, branchName?: string): string {
    if (!roomName) return branchName || '';
    const cleanRoom = roomName.replace(/\s*\([^)]*\)/g, '').trim();
    const cleanBranch = branchName ? branchName.replace(/^Yoga Center\s*-\s*Cơ sở\s*/i, 'CN ').replace(/^Yoga Center\s*-\s*/i, '').trim() : '';
    return cleanBranch ? `${cleanRoom} • ${cleanBranch}` : cleanRoom;
  }

  formatGender(gender?: string): string {
    if (!gender) return '---';
    const g = gender.toUpperCase();
    if (g === 'MALE' || g === 'NAM') return 'Nam';
    if (g === 'FEMALE' || g === 'NU' || g === 'NỮ') return 'Nữ';
    return gender;
  }
}
