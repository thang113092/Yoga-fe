import { ChangeDetectionStrategy, Component, EventEmitter } from '@angular/core';
import { ZenIconComponent } from './zen-icon.component';

/**
 * Phân trang (page bắt đầu từ 0, khớp Spring Page).
 *
 * <zen-pagination [page]="data.number" [totalPages]="data.totalPages" [totalElements]="data.totalElements" (pageChange)="load($event)" />
 */
@Component({
  selector: 'zen-pagination',
  standalone: true,
  inputs: ['page', 'totalPages', 'totalElements'],
  outputs: ['pageChange'],
  imports: [ZenIconComponent],
  template: `
    <span class="zp-info">
      @if (totalElements !== null) {
        <strong>{{ totalElements }}</strong> kết quả ·
      }
      Trang <strong>{{ page + 1 }}</strong> / {{ safeTotal }}
    </span>
    <div class="zp-actions">
      <button type="button" class="zen-btn zen-btn--outline zen-btn--sm" [disabled]="page <= 0" (click)="pageChange.emit(page - 1)">
        <zen-icon name="chevron-left" [size]="16" />
        <span>Trước</span>
      </button>
      <button type="button" class="zen-btn zen-btn--outline zen-btn--sm" [disabled]="page + 1 >= safeTotal" (click)="pageChange.emit(page + 1)">
        <span>Sau</span>
        <zen-icon name="chevron-right" [size]="16" />
      </button>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      font-size: var(--text-sm);
      color: var(--color-text-muted);
    }
    .zp-info strong { color: var(--color-text-main); font-weight: var(--weight-semibold); font-variant-numeric: tabular-nums; }
    .zp-actions { display: flex; gap: 8px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenPaginationComponent {
  page: number = 0;
  totalPages: number = 1;
  totalElements: number | null = null;
  readonly pageChange = new EventEmitter<number>();

  protected get safeTotal(): number {
    return Math.max(1, this.totalPages);
  }
}
