import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { PosApi, OrderListResult } from '@yoga/mod-membership/data-access';
import { OrderListComponent } from './order-list.component';

describe('OrderListComponent', () => {
  const empty: OrderListResult = { content: [], totalElements: 0, totalPages: 0, number: 0 };
  let api: { listOrders: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    api = { listOrders: vi.fn().mockReturnValue(of(empty)) };
    TestBed.configureTestingModule({
      imports: [OrderListComponent],
      providers: [provideExperimentalZonelessChangeDetection(),
        { provide: PosApi, useValue: api },
        { provide: BranchApi, useValue: { getAll: () => of([{ id: 'home' }, { id: 'assigned' }, { id: 'other' }]) } },
        { provide: AuthService, useValue: { isSuperAdmin: () => false, userHomeBranchId: () => 'home', branchIds: () => ['assigned'] } }]
    });
  });
  it('shows only permitted branch choices and an empty state', () => {
    const fixture = TestBed.createComponent(OrderListComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.branches().map(b => b.id)).toEqual(['home', 'assigned']);
    expect(fixture.nativeElement.textContent).toContain('Không có đơn hàng phù hợp.');
  });
  it('sends filters with the requested page', () => {
    const component = TestBed.createComponent(OrderListComponent).componentInstance;
    component.search = ' ORD-1 ';
    component.branchId = 'assigned';
    component.status = 'PAID';
    component.load(2);
    expect(api.listOrders).toHaveBeenCalledWith({ page: 2, size: 20, search: 'ORD-1', branchId: 'assigned', status: 'PAID' });
  });
  it('cancels older requests and clears stale results on failure', () => {
    const component = TestBed.createComponent(OrderListComponent).componentInstance;
    const pending = new Subject<OrderListResult>();
    api.listOrders.mockReturnValueOnce(pending).mockReturnValueOnce(of(empty));
    component.load();
    component.load();
    pending.next({ ...empty, totalElements: 99 });
    expect(component.result()?.totalElements).toBe(0);
    api.listOrders.mockReturnValue(throwError(() => new Error('Failed')));
    component.load();
    expect(component.result()).toBeNull();
    expect(component.error()).toContain('Không thể tải');
    expect(component.loading()).toBe(false);
  });
});
