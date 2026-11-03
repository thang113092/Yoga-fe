import { booleanAttribute, ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Trạng thái đang tải thống nhất.
 *
 * <zen-loading message="Đang đồng bộ dữ liệu..." />
 * <zen-loading inline />   (spinner nhỏ trong dòng)
 */
@Component({
  selector: 'zen-loading',
  standalone: true,
  inputs: ['message', { name: 'inline', transform: booleanAttribute }],
  host: { '[class.is-inline]': 'inline', role: 'status', 'aria-live': 'polite' },
  template: `
    <span class="zl-spinner" aria-hidden="true"></span>
    @if (message) { <span class="zl-text">{{ message }}</span> }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 48px 16px;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    :host(.is-inline) { flex-direction: row; display: inline-flex; padding: 0; gap: 8px; }

    .zl-spinner {
      width: 28px;
      height: 28px;
      border: 2.5px solid var(--color-primary-soft-hover);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: zl-spin 0.75s linear infinite;
    }
    :host(.is-inline) .zl-spinner { width: 16px; height: 16px; border-width: 2px; }

    @keyframes zl-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .zl-spinner { animation-duration: 2s; } }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenLoadingComponent {
  message: string = '';
  inline: boolean = false;
}
