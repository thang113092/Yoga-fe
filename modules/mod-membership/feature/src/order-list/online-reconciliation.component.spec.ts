import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { of, throwError } from 'rxjs';
import { OnlineReconciliationRow, PosApi } from '@yoga/mod-membership/data-access';
import { OnlineReconciliationComponent } from './online-reconciliation.component';

describe('OnlineReconciliationComponent', () => {
  const row: OnlineReconciliationRow = { id: 'tx', orderId: 'order', orderCode: 'ORD-1', branchId: 'b', branchName: 'Cầu Giấy',
    customerName: 'Người mua', customerPhone: '0901', providerOrderCode: 100001, amount: 3000000, paidAmount: 3000000,
    paidAt: '2026-11-04T03:00:00Z', providerReference: 'FT1', orderStatus: 'PENDING', createdAt: '2026-11-04T02:50:00Z' };
  let list: ReturnType<typeof vi.fn>; let resolve: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    list = vi.fn().mockReturnValue(of([row])); resolve = vi.fn().mockReturnValue(of(undefined));
    TestBed.configureTestingModule({ imports: [OnlineReconciliationComponent], providers: [provideExperimentalZonelessChangeDetection(),
      { provide: PosApi, useValue: { listOnlineReconciliation: list, resolveOnlineReconciliation: resolve } }] });
  });
  it('stays hidden when nothing awaits reconciliation', () => {
    list.mockReturnValue(of([]));
    const fixture = TestBed.createComponent(OnlineReconciliationComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
  it('lists received money and resolves it only with a note', () => {
    const fixture = TestBed.createComponent(OnlineReconciliationComponent); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ORD-1');
    const component = fixture.componentInstance;
    component.startResolve(row); component.resolve(row);
    expect(resolve).not.toHaveBeenCalled();
    component.note = '  Hoàn tiền CK 04/11  '; component.resolve(row);
    expect(resolve).toHaveBeenCalledWith('tx', 'Hoàn tiền CK 04/11');
    expect(component.rows()).toEqual([]);
  });
  it('keeps the row and shows the server reason when resolving fails', () => {
    resolve.mockReturnValue(throwError(() => ({ error: { message: 'Giao dịch không còn chờ đối soát.' } })));
    const component = TestBed.createComponent(OnlineReconciliationComponent).componentInstance; component.ngOnInit();
    component.startResolve(row); component.note = 'x'; component.resolve(row);
    expect(component.error()).toContain('không còn chờ');
    expect(component.busy()).toBe(false);
  });
});
