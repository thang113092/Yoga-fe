import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Tiêu đề trang quản lý — gọn trong một dòng: tiêu đề + số lượng + mô tả ngắn, hành động bên phải.
 * `eyebrow` được giữ để tương thích nhưng không hiển thị (menu header đã cho biết phân hệ).
 *
 * <zen-page-header heading="Đơn hàng" subtitle="..." [count]="120" countLabel="đơn">
 *   <button class="zen-btn zen-btn--primary" actions>Tạo mới</button>
 * </zen-page-header>
 */
@Component({
  selector: 'zen-page-header',
  standalone: true,
  inputs: ['eyebrow', 'heading', 'subtitle', 'count', 'countLabel'],
  template: `
    <div class="zph">
      <div class="zph-text">
        <h1 class="zph-title">{{ heading }}</h1>
        @if (count !== null && count !== undefined) {
          <span class="zph-count">{{ count }}{{ countLabel ? ' ' + countLabel : '' }}</span>
        }
        <ng-content select="[title-extra]" />
        @if (subtitle) {
          <p class="zph-subtitle" [attr.title]="subtitle">{{ subtitle }}</p>
        }
      </div>
      <div class="zph-actions">
        <ng-content select="[actions]" />
      </div>
    </div>
    <ng-content />
  `,
  styles: [`
    :host { display: block; }

    .zph {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-sm) var(--spacing-lg);
      flex-wrap: wrap;
      min-height: var(--control-height-md);
    }

    .zph-text {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1 1 320px;
      min-width: 0;
    }

    .zph-title {
      margin: 0;
      flex-shrink: 0;
      font-family: var(--font-display);
      font-size: var(--text-xl);
      font-weight: var(--weight-semibold);
      line-height: var(--leading-tight);
      letter-spacing: -0.01em;
      color: var(--color-text-main);
      white-space: nowrap;
    }

    .zph-count {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      height: 22px;
      padding: 0 9px;
      border-radius: var(--radius-full);
      background: var(--color-neutral-bg);
      color: var(--color-text-secondary);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    /* Mô tả ngắn cùng dòng, ngăn cách bằng vạch mảnh; tự cắt khi hẹp. */
    .zph-subtitle {
      min-width: 0;
      margin: 0;
      padding-left: 12px;
      border-left: 1px solid var(--color-border-strong);
      font-size: var(--text-sm);
      line-height: 1.4;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .zph-actions {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
    }
    .zph-actions:empty { display: none; }

    @media (max-width: 1024px) {
      .zph-subtitle { display: none; }
    }
    @media (max-width: 640px) {
      .zph-title { font-size: var(--text-lg); }
      .zph-actions { width: 100%; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenPageHeaderComponent {
  eyebrow: string = '';
  heading: string = '';
  subtitle: string = '';
  count: number | string | null = null;
  countLabel: string = '';
}
