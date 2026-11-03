import { ChangeDetectionStrategy, Component, EventEmitter } from '@angular/core';
import { ZenIconComponent, ZenIconName } from './zen-icon.component';

export interface ZenTabItem<K extends string = string> {
  key: K;
  label: string;
  count?: number | null;
  icon?: ZenIconName;
  disabled?: boolean;
}

/**
 * Thanh tab gạch chân thống nhất cho các trang có nhiều phân mục.
 *
 * <zen-tabs [items]="tabs" [active]="activeTab()" (activeChange)="activeTab.set($event)" />
 */
@Component({
  selector: 'zen-tabs',
  standalone: true,
  inputs: ['items', 'active'],
  outputs: ['activeChange'],
  imports: [ZenIconComponent],
  template: `
    <div class="zt" role="tablist">
      @for (tab of items; track tab.key) {
        <button
          type="button"
          role="tab"
          class="zt-tab"
          [class.is-active]="tab.key === active"
          [attr.aria-selected]="tab.key === active"
          [disabled]="tab.disabled"
          (click)="activeChange.emit(tab.key)"
        >
          @if (tab.icon) { <zen-icon [name]="tab.icon" [size]="16" /> }
          <span>{{ tab.label }}</span>
          @if (tab.count !== null && tab.count !== undefined) {
            <span class="zt-count">{{ tab.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-width: 0; }

    .zt {
      display: flex;
      gap: 4px;
      border-bottom: 1px solid var(--color-border);
      overflow-x: auto;
      scrollbar-width: none;
    }
    .zt::-webkit-scrollbar { display: none; }

    .zt-tab {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 42px;
      padding: 0 14px;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      font-family: var(--font-sans);
      font-size: var(--text-base);
      font-weight: var(--weight-semibold);
      white-space: nowrap;
      cursor: pointer;
      transition: color var(--duration-fast) ease;
    }
    .zt-tab::after {
      content: '';
      position: absolute;
      left: 10px;
      right: 10px;
      bottom: -1px;
      height: 2px;
      border-radius: 2px 2px 0 0;
      background: transparent;
      transition: background-color var(--duration-fast) ease;
    }
    .zt-tab:hover:not(:disabled) { color: var(--color-text-main); }
    .zt-tab.is-active { color: var(--color-primary); }
    .zt-tab.is-active::after { background: var(--color-primary); }
    .zt-tab:disabled { opacity: 0.45; cursor: not-allowed; }
    .zt-tab:focus-visible { outline: none; box-shadow: inset 0 0 0 2px var(--color-focus-ring); border-radius: var(--radius-sm); }

    .zt-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 20px;
      padding: 0 6px;
      border-radius: var(--radius-full);
      background: var(--color-neutral-bg);
      color: var(--color-text-secondary);
      font-size: var(--text-2xs);
      font-weight: var(--weight-bold);
      font-variant-numeric: tabular-nums;
    }
    .zt-tab.is-active .zt-count { background: var(--color-primary-soft); color: var(--color-primary); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenTabsComponent {
  items: readonly ZenTabItem[] = [];
  active: string | null = null;
  readonly activeChange = new EventEmitter<string>();
}
