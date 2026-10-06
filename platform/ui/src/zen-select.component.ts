import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  computed,
  signal,
  inject
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
    '(keydown.escape)': 'onEscape()'
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
        <div class="zen-select-dropdown" role="listbox" (click)="$event.stopPropagation()">
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
          background: #f1f4f3;
          border-color: rgba(20, 70, 52, 0.08);
          color: #71887e;
          cursor: not-allowed;
          box-shadow: none;
        }
      }

      &.is-open {
        .zen-select-trigger {
          border-color: #0f766e;
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14), 0 2px 6px rgba(20, 70, 52, 0.06);
          background: #ffffff;

          .chevron-icon {
            transform: rotate(180deg);
            color: #0f766e;
          }
        }
      }
    }

    .zen-select-trigger {
      width: 100%;
      min-height: 40px;
      padding: 8px 14px;
      background: #ffffff;
      border: 1px solid rgba(20, 70, 52, 0.16);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: #144634;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(20, 70, 52, 0.04);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover:not(:disabled) {
        border-color: #0f766e;
        background: #fafcfb;
        box-shadow: 0 2px 6px rgba(15, 118, 110, 0.08);
      }

      &:focus-visible {
        outline: none;
        border-color: #0f766e;
        box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.16);
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
          color: #144634;
          min-width: 0;
          flex-shrink: 1;
        }

        .sub-label {
          font-size: 0.75rem;
          color: #688377;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
          flex-shrink: 1;
        }

        .placeholder {
          color: #8da499;
          font-weight: 400;
        }
      }

      .chevron-icon {
        color: #0f766e;
        flex-shrink: 0;
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
    }

    .zen-select-dropdown {
      position: absolute;
      top: calc(100% + 5px);
      left: 0;
      min-width: 100%;
      max-height: 270px;
      overflow-y: auto;
      background: #ffffff;
      border: 1px solid rgba(20, 70, 52, 0.12);
      border-radius: 12px;
      box-shadow: 0 12px 30px -4px rgba(20, 70, 52, 0.14), 0 4px 12px rgba(0, 0, 0, 0.04);
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
        background: rgba(20, 70, 52, 0.16);
        border-radius: 9999px;
      }
      &::-webkit-scrollbar-thumb:hover {
        background: rgba(20, 70, 52, 0.28);
      }
    }

    .empty-options {
      padding: 12px 14px;
      text-align: center;
      font-size: 0.8125rem;
      color: #8da499;
    }

    .zen-select-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 0.84rem;
      color: #2c3e35;
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(.is-disabled) {
        background: #f0fdf9;
        color: #0f766e;
      }

      &.is-selected {
        background: #e6f4ea;
        color: #144634;
        font-weight: 600;

        .option-label {
          color: #144634;
        }

        .check-icon {
          color: #0f766e;
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
          font-size: 0.72rem;
          color: #688377;
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
export class ZenSelectComponent implements ControlValueAccessor {
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
    if (current === null || current === undefined || current === '') {
      return null;
    }
    return opts.find(o => o.value === current) || null;
  });

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }

  onEscape(): void {
    this.isOpen.set(false);
  }

  toggleOpen(): void {
    if (this.isDisabled()) return;
    this.isOpen.update(open => !open);
    if (this.isOpen()) {
      this.onTouched();
    }
  }

  selectOption(opt: ZenSelectOption): void {
    if (opt.disabled || this.isDisabled()) return;
    this.internalValue.set(opt.value);
    this.onChange(opt.value);
    this.valueChange.emit(opt.value);
    this.isOpen.set(false);
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
