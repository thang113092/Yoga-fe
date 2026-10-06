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
      [class.btn-primary]="variant === 'primary'"
      [class.btn-secondary]="variant === 'secondary'"
      [class.btn-outline]="variant === 'outline'"
      [class.btn-danger]="variant === 'danger'"
      [class.btn-ghost]="variant === 'ghost'"
      [class.size-sm]="size === 'sm'"
      [class.size-md]="size === 'md'"
      [class.size-lg]="size === 'lg'"
      [class.full-width]="fullWidth"
      [class.is-loading]="loading"
      [disabled]="disabled || loading"
      (click)="onClick($event)"
    >
      @if (loading) {
        <svg class="btn-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
      }
      <span class="btn-content">
        <ng-content></ng-content>
      </span>
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
      vertical-align: middle;
    }

    :host(.full-width) {
      display: block;
      width: 100%;
    }

    .zen-btn {
      font-family: var(--font-sans);
      font-weight: 600;
      line-height: 1.4;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 10px;
      border: 1px solid transparent;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
      white-space: nowrap;
      position: relative;

      &:focus-visible {
        outline: none !important;
        box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.22) !important;
      }

      &:active:not(:disabled) {
        transform: translateY(1px);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
        box-shadow: none !important;
      }

      &.full-width {
        width: 100%;
      }

      /* Sizes */
      &.size-sm {
        min-height: 34px;
        padding: 6px 12px;
        font-size: 0.8125rem;
      }

      &.size-md {
        min-height: 42px;
        padding: 9px 18px;
        font-size: 0.875rem;
      }

      &.size-lg {
        min-height: 48px;
        padding: 12px 24px;
        font-size: 1rem;
      }

      /* Variants */
      &.btn-primary {
        background: #144634;
        color: #ffffff;
        border-color: #144634;
        box-shadow: 0 1px 3px rgba(20, 70, 52, 0.12);

        &:hover:not(:disabled) {
          background: #0d2f23;
          border-color: #0d2f23;
          box-shadow: 0 4px 12px rgba(20, 70, 52, 0.2);
        }
      }

      &.btn-secondary {
        background: #edf6f3;
        color: #144634;
        border-color: #cce3da;

        &:hover:not(:disabled) {
          background: #deeee8;
          border-color: #b7d8cc;
          color: #0d2f23;
        }
      }

      &.btn-outline {
        background: #ffffff;
        color: #144634;
        border-color: rgba(20, 70, 52, 0.2);
        box-shadow: 0 1px 2px rgba(20, 70, 52, 0.04);

        &:hover:not(:disabled) {
          background: #fafcfb;
          border-color: #0f766e;
          color: #0f766e;
          box-shadow: 0 2px 6px rgba(15, 118, 110, 0.08);
        }
      }

      &.btn-danger {
        background: #ef4444;
        color: #ffffff;
        border-color: #ef4444;

        &:hover:not(:disabled) {
          background: #dc2626;
          border-color: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25);
        }
      }

      &.btn-ghost {
        background: transparent;
        color: #536961;
        border-color: transparent;

        &:hover:not(:disabled) {
          background: rgba(20, 70, 52, 0.06);
          color: #144634;
        }
      }

      .btn-spinner {
        animation: spin 0.8s linear infinite;
        flex-shrink: 0;
      }

      .btn-content {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
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
