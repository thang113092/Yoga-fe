import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ZenConfirmService } from './zen-confirm.service';
import { ZenConfirmModalComponent } from './zen-confirm-modal.component';

describe('ZenConfirm Suite', () => {
  let service: ZenConfirmService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ZenConfirmModalComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        ZenConfirmService
      ]
    });
    service = TestBed.inject(ZenConfirmService);
  });

  describe('ZenConfirmService', () => {
    it('is initially closed', () => {
      expect(service.isOpen()).toBe(false);
      expect(service.state()).toBeNull();
    });

    it('opens confirm dialog and resolves true on accept', async () => {
      const confirmPromise = service.confirm({
        title: 'Xác Nhận',
        message: 'Bạn có muốn tiếp tục?'
      });

      expect(service.isOpen()).toBe(true);
      expect(service.state()?.options.title).toBe('Xác Nhận');
      expect(service.state()?.options.message).toBe('Bạn có muốn tiếp tục?');

      service.accept();
      const result = await confirmPromise;
      expect(result).toBe(true);
      expect(service.isOpen()).toBe(false);
    });

    it('resolves false on reject', async () => {
      const confirmPromise = service.confirm({
        title: 'Xác Nhận',
        message: 'Kiểm tra hủy'
      });

      expect(service.isOpen()).toBe(true);
      service.reject();
      const result = await confirmPromise;
      expect(result).toBe(false);
      expect(service.isOpen()).toBe(false);
    });

    it('sets proper presets for confirmDelete', async () => {
      const promise = service.confirmDelete({
        itemName: 'Gói Thẻ VIP 6 Tháng'
      });

      expect(service.isOpen()).toBe(true);
      const state = service.state();
      expect(state?.options.type).toBe('delete');
      expect(state?.options.title).toBe('Xác Nhận Xóa');
      expect(state?.options.confirmText).toBe('Đồng Ý Xóa');
      expect(state?.options.itemName).toBe('Gói Thẻ VIP 6 Tháng');

      service.accept();
      expect(await promise).toBe(true);
    });

    it('sets proper presets for confirmCancel', async () => {
      const promise = service.confirmCancel({
        itemName: 'Ca Học Vinyasa 18:00'
      });

      expect(service.isOpen()).toBe(true);
      const state = service.state();
      expect(state?.options.type).toBe('cancel');
      expect(state?.options.title).toBe('Xác Nhận Hủy Thao Tác');
      expect(state?.options.confirmText).toBe('Xác Nhận Hủy');
      expect(state?.options.itemName).toBe('Ca Học Vinyasa 18:00');

      service.reject();
      expect(await promise).toBe(false);
    });
  });

  describe('ZenConfirmModalComponent', () => {
    it('renders dialog elements when triggered from service', async () => {
      const fixture = TestBed.createComponent(ZenConfirmModalComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.zen-modal-backdrop')).toBeFalsy();

      service.confirmDelete({
        itemName: 'Thẻ Tập Thử Nghiệm',
        details: 'Không thể khôi phục sau khi xóa.'
      });
      fixture.detectChanges();

      const backdrop = fixture.nativeElement.querySelector('.zen-modal-backdrop');
      expect(backdrop).toBeTruthy();

      const title = fixture.nativeElement.querySelector('.zen-confirm-title');
      expect(title.textContent).toContain('Xác Nhận Xóa');

      const itemBadge = fixture.nativeElement.querySelector('.zen-confirm-item-badge');
      expect(itemBadge.textContent).toContain('Thẻ Tập Thử Nghiệm');

      const details = fixture.nativeElement.querySelector('.zen-confirm-details');
      expect(details.textContent).toContain('Không thể khôi phục sau khi xóa.');

      const confirmBtn = fixture.nativeElement.querySelector('.btn-zen-confirm') as HTMLButtonElement;
      expect(confirmBtn.textContent).toContain('Đồng Ý Xóa');

      // Click confirm button
      confirmBtn.click();
      fixture.detectChanges();

      expect(service.isOpen()).toBe(false);
      expect(fixture.nativeElement.querySelector('.zen-modal-backdrop')).toBeFalsy();
    });

    it('supports reject on cancel button click', async () => {
      const fixture = TestBed.createComponent(ZenConfirmModalComponent);
      fixture.detectChanges();

      service.confirmCancel({
        itemName: 'Lịch Đặt Phòng 1'
      });
      fixture.detectChanges();

      const cancelBtn = fixture.nativeElement.querySelector('.btn-zen-cancel') as HTMLButtonElement;
      cancelBtn.click();
      fixture.detectChanges();

      expect(service.isOpen()).toBe(false);
    });
  });
});
