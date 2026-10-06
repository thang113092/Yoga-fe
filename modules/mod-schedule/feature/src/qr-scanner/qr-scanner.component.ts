import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@yoga/platform/auth';
import { ZenSelectComponent } from '@yoga/platform/api';
import { BranchApi, Branch } from '@yoga/mod-branch/data-access';
import { CheckInApi, CheckInReq, CheckInResp } from '@yoga/mod-schedule/data-access';
import type { IScannerControls } from '@zxing/browser';
interface CheckInHistoryItem { bookingCode: string; studentName: string; className: string; matNumber: number | string; time: string; status: 'PRESENT' | 'ALREADY_CHECKED_IN'; }
@Component({ selector: 'yoga-qr-scanner', standalone: true, imports: [CommonModule, FormsModule, ZenSelectComponent], templateUrl: './qr-scanner.component.html', styleUrls: ['./qr-scanner.component.scss'], changeDetection: ChangeDetectionStrategy.OnPush })
export class QrScannerComponent implements OnInit, OnDestroy {
  private readonly checkInApi = inject(CheckInApi);
  protected readonly auth = inject(AuthService);
  private readonly branchApi = inject(BranchApi);
  private readonly camera = viewChild<ElementRef<HTMLVideoElement>>('camera');
  private controls?: IScannerControls;
  private destroyed = false;
  readonly branches = signal<Branch[]>([]);
  readonly branchId = signal('');
  readonly selectedBranchName = computed(() => this.branches().find(b => b.id === this.branchId())?.name ?? 'Chọn cơ sở');
  readonly qrInput = signal('');
  readonly isProcessing = signal(false);
  readonly isCameraActive = signal(false);
  readonly checkInResult = signal<CheckInResp | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly recentCheckIns = signal<CheckInHistoryItem[]>([]);
  ngOnInit(): void { this.branchApi.getAll().subscribe({ next: all => { const branches=all.filter(b => b.isActive && (this.auth.isSuperAdmin() || this.auth.branchIds().includes(b.id))); this.branches.set(branches); this.branchId.set(branches[0]?.id ?? ''); }, error: err => this.errorMessage.set(err?.error?.message || 'Không tải được chi nhánh.') }); }
  async startCamera(): Promise<void> {
    if (this.isCameraActive() || this.isProcessing()) return;
    this.isCameraActive.set(true); this.errorMessage.set(null);
    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (this.destroyed || !this.camera()) return;
      const controls = await new BrowserQRCodeReader().decodeFromConstraints({ video: { facingMode: 'environment' } }, this.camera()!.nativeElement, (result, error, controls) => {
        if (result && !this.isProcessing()) { controls.stop(); this.isCameraActive.set(false); this.qrInput.set(result.getText()); this.submitCheckIn(); }
      });
      if (this.destroyed || !this.isCameraActive()) controls.stop(); else this.controls = controls;
    } catch { this.isCameraActive.set(false); this.errorMessage.set('Không mở được camera. Cho phép truy cập camera trên HTTPS/localhost hoặc nhập mã thủ công.'); }
  }
  stopCamera(): void { this.controls?.stop(); this.controls=undefined; this.isCameraActive.set(false); }
  ngOnDestroy(): void { this.destroyed=true; this.stopCamera(); }
  submitCheckIn(): void {
    const raw=this.qrInput().trim(); const actor=this.auth.currentUserId();
    if (!raw || this.isProcessing()) return;
    if (!actor || !this.branchId()) { this.errorMessage.set('Đăng nhập nhân sự và chọn chi nhánh trước khi điểm danh.'); return; }
    let bookingId: string | undefined; let bookingCode: string | undefined;
    try {
      if (raw.startsWith('{')) { const parsed=JSON.parse(raw); bookingId=parsed.bookingId ?? parsed.id; bookingCode=parsed.bookingCode ?? parsed.code; }
      else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)) bookingId=raw;
      else if (/^BK-[0-9a-f-]+$/i.test(raw)) bookingCode=raw;
      if ((!bookingId && !bookingCode) || (bookingId && typeof bookingId !== 'string') || (bookingCode && typeof bookingCode !== 'string')) throw new Error();
    } catch { this.errorMessage.set('Mã không hợp lệ. Dùng mã QR hoặc mã BK của ca đã đặt.'); return; }
    this.stopCamera(); this.isProcessing.set(true); this.errorMessage.set(null); this.checkInResult.set(null);
    const req: CheckInReq={ bookingId, bookingCode, branchId:this.branchId(), checkedInBy:actor, checkInMethod:'QR_SCAN' };
    this.checkInApi.processCheckIn(req).subscribe({
      next: resp => { this.isProcessing.set(false); this.checkInResult.set(resp); this.recentCheckIns.update(list => [{ bookingCode:resp.bookingCode, studentName:resp.studentName, className:resp.className, matNumber:resp.matNumber ?? 'Chưa chỉ định', time:new Date(resp.checkedInAt).toLocaleTimeString('vi-VN'), status:resp.alreadyCheckedIn ? 'ALREADY_CHECKED_IN' as const : 'PRESENT' as const }, ...list].slice(0,50)); },
      error: err => { this.isProcessing.set(false); this.errorMessage.set(err?.error?.message || 'Không điểm danh được. Kiểm tra mã, chi nhánh và thời gian ca học.'); }
    });
  }
  setPresetCode(code: string): void { this.qrInput.set(code); this.submitCheckIn(); }
  clearResult(): void { this.checkInResult.set(null); this.errorMessage.set(null); this.qrInput.set(''); }
}
