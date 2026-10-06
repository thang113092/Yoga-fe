import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  inject,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZenConfirmService } from './zen-confirm.service';
import { ZenConfirmType } from './zen-confirm.types';

@Component({
  selector: 'zen-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (shouldShow()) {
      <div
        class="zen-modal-backdrop"
        (click)="onBackdropClick()"
        role="presentation"
      >
        <div
          class="zen-confirm-card"
          (click)="$event.stopPropagation()"
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="displayTitle()"
        >
          <!-- Close button top-right -->
          <button
            type="button"
            class="zen-modal-close"
            (click)="onCancel()"
            aria-label="Đóng hộp thoại"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <!-- Icon Header (Zero-Emoji monochromatic SVG in pill) -->
          <div class="zen-confirm-icon-box" [ngClass]="displayType()">
            @switch (displayType()) {
              @case ('delete') {
                <!-- Monochromatic trash / delete SVG -->
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              }
              @case ('cancel') {
                <!-- Monochromatic cancel / undo SVG -->
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
              }
              @case ('warning') {
                <!-- Monochromatic alert triangle SVG -->
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              }
              @default {
                <!-- Monochromatic info SVG -->
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              }
            }
          </div>

          <!-- Body Content -->
          <div class="zen-confirm-content">
            <h3 class="zen-confirm-title">{{ displayTitle() }}</h3>

            @if (displayItemName()) {
              <div class="zen-confirm-item-badge">
                <span class="item-label">Mục xử lý:</span>
                <span class="item-value">{{ displayItemName() }}</span>
              </div>
            }

            <p class="zen-confirm-message">{{ displayMessage() }}</p>

            @if (displayDetails()) {
              <div class="zen-confirm-details" [ngClass]="displayType()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="details-icon">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{{ displayDetails() }}</span>
              </div>
            }
          </div>

          <!-- Action Buttons -->
          <div class="zen-confirm-actions">
            <button
              type="button"
              class="btn-zen-cancel"
              (click)="onCancel()"
            >
              {{ displayCancelText() }}
            </button>

            <button
              type="button"
              class="btn-zen-confirm"
              [ngClass]="'btn-' + displayType()"
              (click)="onConfirm()"
              autofocus
            >
              @if (displayType() === 'delete') {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              } @else if (displayType() === 'cancel') {
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              }
              <span>{{ displayConfirmText() }}</span>
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .zen-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(10, 25, 19, 0.52);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 9999;
      animation: zenFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .zen-confirm-card {
      position: relative;
      background: #ffffff;
      border-radius: 18px;
      border: 1px solid rgba(20, 70, 52, 0.12);
      box-shadow: 0 24px 48px -12px rgba(10, 25, 19, 0.22),
                  0 8px 18px rgba(0, 0, 0, 0.06);
      width: 100%;
      max-width: 440px;
      padding: 26px 24px 22px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      animation: zenCardScale 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .zen-modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: transparent;
      border: none;
      color: #71887e;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.18s ease;

      &:hover {
        background: #f1f5f3;
        color: #144634;
      }
    }

    .zen-confirm-icon-box {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      &.delete {
        background: #fef2f2;
        border: 1px solid rgba(220, 38, 38, 0.2);
        color: #dc2626;
      }

      &.cancel {
        background: #fffbeb;
        border: 1px solid rgba(217, 119, 6, 0.22);
        color: #d97706;
      }

      &.warning {
        background: #fef3c7;
        border: 1px solid rgba(180, 83, 9, 0.2);
        color: #b45309;
      }

      &.info {
        background: rgba(20, 70, 52, 0.08);
        border: 1px solid rgba(20, 70, 52, 0.18);
        color: #144634;
      }
    }

    .zen-confirm-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .zen-confirm-title {
      font-family: var(--font-serif);
      font-size: 1.25rem;
      font-weight: 700;
      color: #144634;
      margin: 0;
      letter-spacing: -0.01em;
      line-height: 1.35;
    }

    .zen-confirm-item-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: #f6f8f7;
      border: 1px solid rgba(20, 70, 52, 0.08);
      border-radius: 8px;
      font-size: 0.85rem;
      width: fit-content;
      max-width: 100%;

      .item-label {
        color: #71887e;
        font-weight: 500;
      }

      .item-value {
        color: #144634;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .zen-confirm-message {
      font-family: var(--font-sans);
      font-size: 0.925rem;
      color: #3b4e45;
      line-height: 1.55;
      margin: 0;
    }

    .zen-confirm-details {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 0.825rem;
      line-height: 1.45;
      margin-top: 4px;

      .details-icon {
        flex-shrink: 0;
        margin-top: 2px;
      }

      &.delete {
        background: #fff5f5;
        border: 1px solid rgba(220, 38, 38, 0.15);
        color: #991b1b;
      }

      &.cancel {
        background: #fffbeb;
        border: 1px solid rgba(217, 119, 6, 0.16);
        color: #92400e;
      }

      &.warning, &.info {
        background: #f4f8f6;
        border: 1px solid rgba(20, 70, 52, 0.12);
        color: #144634;
      }
    }

    .zen-confirm-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-top: 6px;
      padding-top: 14px;
      border-top: 1px solid rgba(20, 70, 52, 0.08);

      button {
        font-family: var(--font-sans);
        font-size: 0.875rem;
        padding: 9px 18px;
        border-radius: 10px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-weight: 600;
        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .btn-zen-cancel {
        background: #ffffff;
        border: 1px solid rgba(20, 70, 52, 0.2);
        color: #244b3c;

        &:hover {
          background: #f6f8f7;
          border-color: #144634;
          color: #144634;
        }
      }

      .btn-zen-confirm {
        color: #ffffff;
        border: none;

        &.btn-delete {
          background: #b91c1c;
          box-shadow: 0 2px 8px rgba(185, 28, 28, 0.25);

          &:hover {
            background: #991b1b;
            box-shadow: 0 4px 12px rgba(185, 28, 28, 0.35);
          }
        }

        &.btn-cancel {
          background: #0f766e;
          box-shadow: 0 2px 8px rgba(15, 118, 110, 0.25);

          &:hover {
            background: #115e59;
            box-shadow: 0 4px 12px rgba(15, 118, 110, 0.35);
          }
        }

        &.btn-warning {
          background: #d97706;
          box-shadow: 0 2px 8px rgba(217, 119, 6, 0.25);

          &:hover {
            background: #b45309;
            box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);
          }
        }

        &.btn-info {
          background: #144634;
          box-shadow: 0 2px 8px rgba(20, 70, 52, 0.25);

          &:hover {
            background: #0d2f23;
            box-shadow: 0 4px 12px rgba(20, 70, 52, 0.35);
          }
        }
      }
    }

    @keyframes zenFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes zenCardScale {
      from {
        opacity: 0;
        transform: scale(0.96) translateY(6px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenConfirmModalComponent {
  private readonly confirmService = inject(ZenConfirmService, { optional: true });

  // Optional inputs for template-driven usage
  readonly isOpen = input<boolean | undefined>(undefined);
  readonly title = input<string>('');
  readonly message = input<string>('');
  readonly itemName = input<string | undefined>(undefined);
  readonly details = input<string | undefined>(undefined);
  readonly confirmText = input<string>('');
  readonly cancelText = input<string>('');
  readonly type = input<ZenConfirmType>('delete');

  // Outputs for template-driven usage
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  // Determine if modal should be shown
  readonly shouldShow = computed(() => {
    const inputVal = this.isOpen();
    if (inputVal !== undefined) {
      return inputVal;
    }
    return this.confirmService?.isOpen() ?? false;
  });

  // Effective options (fallback to service state if inputs not specified)
  private readonly activeState = computed(() => this.confirmService?.state() ?? null);

  readonly displayTitle = computed(() => {
    if (this.title()) return this.title();
    return this.activeState()?.options.title ?? 'Xác Nhận Thao Tác';
  });

  readonly displayMessage = computed(() => {
    if (this.message()) return this.message();
    return this.activeState()?.options.message ?? '';
  });

  readonly displayItemName = computed(() => {
    if (this.itemName()) return this.itemName();
    return this.activeState()?.options.itemName;
  });

  readonly displayDetails = computed(() => {
    if (this.details()) return this.details();
    return this.activeState()?.options.details;
  });

  readonly displayConfirmText = computed(() => {
    if (this.confirmText()) return this.confirmText();
    return this.activeState()?.options.confirmText ?? 'Xác Nhận';
  });

  readonly displayCancelText = computed(() => {
    if (this.cancelText()) return this.cancelText();
    return this.activeState()?.options.cancelText ?? 'Quay Lại';
  });

  readonly displayType = computed<ZenConfirmType>(() => {
    if (this.type() && this.isOpen() !== undefined) return this.type();
    return this.activeState()?.options.type ?? 'warning';
  });

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.shouldShow()) {
      this.onCancel();
    }
  }

  onBackdropClick(): void {
    this.onCancel();
  }

  onConfirm(): void {
    if (this.confirmService && this.isOpen() === undefined) {
      this.confirmService.accept();
    }
    this.confirmed.emit();
  }

  onCancel(): void {
    if (this.confirmService && this.isOpen() === undefined) {
      this.confirmService.reject();
    }
    this.cancelled.emit();
  }
}
