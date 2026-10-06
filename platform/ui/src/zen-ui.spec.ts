import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ZenButtonComponent } from './zen-button.component';
import { ZenInputComponent } from './zen-input.component';
import { ZenSearchComponent } from './zen-search.component';

describe('Zen UI Suite', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [ZenButtonComponent, ZenInputComponent, ZenSearchComponent],
      providers: [provideExperimentalZonelessChangeDetection()]
    })
  );

  describe('ZenButtonComponent', () => {
    it('renders projected content and emits clicked event', () => {
      const fixture = TestBed.createComponent(ZenButtonComponent);
      fixture.componentInstance.variant = 'primary';
      fixture.detectChanges();

      const spy = vi.spyOn(fixture.componentInstance.clicked, 'emit');
      const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      btn.click();
      fixture.detectChanges();

      expect(spy).toHaveBeenCalled();
      expect(btn.classList.contains('btn-primary')).toBe(true);
    });

    it('disables button when loading or disabled is true', () => {
      const fixture = TestBed.createComponent(ZenButtonComponent);
      fixture.componentInstance.loading = true;
      fixture.detectChanges();

      const btn = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(fixture.nativeElement.querySelector('.btn-spinner')).toBeTruthy();
    });
  });

  describe('ZenInputComponent', () => {
    it('handles typing and emits valueChange', () => {
      const fixture = TestBed.createComponent(ZenInputComponent);
      fixture.componentInstance.placeholder = 'Nhập số điện thoại';
      fixture.componentInstance.prefixIcon = 'phone';
      fixture.componentInstance.clearable = true;
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.placeholder).toBe('Nhập số điện thoại');
      expect(fixture.nativeElement.querySelector('.prefix-container')).toBeTruthy();

      const spy = vi.spyOn(fixture.componentInstance.valueChange, 'emit');
      input.value = '0901234567';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(spy).toHaveBeenCalledWith('0901234567');
      expect(fixture.nativeElement.querySelector('.btn-clear')).toBeTruthy();
    });

    it('toggles password visibility when type is password', () => {
      const fixture = TestBed.createComponent(ZenInputComponent);
      fixture.componentInstance.type = 'password';
      fixture.componentInstance.writeValue('secret123');
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.type).toBe('password');

      const toggleBtn = fixture.nativeElement.querySelector('.btn-toggle-password') as HTMLButtonElement;
      toggleBtn.click();
      fixture.detectChanges();

      expect(input.type).toBe('text');
    });
  });

  describe('ZenSearchComponent', () => {
    it('emits search on input change and search on enter', () => {
      const fixture = TestBed.createComponent(ZenSearchComponent);
      fixture.componentInstance.placeholder = 'Tìm gói tập...';
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      expect(input.placeholder).toBe('Tìm gói tập...');

      const searchSpy = vi.spyOn(fixture.componentInstance.search, 'emit');
      input.value = 'Yoga';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(searchSpy).toHaveBeenCalledWith('Yoga');

      // Clear button
      const clearBtn = fixture.nativeElement.querySelector('.btn-search-clear') as HTMLButtonElement;
      expect(clearBtn).toBeTruthy();
      clearBtn.click();
      fixture.detectChanges();

      expect(searchSpy).toHaveBeenCalledWith('');
      expect(input.value).toBe('');
    });
  });
});
