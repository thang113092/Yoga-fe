import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OnlineReconciliationRow, PosApi } from '@yoga/mod-membership/data-access';
import { ZEN_UI } from '@yoga/platform/ui';

/**
 * VietQR money that reached the gateway but could not activate its order. Until a manager records how it
 * was settled (refund, manual activation...), the order can be neither cancelled nor collected again.
 */
@Component({
  selector: 'yoga-online-reconciliation',
  standalone: true,
  imports: [CommonModule, FormsModule, ...ZEN_UI],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length > 0 || error()) {
      <zen-card class="reconcile-card" padding="none">
        <div class="reconcile-head">
          <zen-icon name="alert-triangle" [size]="18" />
          <div>
            <h2 class="zen-section-title">Tiền VietQR chờ đối soát ({{ rows().length }})</h2>
            <p class="zen-text-sm zen-text-muted">Khách đã chuyển tiền nhưng thẻ chưa được kích hoạt. Không thu thêm; xử lý (hoàn tiền hoặc kích hoạt thủ công) rồi ghi nhận tại đây.</p>
          </div>
        </div>
        @if (error()) {
          <zen-alert tone="danger" dismissible (dismissed)="error.set('')">{{ error() }}</zen-alert>
        }
        <div class="zen-table-wrap">
          <table class="zen-table">
            <thead>
              <tr>
                <th>Đơn hàng</th>
                <th>Học viên</th>
                <th>Cơ sở</th>
                <th class="is-numeric">Đơn / Đã nhận</th>
                <th>Mã cổng · Tham chiếu</th>
                <th>Xử lý</th>
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row.id) {
                <tr>
                  <td>
                    <span class="zen-mono cell-primary">{{ row.orderCode }}</span>
                    <span class="cell-sub">{{ row.paidAt | date:'dd/MM/yyyy HH:mm' }}</span>
                  </td>
                  <td>
                    <span class="cell-primary">{{ row.customerName || '—' }}</span>
                    <span class="cell-sub">{{ row.customerPhone || '' }}</span>
                  </td>
                  <td class="cell-muted">{{ row.branchName }}</td>
                  <td class="is-numeric">
                    <span>{{ row.amount | number:'1.0-0' }} ₫</span>
                    <span class="cell-sub" [class.amount-mismatch]="row.paidAmount !== row.amount">{{ (row.paidAmount ?? 0) | number:'1.0-0' }} ₫</span>
                  </td>
                  <td>
                    <span class="zen-mono">{{ row.providerOrderCode }}</span>
                    <span class="cell-sub zen-mono">{{ row.providerReference || '—' }}</span>
                  </td>
                  <td class="resolve-cell">
                    @if (resolvingId() === row.id) {
                      <textarea class="zen-control" rows="2" [(ngModel)]="note" maxlength="1000"
                        placeholder="Đã xử lý thế nào? VD: Hoàn tiền CK ngày..., mã GD..." [attr.aria-label]="'Cách xử lý đơn ' + row.orderCode"></textarea>
                      <div class="zen-row">
                        <button type="button" class="zen-btn zen-btn--primary zen-btn--sm" (click)="resolve(row)" [disabled]="busy() || !note.trim()">Xác nhận đã xử lý</button>
                        <button type="button" class="zen-btn zen-btn--ghost zen-btn--sm" (click)="resolvingId.set(null)" [disabled]="busy()">Hủy</button>
                      </div>
                    } @else {
                      <button type="button" class="zen-btn zen-btn--outline zen-btn--sm" (click)="startResolve(row)" [disabled]="busy()">Ghi nhận xử lý</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </zen-card>
    }
  `,
  styles: [`
    :host { display: block; }
    .reconcile-card { border-color: var(--color-warning-border); }
    .reconcile-head {
      display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px;
      border-bottom: 1px solid var(--color-border); background: var(--color-warning-bg); color: var(--color-text-main);
      p { margin: 4px 0 0; }
    }
    .amount-mismatch { color: var(--color-error); font-weight: var(--weight-semibold); }
    .resolve-cell { min-width: 240px; textarea { width: 100%; margin-bottom: 6px; } }
  `]
})
export class OnlineReconciliationComponent implements OnInit {
  private readonly api = inject(PosApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<OnlineReconciliationRow[]>([]);
  readonly error = signal('');
  readonly busy = signal(false);
  readonly resolvingId = signal<string | null>(null);
  note = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.listOnlineReconciliation().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: rows => this.rows.set(rows),
      error: () => this.error.set('Không tải được danh sách tiền VietQR chờ đối soát.')
    });
  }

  startResolve(row: OnlineReconciliationRow): void {
    this.note = '';
    this.resolvingId.set(row.id);
  }

  resolve(row: OnlineReconciliationRow): void {
    const note = this.note.trim();
    if (!note || this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.api.resolveOnlineReconciliation(row.id, note).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.rows.update(list => list.filter(r => r.id !== row.id));
        this.resolvingId.set(null); this.busy.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message || 'Chưa ghi nhận được. Vui lòng thử lại.');
        this.busy.set(false); this.load();
      }
    });
  }
}
