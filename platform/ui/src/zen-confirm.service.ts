import { Injectable, computed, signal } from '@angular/core';
import {
  ZenConfirmCancelOptions,
  ZenConfirmDeleteOptions,
  ZenConfirmOptions,
  ZenConfirmState
} from './zen-confirm.types';

@Injectable({
  providedIn: 'root'
})
export class ZenConfirmService {
  private readonly _state = signal<ZenConfirmState | null>(null);

  /**
   * Trạng thái hộp thoại hiện tại (null nếu đang đóng)
   */
  readonly state = this._state.asReadonly();

  /**
   * Hộp thoại có đang mở hay không
   */
  readonly isOpen = computed(() => this._state() !== null);

  /**
   * Mở hộp thoại xác nhận tổng quát
   */
  confirm(options: ZenConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this._state.set({
        options: {
          title: options.title ?? 'Xác Nhận Thao Tác',
          message: options.message,
          itemName: options.itemName,
          details: options.details,
          confirmText: options.confirmText ?? 'Xác Nhận',
          cancelText: options.cancelText ?? 'Quay Lại',
          type: options.type ?? 'warning'
        },
        resolve
      });
    });
  }

  /**
   * Popup dùng chung: Xác nhận xóa dữ liệu
   */
  confirmDelete(options: ZenConfirmDeleteOptions = {}): Promise<boolean> {
    const defaultMsg = options.itemName
      ? `Bạn có chắc chắn muốn xóa "${options.itemName}"? Dữ liệu sau khi xóa sẽ được lưu trữ hoặc loại bỏ hoàn toàn khỏi hệ thống.`
      : 'Bạn có chắc chắn muốn xóa mục này khỏi hệ thống?';

    return this.confirm({
      title: options.title ?? 'Xác Nhận Xóa',
      message: options.message ?? defaultMsg,
      itemName: options.itemName,
      details: options.details,
      confirmText: options.confirmText ?? 'Đồng Ý Xóa',
      cancelText: options.cancelText ?? 'Quay Lại',
      type: 'delete'
    });
  }

  /**
   * Popup dùng chung: Xác nhận hủy (hủy ca học, hủy lịch đặt, hủy giao dịch,...)
   */
  confirmCancel(options: ZenConfirmCancelOptions = {}): Promise<boolean> {
    const defaultMsg = options.itemName
      ? `Bạn có chắc chắn muốn hủy bỏ thao tác cho "${options.itemName}"?`
      : 'Bạn có chắc chắn muốn hủy thao tác này?';

    return this.confirm({
      title: options.title ?? 'Xác Nhận Hủy Thao Tác',
      message: options.message ?? defaultMsg,
      itemName: options.itemName,
      details: options.details,
      confirmText: options.confirmText ?? 'Xác Nhận Hủy',
      cancelText: options.cancelText ?? 'Quay Lại',
      type: 'cancel'
    });
  }

  /**
   * Người dùng nhấn nút đồng ý / xác nhận
   */
  accept(): void {
    const current = this._state();
    if (current) {
      this._state.set(null);
      current.resolve(true);
    }
  }

  /**
   * Người dùng nhấn nút quay lại / đóng popup
   */
  reject(): void {
    const current = this._state();
    if (current) {
      this._state.set(null);
      current.resolve(false);
    }
  }
}
