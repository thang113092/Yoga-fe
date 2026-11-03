import { booleanAttribute, ChangeDetectionStrategy, Component } from '@angular/core';
import { ZenIconComponent, ZenIconName } from './zen-icon.component';

/**
 * Trạng thái rỗng thống nhất.
 *
 * <zen-empty-state icon="inbox" heading="Chưa có đơn hàng" description="...">
 *   <button class="zen-btn zen-btn--primary">Tạo đơn</button>
 * </zen-empty-state>
 */
@Component({
  selector: 'zen-empty-state',
  standalone: true,
  inputs: ['icon', 'heading', 'description', { name: 'compact', transform: booleanAttribute }],
  imports: [ZenIconComponent],
  host: { '[class.is-compact]': 'compact' },
  template: `
    <span class="ze-icon"><zen-icon [name]="icon" [size]="compact ? 20 : 24" /></span>
    <p class="ze-title">{{ heading }}</p>
    @if (description) {
      <p class="ze-desc">{{ description }}</p>
    }
    <div class="ze-actions"><ng-content /></div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px 24px;
    }
    :host(.is-compact) { padding: 28px 16px; }

    .ze-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      margin-bottom: 14px;
      border-radius: 50%;
      background: var(--color-primary-soft);
      color: var(--color-primary);
    }
    :host(.is-compact) .ze-icon { width: 40px; height: 40px; margin-bottom: 10px; }

    .ze-title {
      margin: 0;
      font-size: var(--text-md);
      font-weight: var(--weight-semibold);
      color: var(--color-text-main);
    }
    .ze-desc {
      margin: 6px 0 0;
      max-width: 440px;
      font-size: var(--text-sm);
      line-height: var(--leading-relaxed);
      color: var(--color-text-muted);
    }
    .ze-actions { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; justify-content: center; margin-top: 18px; }
    .ze-actions:empty { display: none; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenEmptyStateComponent {
  icon: ZenIconName = 'inbox';
  heading: string = '';
  description: string = '';
  compact: boolean = false;
}
