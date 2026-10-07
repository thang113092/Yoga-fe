import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ZenSelectComponent, ZenSelectOption } from './zen-select.component';

describe('ZenSelectComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ZenSelectComponent],
      providers: [provideExperimentalZonelessChangeDetection()]
    })
  );

  it('renders placeholder when no option is selected', () => {
    const fixture = TestBed.createComponent(ZenSelectComponent);
    fixture.componentInstance.placeholder = 'Chọn chi nhánh';
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const placeholder = el.querySelector('.placeholder');
    expect(placeholder?.textContent?.trim()).toBe('Chọn chi nhánh');
  });

  it('renders selected option label and sublabel', () => {
    const fixture = TestBed.createComponent(ZenSelectComponent);
    const options: ZenSelectOption[] = [
      { value: 'b1', label: 'Cơ sở Quận 1', sublabel: 'Q1' },
      { value: 'b2', label: 'Cơ sở Bình Thạnh', sublabel: 'BT' }
    ];
    fixture.componentInstance.options = options;
    fixture.componentInstance.writeValue('b1');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const mainLabel = el.querySelector('.main-label');
    const subLabel = el.querySelector('.sub-label');
    expect(mainLabel?.textContent?.trim()).toBe('Cơ sở Quận 1');
    expect(subLabel?.textContent?.trim()).toBe('(Q1)');
  });

  it('toggles dropdown and selects an option', () => {
    const fixture = TestBed.createComponent(ZenSelectComponent);
    const options: ZenSelectOption[] = [
      { value: 'v1', label: 'Lựa chọn 1' },
      { value: 'v2', label: 'Lựa chọn 2' }
    ];
    fixture.componentInstance.options = options;
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.zen-select-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    let dropdown = fixture.nativeElement.querySelector('.zen-select-dropdown');
    expect(dropdown).toBeTruthy();

    const optionItems = fixture.nativeElement.querySelectorAll('.zen-select-option');
    expect(optionItems.length).toBe(2);

    // Select second option
    const spy = vi.spyOn(fixture.componentInstance.valueChange, 'emit');
    (optionItems[1] as HTMLElement).click();
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith('v2');
    expect(fixture.componentInstance.isSelected('v2')).toBe(true);

    dropdown = fixture.nativeElement.querySelector('.zen-select-dropdown');
    expect(dropdown).toBeNull();
  });

  it('does not toggle when disabled', () => {
    const fixture = TestBed.createComponent(ZenSelectComponent);
    fixture.componentInstance.disabled = true;
    fixture.componentInstance.options = [{ value: '1', label: 'Option 1' }];
    fixture.detectChanges();

    const trigger = fixture.nativeElement.querySelector('.zen-select-trigger') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();

    const dropdown = fixture.nativeElement.querySelector('.zen-select-dropdown');
    expect(dropdown).toBeNull();
  });

  it('renders option with empty string value when selected', () => {
    const fixture = TestBed.createComponent(ZenSelectComponent);
    const options: ZenSelectOption[] = [
      { value: '', label: 'Tất cả cơ sở' },
      { value: 'b1', label: 'Cơ sở 1' }
    ];
    fixture.componentInstance.options = options;
    fixture.componentInstance.writeValue('');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const mainLabel = el.querySelector('.main-label');
    expect(mainLabel?.textContent?.trim()).toBe('Tất cả cơ sở');
  });
});
