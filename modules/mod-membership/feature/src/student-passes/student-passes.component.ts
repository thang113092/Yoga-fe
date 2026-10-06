import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { MembershipApi, MembershipResp } from '@yoga/mod-membership/data-access';
import { BookingApi, StudentBookingDetail, StudentWaitlistResp, WaitlistApi } from '@yoga/mod-schedule/data-access';
import { AuthService } from '@yoga/platform/auth';
import { QrCodeComponent } from '@yoga/platform/api';
@Component({ selector: 'yoga-student-passes', standalone: true, imports: [CommonModule, RouterModule, QrCodeComponent], templateUrl: './student-passes.component.html', styleUrl: './student-passes.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class StudentPassesComponent implements OnInit {
  private readonly membershipApi = inject(MembershipApi);
  private readonly bookingApi = inject(BookingApi);
  private readonly waitlistApi = inject(WaitlistApi);
  protected readonly auth = inject(AuthService);
  protected readonly activeTab = signal<'passes' | 'bookings' | 'waitlist'>('passes');
  protected readonly passes = signal<readonly MembershipResp[]>([]);
  protected readonly bookings = signal<readonly StudentBookingDetail[]>([]);
  protected readonly waitlists = signal<readonly StudentWaitlistResp[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly selectedPassForQr = signal<MembershipResp | null>(null);
  protected readonly selectedBookingForQr = signal<StudentBookingDetail | null>(null);
  protected readonly nextBooking = computed(() => this.bookings().filter(b => b.status === 'CONFIRMED' && Date.parse(b.startTime) > Date.now()).sort((a,b) => Date.parse(a.startTime) - Date.parse(b.startTime))[0] ?? null);
  protected readonly activeWaitlistCount = computed(() => this.waitlists().filter(w => w.status === 'WAITING').length);
  ngOnInit(): void { this.refreshAllData(); }
  refreshAllData(): void {
    const id = this.auth.currentUserId(); if (!id || this.isLoading()) return;
    this.isLoading.set(true); this.errorMessage.set(null);
    forkJoin([this.membershipApi.getStudentMemberships(id), this.bookingApi.getStudentBookingDetails(id), this.waitlistApi.getStudentWaitlists(id)])
      .pipe(finalize(() => this.isLoading.set(false))).subscribe({ next: ([passes, bookings, waitlists]) => { this.passes.set(passes); this.bookings.set(bookings); this.waitlists.set(waitlists); }, error: err => this.errorMessage.set(err?.error?.message || 'Không tải được dữ liệu. Vui lòng thử lại.') });
  }
  openPassQrModal(pass: MembershipResp): void { this.selectedPassForQr.set(pass); this.selectedBookingForQr.set(null); }
  openBookingQrModal(booking: StudentBookingDetail): void { this.selectedBookingForQr.set(booking); this.selectedPassForQr.set(null); }
  closeQrModal(): void { this.selectedPassForQr.set(null); this.selectedBookingForQr.set(null); }
  cancelBooking(booking: StudentBookingDetail): void {
    if (this.isLoading() || !confirm('Hủy ca ' + booking.className + '?')) return;
    this.isLoading.set(true);
    this.bookingApi.cancelBooking(booking.id, 'Học viên hủy trên ứng dụng').subscribe({ next: () => { this.isLoading.set(false); this.successMessage.set('Đã hủy đặt chỗ và hoàn lượt nếu thẻ có giới hạn số buổi.'); this.refreshAllData(); }, error: err => { this.isLoading.set(false); this.errorMessage.set(err?.error?.message || 'Không hủy được đặt chỗ.'); } });
  }
  cancelWaitlist(item: StudentWaitlistResp): void {
    const id=this.auth.currentUserId(); if (!id || this.isLoading() || !confirm('Rút khỏi hàng chờ lớp ' + item.className + '?')) return;
    this.isLoading.set(true);
    this.waitlistApi.cancelWaitlist(item.id, id).subscribe({ next: () => { this.isLoading.set(false); this.successMessage.set('Đã rút khỏi hàng chờ.'); this.refreshAllData(); }, error: err => { this.isLoading.set(false); this.errorMessage.set(err?.error?.message || 'Không rút được khỏi hàng chờ.'); } });
  }
  async copyToClipboard(text: string): Promise<void> {
    try { await navigator.clipboard.writeText(text); this.successMessage.set('Đã sao chép mã đặt chỗ.'); } catch { this.errorMessage.set('Không sao chép được. Vui lòng chọn mã và sao chép thủ công.'); }
  }
}
