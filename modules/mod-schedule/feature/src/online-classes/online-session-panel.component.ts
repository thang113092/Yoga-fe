import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '@yoga/platform/auth';
import { ZEN_UI, ZenToastService, ZenTone } from '@yoga/platform/ui';
import { OnlineClassApi, OnlineMeetingStatus, OnlineSessionInfo } from '@yoga/mod-schedule/data-access';

const STATUS_LABEL: Record<OnlineMeetingStatus, string> = {
  PENDING: 'Đang tạo phòng',
  READY: 'Sẵn sàng',
  UPDATE_PENDING: 'Đang cập nhật giờ',
  CANCEL_PENDING: 'Đang hủy phòng',
  CANCELLED: 'Đã hủy',
  STARTED: 'Đang diễn ra',
  ENDED: 'Đã kết thúc',
  MISSING: 'Chưa có phòng'
};

/** Zoom room of one online class: status, sync errors, retry and the host link. */
@Component({
  selector: 'yoga-online-session-panel',
  standalone: true,
  imports: [CommonModule, ...ZEN_UI],
  templateUrl: './online-session-panel.component.html',
  styleUrls: ['./online-session-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnlineSessionPanelComponent {
  private readonly api = inject(OnlineClassApi);
  private readonly toast = inject(ZenToastService);
  private readonly auth = inject(AuthService);

  readonly scheduleId = input.required<string>();

  readonly session = signal<OnlineSessionInfo | null>(null);
  readonly loading = signal(false);
  readonly syncing = signal(false);
  readonly canResync = computed(() => !this.auth.isReceptionist());

  constructor() {
    effect(() => {
      const id = this.scheduleId();
      untracked(() => {
        this.session.set(null);
        this.load(id);
      });
    });
  }

  load(id = this.scheduleId()): void {
    this.loading.set(true);
    this.api.getSession(id).subscribe({
      next: (info) => {
        if (this.scheduleId() === id) this.session.set(info);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err?.error?.message || 'Không tải được trạng thái phòng Zoom.');
      }
    });
  }

  resync(): void {
    if (this.syncing()) return;
    this.syncing.set(true);
    this.api.resync(this.scheduleId()).subscribe({
      next: (info) => {
        this.session.set(info);
        this.syncing.set(false);
        if (info.lastError) this.toast.error('Zoom vẫn báo lỗi: ' + info.lastError);
        else this.toast.success('Đã đồng bộ phòng Zoom.');
      },
      error: (err) => {
        this.syncing.set(false);
        this.toast.error(err?.error?.message || 'Không thể đồng bộ phòng Zoom.');
      }
    });
  }

  statusLabel(status: OnlineMeetingStatus): string {
    return STATUS_LABEL[status] ?? status;
  }

  statusTone(status: OnlineMeetingStatus): ZenTone {
    return ({ READY: 'success', STARTED: 'info', ENDED: 'neutral', CANCELLED: 'neutral', MISSING: 'danger' } as Partial<Record<OnlineMeetingStatus, ZenTone>>)[status] ?? 'warning';
  }
}
