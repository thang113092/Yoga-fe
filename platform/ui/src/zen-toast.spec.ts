import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { ZenToastService } from './zen-toast.service';

describe('ZenToastService', () => {
  let service: ZenToastService;
  let mockToastr: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockToastr = {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      clear: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideExperimentalZonelessChangeDetection(),
        ZenToastService,
        { provide: ToastrService, useValue: mockToastr }
      ]
    });

    service = TestBed.inject(ZenToastService);
  });

  it('triggers toastr.success with toast-top-right and defaults', () => {
    service.success('Đã lưu thành công');
    expect(mockToastr.success).toHaveBeenCalledWith(
      'Đã lưu thành công',
      'Thành công',
      expect.objectContaining({
        positionClass: 'toast-top-right',
        closeButton: true,
        progressBar: true
      })
    );
  });

  it('triggers toastr.error with custom title and error duration', () => {
    service.error('Có lỗi xảy ra', 'Thất bại');
    expect(mockToastr.error).toHaveBeenCalledWith(
      'Có lỗi xảy ra',
      'Thất bại',
      expect.objectContaining({
        positionClass: 'toast-top-right',
        timeOut: 4500
      })
    );
  });

  it('triggers toastr.warning with warning title', () => {
    service.warning('Vui lòng kiểm tra lại');
    expect(mockToastr.warning).toHaveBeenCalledWith(
      'Vui lòng kiểm tra lại',
      'Lưu ý',
      expect.objectContaining({
        positionClass: 'toast-top-right'
      })
    );
  });

  it('triggers toastr.info and clear', () => {
    service.info('Ca học bắt đầu sau 15 phút');
    expect(mockToastr.info).toHaveBeenCalledWith(
      'Ca học bắt đầu sau 15 phút',
      'Thông báo',
      expect.objectContaining({
        positionClass: 'toast-top-right'
      })
    );

    service.clear(123);
    expect(mockToastr.clear).toHaveBeenCalledWith(123);
  });
});
