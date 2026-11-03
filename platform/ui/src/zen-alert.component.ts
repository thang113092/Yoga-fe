import { booleanAttribute, ChangeDetectionStrategy, Component, EventEmitter } from '@angular/core';
import { ZenIconComponent, ZenIconName } from './zen-icon.component';

export type ZenAlertTone = 'success' | 'warning' | 'danger' | 'info';

const DEFAULT_ICONS: Record<ZenAlertTone, ZenIconName> = {
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-circle',
  info: 'info'
};

/**
 * Hộp thông báo nội tuyến (lỗi tải dữ liệu, cảnh báo, ghi chú quy tắc...).
 *
 * <zen-alert tone="danger" dismissible (dismissed)="error.set('')">{{ error() }}</zen-alert>
 */
@Component({
  selector: 'zen-alert',
  standalone: true,
  inputs: ['tone', 'heading', 'icon', { name: 'dismissible', transform: booleanAttribute }],
  outputs: ['dismissed'],
  imports: [ZenIconComponent],
  host: { '[attr.data-tone]': 'tone', role: 'alert' },
  template: `
    <zen-icon class="za-icon" [name]="resolvedIcon" [size]="18" />
    <div class="za-content">
      @if (heading) { <p class="za-title">{{ heading }}</p> }
      <div class="za-text"><ng-content /></div>
    </div>
    @if (dismissible) {
      <button type="button" class="za-close" (click)="dismissed.emit()" aria-label="Đóng thông báo">
        <zen-icon name="close" [size]="16" />
      </button>
    }
  `,
  styles: [`
    :host {
      --tone-fg: var(--color-info);
      --tone-bg: var(--color-info-bg);
      --tone-border: var(--color-info-border);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border: 1px solid var(--tone-border);
      border-radius: var(--radius-md);
      background: var(--tone-bg);
      color: var(--color-text-main);
      font-size: var(--text-sm);
      line-height: var(--leading-normal);
    }
    :host([data-tone='success']) { --tone-fg: var(--color-success); --tone-bg: var(--color-success-bg); --tone-border: var(--color-success-border); }
    :host([data-tone='warning']) { --tone-fg: var(--color-warning); --tone-bg: var(--color-warning-bg); --tone-border: var(--color-warning-border); }
    :host([data-tone='danger'])  { --tone-fg: var(--color-error);   --tone-bg: var(--color-error-bg);   --tone-border: var(--color-error-border); }

    .za-icon { color: var(--tone-fg); margin-top: 1px; }
    .za-content { flex: 1; min-width: 0; }
    .za-title { margin: 0 0 2px; font-weight: var(--weight-semibold); color: var(--tone-fg); }
    .za-text { color: var(--color-text-secondary); }
    .za-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      margin: -3px -6px -3px 0;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--tone-fg);
      cursor: pointer;
      opacity: 0.7;
    }
    .za-close:hover { opacity: 1; background: rgba(0, 0, 0, 0.04); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenAlertComponent {
  tone: ZenAlertTone = 'info';
  heading: string = '';
  icon: ZenIconName | null = null;
  dismissible: boolean = false;
  readonly dismissed = new EventEmitter<void>();

  protected get resolvedIcon(): ZenIconName {
    return this.icon ?? DEFAULT_ICONS[this.tone];
  }
}
