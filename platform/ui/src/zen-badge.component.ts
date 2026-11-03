import { booleanAttribute, ChangeDetectionStrategy, Component } from '@angular/core';

export type ZenTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/**
 * Nhãn trạng thái dạng pill. Dùng cho trạng thái đơn hàng, vai trò, tình trạng thẻ...
 *
 * <zen-badge tone="success" dot>Đã thanh toán</zen-badge>
 */
@Component({
  selector: 'zen-badge',
  standalone: true,
  inputs: ['tone', 'size', { name: 'dot', transform: booleanAttribute }],
  host: {
    '[attr.data-tone]': 'tone',
    '[attr.data-size]': 'size'
  },
  template: `
    @if (dot) { <span class="zb-dot" aria-hidden="true"></span> }
    <ng-content />
  `,
  styles: [`
    :host {
      --tone-fg: var(--color-neutral);
      --tone-bg: var(--color-neutral-bg);
      --tone-border: var(--color-neutral-border);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 24px;
      padding: 0 10px;
      border: 1px solid var(--tone-border);
      border-radius: var(--radius-full);
      background: var(--tone-bg);
      color: var(--tone-fg);
      font-family: var(--font-sans);
      font-size: var(--text-xs);
      font-weight: var(--weight-semibold);
      line-height: 1;
      white-space: nowrap;
      vertical-align: middle;
    }
    :host([data-size='sm']) { height: 20px; padding: 0 8px; font-size: var(--text-2xs); }

    :host([data-tone='primary']) { --tone-fg: var(--color-primary); --tone-bg: var(--color-primary-soft); --tone-border: var(--color-primary-soft-hover); }
    :host([data-tone='success']) { --tone-fg: var(--color-success); --tone-bg: var(--color-success-bg); --tone-border: var(--color-success-border); }
    :host([data-tone='warning']) { --tone-fg: var(--color-warning); --tone-bg: var(--color-warning-bg); --tone-border: var(--color-warning-border); }
    :host([data-tone='danger'])  { --tone-fg: var(--color-error);   --tone-bg: var(--color-error-bg);   --tone-border: var(--color-error-border); }
    :host([data-tone='info'])    { --tone-fg: var(--color-info);    --tone-bg: var(--color-info-bg);    --tone-border: var(--color-info-border); }

    .zb-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenBadgeComponent {
  tone: ZenTone = 'neutral';
  size: 'sm' | 'md' = 'md';
  dot: boolean = false;
}
