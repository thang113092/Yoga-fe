import { Injectable, inject } from '@angular/core';
import { ActiveToast, IndividualConfig, ToastrService } from 'ngx-toastr';

export type ZenToastOptions = Partial<IndividualConfig>;

@Injectable({
  providedIn: 'root'
})
export class ZenToastService {
  private readonly toastr: ToastrService | null;

  constructor() {
    let resolvedToastr: ToastrService | null = null;
    try {
      resolvedToastr = inject(ToastrService, { optional: true });
    } catch {
      resolvedToastr = null;
    }
    this.toastr = resolvedToastr;
  }

  /**
   * Hiển thị thông báo thành công (Success Toast) ở góc phải trên màn hình
   */
  success(
    message: string,
    title: string = 'Thành công',
    override?: ZenToastOptions
  ): ActiveToast<any> | null {
    if (!this.toastr) {
      return null;
    }
    return this.toastr.success(message, title, {
      positionClass: 'toast-top-right',
      timeOut: 3500,
      closeButton: true,
      progressBar: true,
      ...override
    });
  }

  /**
   * Hiển thị thông báo lỗi (Error Toast) ở góc phải trên màn hình
   */
  error(
    message: string,
    title: string = 'Đã có lỗi xảy ra',
    override?: ZenToastOptions
  ): ActiveToast<any> | null {
    if (!this.toastr) {
      return null;
    }
    return this.toastr.error(message, title, {
      positionClass: 'toast-top-right',
      timeOut: 4500,
      closeButton: true,
      progressBar: true,
      ...override
    });
  }

  /**
   * Hiển thị thông báo cảnh báo (Warning Toast) ở góc phải trên màn hình
   */
  warning(
    message: string,
    title: string = 'Lưu ý',
    override?: ZenToastOptions
  ): ActiveToast<any> | null {
    if (!this.toastr) {
      return null;
    }
    return this.toastr.warning(message, title, {
      positionClass: 'toast-top-right',
      timeOut: 4000,
      closeButton: true,
      progressBar: true,
      ...override
    });
  }

  /**
   * Hiển thị thông báo thông tin (Info Toast) ở góc phải trên màn hình
   */
  info(
    message: string,
    title: string = 'Thông báo',
    override?: ZenToastOptions
  ): ActiveToast<any> | null {
    if (!this.toastr) {
      return null;
    }
    return this.toastr.info(message, title, {
      positionClass: 'toast-top-right',
      timeOut: 3500,
      closeButton: true,
      progressBar: true,
      ...override
    });
  }

  /**
   * Đóng một thông báo cụ thể hoặc tất cả thông báo
   */
  clear(toastId?: number): void {
    this.toastr?.clear(toastId);
  }
}
