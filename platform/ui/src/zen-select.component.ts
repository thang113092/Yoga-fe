import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  computed,
  signal,
  inject,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface ZenSelectOption<T = any> {
  value: T;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

@Component({
  selector: 'zen-select',
  standalone: true,
  imports: [CommonModule],
  inputs: ['placeholder', 'valueKey', 'labelKey', 'sublabelKey', 'options', 'disabled', 'name'],
  outputs: ['valueChange'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZenSelectComponent),
      multi: true
    }
  ],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(keydown.escape)': 'onEscape()',
    '(window:resize)': 'close()'
  },
  template: `
    <div class="zen-select-wrapper" [class.is-open]="isOpen()" [class.is-disabled]="isDisabled()">
      <button
        type="button"
        class="zen-select-trigger"
        [class.has-value]="selectedOption() !== null"
        [disabled]="isDisabled()"
        (click)="toggleOpen()"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-disabled]="isDisabled()"
        aria-haspopup="listbox"
      >
        <span class="trigger-label">
          @if (selectedOption()) {
            <span class="main-label">{{ selectedOption()?.label }}</span>
            @if (selectedOption()?.sublabel) {
              <span class="sub-label">({{ selectedOption()?.sublabel }})</span>
            }
          } @else {
            <span class="placeholder">{{ placeholder }}</span>
          }
        </span>

        <svg
          class="chevron-icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      @if (isOpen()) {
        <div
          class="zen-select-dropdown"
          role="listbox"
          [class.is-above]="dropdownPos()?.above"
          [style.top.px]="dropdownPos()?.top"
          [style.bottom.px]="dropdownPos()?.bottom"
          [style.left.px]="dropdownPos()?.left"
          [style.min-width.px]="dropdownPos()?.width"
          [style.max-height.px]="dropdownPos()?.maxHeight"
          (click)="$event.stopPropagation()"
        >
          @if (normalizedOptions().length === 0) {
            <div class="empty-options">Không có lựa chọn nào</div>
          } @else {
            @for (opt of normalizedOptions(); track $index) {
              <div
                class="zen-select-option"
                [class.is-selected]="isSelected(opt.value)"
                [class.is-disabled]="opt.disabled"
                (click)="selectOption(opt)"
                role="option"
                [attr.aria-selected]="isSelected(opt.value)"
              >
                <div class="option-content">
                  <span class="option-label">{{ opt.label }}</span>
                  @if (opt.sublabel) {
                    <span class="option-sublabel">{{ opt.sublabel }}</span>
                  }
                </div>

                @if (isSelected(opt.value)) {
                  <svg
                    class="check-icon"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                }
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 100%;
      vertical-align: middle;
      font-family: var(--font-sans);
    }

    .zen-select-wrapper {
      position: relative;
      width: 100%;
      user-select: none;

      &.is-disabled {
        opacity: 0.65;
        cursor: not-allowed;

        .zen-select-trigger {
          background: var(--color-surface-variant);
          border-color: rgba(20, 70, 52, 0.08);
          color: var(--color-text-muted);
          cursor: not-allowed;
          box-shadow: none;
        }
      }

      &.is-open {
        .zen-select-trigger {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-focus-ring);
          background: var(--color-surface);

          .chevron-icon {
            transform: rotate(180deg);
            color: var(--color-primary);
          }
        }
      }
    }

    .zen-select-trigger {
      width: 100%;
      min-height: var(--control-height-md);
      padding: 8px 14px;
      background: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: var(--color-primary);
      font-size: var(--text-base);
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      box-shadow: var(--shadow-xs);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover:not(:disabled) {
        border-color: var(--color-primary);
        background: var(--color-surface-hover);
        box-shadow: var(--shadow-xs);
      }

      &:focus-visible {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-focus-ring);
      }

      /* Ô hẹp (bộ lọc trên toolbar) chỉ hiện nhãn chính; chú thích phụ vẫn có trong danh sách. */
      container-type: inline-size;
      @container (max-width: 280px) {
        .trigger-label .sub-label { display: none; }
      }

      .trigger-label {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        .main-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--color-text-main);
          min-width: 0;
          max-width: 100%;
          /* Nhãn chính giữ nguyên, phần chú thích phụ bị cắt trước khi thiếu chỗ. */
          flex-shrink: 0;
        }

        .sub-label {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
          flex-shrink: 1;
        }

        .placeholder {
          color: var(--color-text-subtle);
          font-weight: 400;
        }
      }

      .chevron-icon {
        color: var(--color-primary);
        flex-shrink: 0;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
    }

    /* Menu nổi (position: fixed) để không bị card / modal có overflow cắt mất. */
    .zen-select-dropdown {
      position: fixed;
      max-width: min(420px, calc(100vw - 16px));
      max-height: 270px;
      overflow-y: auto;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: 5px;
      z-index: 1050;
      animation: dropdownFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);

      /* Custom zen scrollbar */
      &::-webkit-scrollbar {
        width: 6px;
      }
      &::-webkit-scrollbar-track {
        background: transparent;
      }
      &::-webkit-scrollbar-thumb {
        background: var(--color-border-strong);
        border-radius: 9999px;
      }
      &::-webkit-scrollbar-thumb:hover {
        background: rgba(20, 70, 52, 0.28);
      }
    }

    .empty-options {
      padding: 12px 14px;
      text-align: center;
      font-size: var(--text-sm);
      color: var(--color-text-subtle);
    }

    .zen-select-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: var(--text-sm);
      color: var(--color-text-main);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(.is-disabled) {
        background: var(--color-surface-hover);
        color: var(--color-primary);
      }

      &.is-selected {
        background: var(--color-surface-hover);
        color: var(--color-primary);
        font-weight: 600;

        .option-label {
          color: var(--color-primary);
        }

        .check-icon {
          color: var(--color-primary);
          flex-shrink: 0;
        }
      }

      &.is-disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }

      .option-content {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
        flex: 1;

        .option-label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .option-sublabel {
          font-size: var(--text-xs);
          color: var(--color-text-muted);
        }
      }
    }

    @keyframes dropdownFadeIn {
      from {
        opacity: 0;
        transform: translateY(-5px) scale(0.99);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenSelectComponent implements ControlValueAccessor, OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);

  placeholder = 'Chọn...';
  name = '';
  valueKey = 'value';
  labelKey = 'label';
  sublabelKey?: string;

  private readonly rawOptions = signal<any[]>([]);
  set options(opts: any[]) {
    this.rawOptions.set(opts || []);
  }
  get options(): any[] {
    return this.rawOptions();
  }

  private readonly disabledState = signal<boolean>(false);
  set disabled(val: boolean) {
    this.disabledState.set(val);
  }
  get disabled(): boolean {
    return this.disabledState();
  }

  readonly valueChange = new EventEmitter<any>();

  private readonly internalValue = signal<any>(null);
  private readonly formDisabled = signal<boolean>(false);

  protected readonly isOpen = signal<boolean>(false);

  protected readonly isDisabled = computed(() => this.disabledState() || this.formDisabled());

  protected readonly normalizedOptions = computed<ZenSelectOption[]>(() => {
    const raw = this.rawOptions();
    if (!Array.isArray(raw)) return [];

    const vKey = this.valueKey;
    const lKey = this.labelKey;
    const sKey = this.sublabelKey;

    return raw.map(item => {
      if (item === null || item === undefined) {
        return { value: item, label: '' };
      }
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        return { value: item, label: String(item) };
      }
      const val = item[vKey] !== undefined ? item[vKey] : item.value;
      const lbl = item[lKey] !== undefined ? item[lKey] : item.label || String(val);
      const sub = sKey && item[sKey] ? String(item[sKey]) : item.sublabel;
      return {
        value: val,
        label: lbl,
        sublabel: sub,
        disabled: !!item.disabled
      };
    });
  });

  protected readonly selectedOption = computed(() => {
    const current = this.internalValue();
    const opts = this.normalizedOptions();
    if (current === null || current === undefined) {
      return null;
    }
    const matched = opts.find(o => o.value === current);
    if (matched) {
      return matched;
    }
    if (current === '') {
      return null;
    }
    return null;
  });

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  onEscape(): void {
    this.close();
  }

  /** Vị trí menu tính theo ô chọn trên viewport; tự lật lên trên khi phía dưới không đủ chỗ. */
  protected readonly dropdownPos = signal<{
    top: number | null; bottom: number | null; left: number; width: number; maxHeight: number; above: boolean;
  } | null>(null);

  private readonly onAnyScroll = (event: Event): void => {
    // Cuộn bên trong chính menu thì giữ nguyên; cuộn trang / vùng chứa thì định vị lại.
    if (event.target instanceof Node && this.elementRef.nativeElement.contains(event.target)) return;
    this.updatePosition();
  };

  toggleOpen(): void {
    if (this.isDisabled()) return;
    if (this.isOpen()) {
      this.close();
      return;
    }
    this.updatePosition();
    this.isOpen.set(true);
    document.addEventListener('scroll', this.onAnyScroll, true);
    this.onTouched();
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    document.removeEventListener('scroll', this.onAnyScroll, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('scroll', this.onAnyScroll, true);
  }

  private updatePosition(): void {
    const trigger = (this.elementRef.nativeElement as HTMLElement).querySelector('.zen-select-trigger');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 5;
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;
    const above = spaceBelow < 200 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(270, above ? spaceAbove : spaceBelow));
    const width = rect.width;
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - Math.max(width, 160) - margin));
    this.dropdownPos.set({
      top: above ? null : rect.bottom + gap,
      bottom: above ? window.innerHeight - rect.top + gap : null,
      left,
      width,
      maxHeight,
      above
    });
  }

  selectOption(opt: ZenSelectOption): void {
    if (opt.disabled || this.isDisabled()) return;
    this.internalValue.set(opt.value);
    this.onChange(opt.value);
    this.valueChange.emit(opt.value);
    this.close();
  }

  isSelected(val: any): boolean {
    return this.internalValue() === val;
  }

  /* ControlValueAccessor methods */
  writeValue(val: any): void {
    this.internalValue.set(val);
    this.cdr.detectChanges();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }
}
