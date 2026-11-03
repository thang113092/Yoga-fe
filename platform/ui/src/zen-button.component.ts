import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type ZenButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ZenButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'zen-button',
  standalone: true,
  imports: [CommonModule],
  inputs: ['variant', 'size', 'disabled', 'loading', 'type', 'fullWidth'],
  outputs: ['clicked'],
  template: `
    <button
      [type]="type"
      class="zen-btn"
      [class.zen-btn--primary]="variant === 'primary'"
      [class.zen-btn--secondary]="variant === 'secondary'"
      [class.zen-btn--outline]="variant === 'outline'"
      [class.zen-btn--danger]="variant === 'danger'"
      [class.zen-btn--ghost]="variant === 'ghost'"
      [class.btn-primary]="variant === 'primary'"
      [class.zen-btn--sm]="size === 'sm'"
      [class.zen-btn--lg]="size === 'lg'"
      [class.zen-btn--block]="fullWidth"
      [class.is-loading]="loading"
      [disabled]="disabled || loading"
      (click)="onClick($event)"
    >
      @if (loading) {
        <svg class="btn-spinner zen-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
      }
      <ng-content></ng-content>
    </button>
  `,
  // Giao diện nút lấy từ lớp .zen-btn trong platform/ui/src/styles/zen-ui.scss.
  host: { '[class.is-block]': 'fullWidth' },
  styles: [`
    :host { display: inline-flex; vertical-align: middle; }
    :host(.is-block) { display: flex; width: 100%; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenButtonComponent {
  variant: ZenButtonVariant = 'primary';
  size: ZenButtonSize = 'md';
  disabled = false;
  loading = false;
  type: 'button' | 'submit' | 'reset' = 'button';
  fullWidth = false;

  readonly clicked = new EventEmitter<MouseEvent>();

  onClick(event: MouseEvent): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.clicked.emit(event);
  }
}
