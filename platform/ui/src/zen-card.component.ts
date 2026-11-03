import { booleanAttribute, ChangeDetectionStrategy, Component } from '@angular/core';

export type ZenCardPadding = 'none' | 'sm' | 'md' | 'lg';

/**
 * Khung card chuẩn: viền mảnh, bo 12px, đổ bóng nhẹ. Header tùy chọn.
 *
 * <zen-card heading="Danh sách" subtitle="..." padding="none">
 *   <div card-actions>...</div>
 *   <table class="zen-table">...</table>
 *   <div card-footer>...</div>
 * </zen-card>
 */
@Component({
  selector: 'zen-card',
  standalone: true,
  inputs: ['heading', 'subtitle', 'padding', { name: 'interactive', transform: booleanAttribute }, { name: 'selected', transform: booleanAttribute }],
  host: {
    '[class.is-interactive]': 'interactive',
    '[class.is-selected]': 'selected'
  },
  template: `
    @if (heading || subtitle) {
      <header class="zc-header">
        <div class="zc-heading">
          @if (heading) { <h2 class="zc-title">{{ heading }}</h2> }
          @if (subtitle) { <p class="zc-subtitle">{{ subtitle }}</p> }
        </div>
        <div class="zc-actions"><ng-content select="[card-actions]" /></div>
      </header>
    }
    <div class="zc-body" [attr.data-padding]="padding">
      <ng-content />
    </div>
    <div class="zc-footer"><ng-content select="[card-footer]" /></div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xs);
      overflow: hidden;
      transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease;
    }
    :host(.is-interactive) { cursor: pointer; }
    :host(.is-interactive:hover) { border-color: var(--color-border-strong); box-shadow: var(--shadow-md); }
    :host(.is-selected) { border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-focus-ring); }

    .zc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-md);
      flex-wrap: wrap;
      padding: 16px 20px;
      border-bottom: 1px solid var(--color-border);
    }
    .zc-heading { min-width: 0; }
    .zc-title {
      margin: 0;
      font-family: var(--font-sans);
      font-size: var(--text-md);
      font-weight: var(--weight-semibold);
      line-height: var(--leading-tight);
      color: var(--color-text-main);
    }
    .zc-subtitle { margin: 4px 0 0; font-size: var(--text-sm); color: var(--color-text-muted); }
    .zc-actions { display: flex; align-items: center; gap: var(--spacing-sm); flex-wrap: wrap; }
    .zc-actions:empty { display: none; }

    .zc-body { flex: 1; min-width: 0; }
    .zc-body[data-padding='sm'] { padding: 12px 16px; }
    .zc-body[data-padding='md'] { padding: 20px; }
    .zc-body[data-padding='lg'] { padding: 28px; }

    .zc-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface-variant);
    }
    .zc-footer:empty { display: none; }

    @media (max-width: 640px) {
      .zc-header { padding: 14px 16px; }
      .zc-body[data-padding='md'], .zc-body[data-padding='lg'] { padding: 16px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenCardComponent {
  heading: string = '';
  subtitle: string = '';
  padding: ZenCardPadding = 'md';
  interactive: boolean = false;
  selected: boolean = false;
}
