import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ZenIconComponent, ZenIconName } from './zen-icon.component';
import { ZenTone } from './zen-badge.component';

/**
 * Ô số liệu tổng quan (KPI). Dùng trong <div class="zen-grid zen-grid--stats">.
 *
 * <zen-stat-card label="Doanh thu tháng" value="128.500.000 ₫" icon="wallet" tone="success" hint="+12% so với tháng trước" />
 */
@Component({
  selector: 'zen-stat-card',
  standalone: true,
  inputs: ['label', 'value', 'hint', 'icon', 'tone'],
  imports: [ZenIconComponent],
  host: { '[attr.data-tone]': 'tone' },
  template: `
    <div class="zs-top">
      <span class="zs-label">{{ label }}</span>
      @if (icon) {
        <span class="zs-icon"><zen-icon [name]="icon" [size]="18" /></span>
      }
    </div>
    <div class="zs-value">{{ value }}<ng-content select="[value-suffix]" /></div>
    @if (hint) {
      <div class="zs-hint">{{ hint }}</div>
    }
    <ng-content />
  `,
  styles: [`
    :host {
      --tone-fg: var(--color-primary);
      --tone-bg: var(--color-primary-soft);
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 0;
      padding: 18px 20px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xs);
    }
    :host([data-tone='success']) { --tone-fg: var(--color-success); --tone-bg: var(--color-success-bg); }
    :host([data-tone='warning']) { --tone-fg: var(--color-warning); --tone-bg: var(--color-warning-bg); }
    :host([data-tone='danger'])  { --tone-fg: var(--color-error);   --tone-bg: var(--color-error-bg); }
    :host([data-tone='info'])    { --tone-fg: var(--color-info);    --tone-bg: var(--color-info-bg); }
    :host([data-tone='neutral']) { --tone-fg: var(--color-neutral); --tone-bg: var(--color-neutral-bg); }

    .zs-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .zs-label {
      font-size: var(--text-sm);
      font-weight: var(--weight-medium);
      color: var(--color-text-muted);
    }
    .zs-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: var(--tone-bg);
      color: var(--tone-fg);
      flex-shrink: 0;
    }
    .zs-value {
      font-family: var(--font-sans);
      font-size: var(--text-2xl);
      font-weight: var(--weight-bold);
      line-height: var(--leading-tight);
      letter-spacing: -0.02em;
      color: var(--color-text-main);
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }
    .zs-hint { font-size: var(--text-xs); color: var(--color-text-muted); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenStatCardComponent {
  label: string = '';
  value: string | number | null = '';
  hint: string = '';
  icon: ZenIconName | null = null;
  tone: ZenTone = 'primary';
}
