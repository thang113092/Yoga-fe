import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  computed,
  signal,
  inject,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'zen-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  inputs: ['placeholder', 'disabled', 'clearable', 'debounce', 'size', 'variant'],
  outputs: ['valueChange', 'search', 'clear'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZenSearchComponent),
      multi: true
    }
  ],
  template: `
    <div
      class="zen-search-wrapper"
      [class.is-disabled]="isDisabled()"
      [class.is-focused]="isFocused()"
      [class.size-sm]="size === 'sm'"
      [class.size-md]="size === 'md'"
      [class.size-lg]="size === 'lg'"
      [class.is-pill]="variant === 'pill'"
    >
      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>

      <input
        #searchElem
        type="search"
        [placeholder]="placeholder"
        [disabled]="isDisabled()"
        [value]="value()"
        (input)="onInputChange($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (keydown.enter)="onSearchEnter()"
        (keydown.escape)="onClear()"
        class="zen-search-input"
        aria-label="Tìm kiếm"
      />

      @if (showClearButton()) {
        <button
          type="button"
          class="btn-search-clear"
          (click)="onClear()"
          title="Xóa tìm kiếm"
          aria-label="Xóa nội dung tìm kiếm"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
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

    .zen-search-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      min-height: var(--control-height-md);
      background: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      padding: 0 12px;
      box-shadow: var(--shadow-xs);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;

      &.is-pill {
        border-radius: 9999px;
        padding: 0 14px;
      }

      &:hover:not(.is-disabled):not(.is-focused) {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-xs);
      }

      &.is-focused {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-focus-ring);
      }

      &.is-disabled {
        background: var(--color-surface-variant);
        border-color: rgba(20, 70, 52, 0.08);
        cursor: not-allowed;
        opacity: 0.7;

        .zen-search-input {
          color: var(--color-text-subtle);
          cursor: not-allowed;
        }
      }

      &.size-sm {
        min-height: 36px;
        padding: 0 10px;
        .zen-search-input { font-size: var(--text-sm); }
      }

      &.size-lg {
        min-height: 48px;
        padding: 0 18px;
        .zen-search-input { font-size: 0.9375rem; }
      }

      .search-icon {
        color: var(--color-primary);
        flex-shrink: 0;
        margin-right: 8px;
      }

      .zen-search-input {
        flex: 1;
        min-width: 0;
        height: 100%;
        min-height: var(--control-height-md);
        padding: 6px 0;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        font-family: var(--font-sans);
        font-size: var(--text-base);
        line-height: 1.5;
        color: var(--color-primary);

        &:focus,
        &:focus-visible,
        &:hover {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }

        &::-webkit-search-decoration,
        &::-webkit-search-cancel-button,
        &::-webkit-search-results-button,
        &::-webkit-search-results-decoration {
          display: none;
        }

        &::placeholder {
          color: var(--color-text-subtle);
          font-weight: 400;
        }
      }

      .btn-search-clear {
        background: rgba(20, 70, 52, 0.06);
        border: none;
        color: var(--color-text-muted);
        width: 20px;
        height: 20px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 6px;
        flex-shrink: 0;
        transition: all 0.15s ease;

        &:hover {
          color: var(--color-primary);
          background: var(--color-surface-hover);
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenSearchComponent implements ControlValueAccessor {
  private readonly searchElem = viewChild<ElementRef<HTMLInputElement>>('searchElem');

  placeholder = 'Tìm kiếm...';
  disabled = false;
  clearable = true;
  debounce = 0;
  size: 'sm' | 'md' | 'lg' = 'md';
  variant: 'rounded' | 'pill' = 'rounded';

  readonly valueChange = new EventEmitter<string>();
  readonly search = new EventEmitter<string>();
  readonly clear = new EventEmitter<void>();

  protected readonly value = signal<string>('');
  private readonly formDisabled = signal<boolean>(false);
  protected readonly isFocused = signal<boolean>(false);

  protected readonly isDisabled = computed(() => this.disabled || this.formDisabled());

  protected readonly showClearButton = computed(() => {
    return this.clearable && !this.isDisabled() && !!this.value();
  });

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};
  private debounceTimer: any;

  onInputChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
    this.valueChange.emit(val);

    if (this.debounce > 0) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.search.emit(val);
      }, this.debounce);
    } else {
      this.search.emit(val);
    }
  }

  onSearchEnter(): void {
    this.search.emit(this.value());
  }

  onClear(): void {
    this.value.set('');
    this.onChange('');
    this.valueChange.emit('');
    this.search.emit('');
    this.clear.emit();
    if (this.searchElem()) {
      this.searchElem()!.nativeElement.focus();
    }
  }

  onFocus(): void {
    this.isFocused.set(true);
  }

  onBlur(): void {
    this.isFocused.set(false);
    this.onTouched();
  }

  /* ControlValueAccessor */
  writeValue(val: any): void {
    this.value.set(val ?? '');
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
