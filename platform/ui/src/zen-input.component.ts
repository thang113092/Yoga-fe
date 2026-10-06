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
  viewChild,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

export type ZenInputType = 'text' | 'tel' | 'email' | 'password' | 'number' | 'date';
export type ZenInputIcon = 'phone' | 'mail' | 'user' | 'lock' | 'calendar' | 'search' | 'money';

@Component({
  selector: 'zen-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  inputs: [
    'id',
    'name',
    'type',
    'placeholder',
    'disabled',
    'readonly',
    'required',
    'autocomplete',
    'prefixIcon',
    'suffixText',
    'clearable'
  ],
  outputs: ['valueChange', 'inputChange', 'enterPressed'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ZenInputComponent),
      multi: true
    }
  ],
  template: `
    <div
      class="zen-input-wrapper"
      [class.is-disabled]="isDisabled()"
      [class.is-focused]="isFocused()"
      [class.has-prefix]="!!prefixIcon"
      [class.has-suffix]="!!suffixText || isPasswordType() || showClearButton()"
    >
      @if (prefixIcon) {
        <div class="prefix-container" aria-hidden="true">
          @switch (prefixIcon) {
            @case ('phone') {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            }
            @case ('mail') {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            }
            @case ('user') {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            }
            @case ('lock') {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            }
            @case ('calendar') {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }
            @case ('search') {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            }
            @case ('money') {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            }
          }
        </div>
      }

      <input
        #inputElem
        [id]="id"
        [name]="name"
        [type]="actualInputType()"
        [placeholder]="placeholder"
        [disabled]="isDisabled()"
        [readonly]="readonly"
        [required]="required"
        [autocomplete]="autocomplete"
        [value]="value()"
        [attr.value]="value()"
        (input)="onInputChange($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (keydown.enter)="enterPressed.emit(value())"
        class="zen-native-input"
      />

      <div class="suffix-container">
        @if (showClearButton()) {
          <button
            type="button"
            class="btn-clear"
            (click)="onClear($event)"
            title="Xóa nhanh"
            aria-label="Xóa nội dung"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        }

        @if (isPasswordType()) {
          <button
            type="button"
            class="btn-toggle-password"
            (click)="togglePasswordVisibility()"
            [attr.aria-label]="isPasswordVisible() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
            [title]="isPasswordVisible() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
          >
            @if (isPasswordVisible()) {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            } @else {
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            }
          </button>
        }

        @if (suffixText) {
          <span class="suffix-text">{{ suffixText }}</span>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
      width: 100%;
      vertical-align: middle;
      font-family: var(--font-sans);
    }

    .zen-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      min-height: 42px;
      background: #ffffff;
      border: 1px solid rgba(20, 70, 52, 0.18);
      border-radius: 10px;
      box-shadow: 0 1px 3px rgba(20, 70, 52, 0.04);
      transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;

      &:hover:not(.is-disabled):not(.is-focused) {
        border-color: #0f766e;
        box-shadow: 0 2px 6px rgba(15, 118, 110, 0.08);
      }

      &.is-focused {
        border-color: #0f766e;
        box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
      }

      &.is-disabled {
        background: #f1f4f3;
        border-color: rgba(20, 70, 52, 0.08);
        cursor: not-allowed;
        opacity: 0.7;

        .zen-native-input {
          color: #8da499;
          cursor: not-allowed;
        }
      }

      .prefix-container {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding-left: 14px;
        padding-right: 0;
        color: #0f766e;
        flex-shrink: 0;
      }

      &.has-prefix .zen-native-input {
        padding-left: 10px;
      }

      &.has-suffix .zen-native-input {
        padding-right: 6px;
      }

      .zen-native-input {
        flex: 1;
        min-width: 0;
        height: 100%;
        min-height: 40px;
        padding: 8px 14px;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        font-family: var(--font-sans);
        font-size: 14px;
        line-height: 1.5;
        color: #144634;

        &:focus,
        &:focus-visible,
        &:hover {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }

        &::placeholder {
          color: #8da499;
          font-weight: 400;
        }
      }

      .suffix-container {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-right: 12px;
        flex-shrink: 0;

        &:empty {
          display: none;
        }

        .suffix-text {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #688377;
        }

        .btn-clear,
        .btn-toggle-password {
          background: transparent;
          border: none;
          color: #8da499;
          padding: 3px;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;

          &:hover {
            color: #0f766e;
            background: #f0fdfa;
          }
        }
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenInputComponent implements ControlValueAccessor {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly inputElem = viewChild<ElementRef<HTMLInputElement>>('inputElem');

  id = '';
  name = '';
  type: ZenInputType = 'text';
  placeholder = '';
  disabled = false;
  readonly = false;
  required = false;
  autocomplete = 'off';
  prefixIcon?: ZenInputIcon;
  suffixText?: string;
  clearable = false;

  readonly valueChange = new EventEmitter<any>();
  readonly inputChange = new EventEmitter<any>();
  readonly enterPressed = new EventEmitter<any>();

  protected readonly value = signal<any>('');
  private readonly formDisabled = signal<boolean>(false);
  protected readonly isFocused = signal<boolean>(false);
  protected readonly isPasswordVisible = signal<boolean>(false);

  protected readonly isDisabled = computed(() => this.disabled || this.formDisabled());

  protected readonly isPasswordType = computed(() => this.type === 'password');

  protected readonly actualInputType = computed(() => {
    if (this.type === 'password') {
      return this.isPasswordVisible() ? 'text' : 'password';
    }
    return this.type;
  });

  protected readonly showClearButton = computed(() => {
    return this.clearable && !this.isDisabled() && !!this.value();
  });

  private onChange: (val: any) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const v = this.value();
      const el = this.inputElem();
      if (el) {
        el.nativeElement.value = v ?? '';
      }
    });
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update(v => !v);
  }

  onInputChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
    this.valueChange.emit(val);
    this.inputChange.emit(val);
  }

  onClear(event: MouseEvent): void {
    event.stopPropagation();
    this.value.set('');
    this.onChange('');
    this.valueChange.emit('');
    this.inputChange.emit('');
    if (this.inputElem()) {
      this.inputElem()!.nativeElement.focus();
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
    const formattedVal = val ?? '';
    this.value.set(formattedVal);
    if (this.inputElem()) {
      this.inputElem()!.nativeElement.value = formattedVal;
    }
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
