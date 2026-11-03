import { booleanAttribute, ChangeDetectionStrategy, Component, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { ZenIconComponent, ZenIconName } from './zen-icon.component';

export type ZenModalSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Khung modal dùng chung: overlay mờ, header (icon + tiêu đề + mô tả), body cuộn, footer cố định.
 *
 * @if (showForm()) {
 *   <zen-modal heading="Thêm cơ sở" subtitle="..." icon="building" size="md" (closed)="showForm.set(false)">
 *     ...nội dung form...
 *     <ng-container modal-footer>
 *       <button class="zen-btn zen-btn--outline" (click)="showForm.set(false)">Hủy</button>
 *       <button class="zen-btn zen-btn--primary">Lưu</button>
 *     </ng-container>
 *   </zen-modal>
 * }
 */
@Component({
  selector: 'zen-modal',
  standalone: true,
  inputs: ['heading', 'subtitle', 'icon', 'tone', 'size', { name: 'closeOnBackdrop', transform: booleanAttribute }, { name: 'closable', transform: booleanAttribute }],
  outputs: ['closed'],
  imports: [ZenIconComponent],
  host: {
    '(document:keydown.escape)': 'onEscape()'
  },
  template: `
    <div class="zm-overlay" (click)="closeOnBackdrop && requestClose()">
      <div
        class="zm-dialog"
        [attr.data-size]="size"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="heading"
        (click)="$event.stopPropagation()"
      >
        <header class="zm-header">
          @if (icon) {
            <span class="zm-icon" [attr.data-tone]="tone"><zen-icon [name]="icon" [size]="20" /></span>
          }
          <div class="zm-heading">
            <h2 class="zm-title">{{ heading }}</h2>
            @if (subtitle) { <p class="zm-subtitle">{{ subtitle }}</p> }
          </div>
          <button type="button" class="zm-close" [disabled]="!closable" (click)="requestClose()" aria-label="Đóng">
            <zen-icon name="close" [size]="18" />
          </button>
        </header>
        <div class="zm-body">
          <ng-content />
        </div>
        <footer class="zm-footer"><ng-content select="[modal-footer]" /></footer>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }

    .zm-overlay {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      background: rgba(16, 28, 24, 0.45);
      backdrop-filter: blur(3px);
      animation: zm-fade var(--duration-base) ease;
    }

    .zm-dialog {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 560px;
      max-height: calc(100dvh - 48px);
      background: var(--color-surface);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      overflow: hidden;
      font-family: var(--font-sans);
      animation: zm-rise var(--duration-base) var(--ease-spring);
    }
    .zm-dialog[data-size='sm'] { max-width: 420px; }
    .zm-dialog[data-size='lg'] { max-width: 760px; }
    .zm-dialog[data-size='xl'] { max-width: 1040px; }

    .zm-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--color-border);
    }
    .zm-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      background: var(--color-primary-soft);
      color: var(--color-primary);
      flex-shrink: 0;
    }
    .zm-icon[data-tone='danger'] { background: var(--color-error-bg); color: var(--color-error); }
    .zm-icon[data-tone='warning'] { background: var(--color-warning-bg); color: var(--color-warning); }
    .zm-icon[data-tone='info'] { background: var(--color-info-bg); color: var(--color-info); }

    .zm-heading { flex: 1; min-width: 0; padding-top: 2px; }
    .zm-title {
      margin: 0;
      font-family: var(--font-sans);
      font-size: var(--text-lg);
      font-weight: var(--weight-semibold);
      line-height: var(--leading-tight);
      color: var(--color-text-main);
    }
    .zm-subtitle { margin: 4px 0 0; font-size: var(--text-sm); line-height: var(--leading-normal); color: var(--color-text-muted); }

    .zm-close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin: -4px -8px 0 0;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--color-text-muted);
      cursor: pointer;
      flex-shrink: 0;
    }
    .zm-close:hover { background: var(--color-surface-hover); color: var(--color-text-main); }
    .zm-close:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--color-focus-ring); }

    .zm-body { flex: 1; overflow-y: auto; padding: 20px 24px; }

    .zm-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--spacing-sm);
      flex-wrap: wrap;
      padding: 14px 24px;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface-variant);
    }
    .zm-footer:empty { display: none; }

    @keyframes zm-fade { from { opacity: 0; } }
    @keyframes zm-rise { from { opacity: 0; transform: translateY(8px) scale(0.98); } }

    @media (max-width: 640px) {
      .zm-overlay { align-items: flex-end; padding: 0; }
      .zm-dialog { max-width: none !important; max-height: 92dvh; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
      .zm-header, .zm-body, .zm-footer { padding-left: 16px; padding-right: 16px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .zm-overlay, .zm-dialog { animation: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenModalComponent implements OnInit, OnDestroy {
  heading: string = '';
  subtitle: string = '';
  icon: ZenIconName | null = null;
  tone: 'primary' | 'danger' | 'warning' | 'info' = 'primary';
  size: ZenModalSize = 'md';
  closeOnBackdrop: boolean = true;
  /** false: khóa đóng modal (ví dụ khi đang lưu) — nút X, Esc và click nền đều bị bỏ qua. */
  closable: boolean = true;
  readonly closed = new EventEmitter<void>();

  // Ngăn xếp modal đang mở: chỉ modal trên cùng phản hồi phím Esc.
  private static readonly openStack: ZenModalComponent[] = [];

  ngOnInit(): void {
    ZenModalComponent.openStack.push(this);
  }

  ngOnDestroy(): void {
    const stack = ZenModalComponent.openStack;
    const index = stack.indexOf(this);
    if (index >= 0) stack.splice(index, 1);
  }

  onEscape(): void {
    const stack = ZenModalComponent.openStack;
    if (stack[stack.length - 1] === this) this.requestClose();
  }

  requestClose(): void {
    if (this.closable) this.closed.emit();
  }
}
