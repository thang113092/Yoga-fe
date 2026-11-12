import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { MembershipPlan, SelfCheckoutApi } from '@yoga/mod-membership/data-access';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { PlanPurchaseComponent } from './plan-purchase.component';

const plan = { id: 'plan-1', code: 'M1', name: 'Thẻ 1 tháng', price: 900000, planType: 'TIME_BASED', durationDays: 30,
  isAllBranches: false, isActive: true } as MembershipPlan;

describe('Student plan purchase dialog', () => {
  const api = { getQuote: vi.fn(), createOrder: vi.fn() };

  beforeEach(() => {
    Object.values(api).forEach(fn => fn.mockReset());
    api.getQuote.mockReturnValue(of({ currentMembership: null, credit: 0, totalAmount: 900000, issue: null }));
    api.createOrder.mockReturnValue(of({ orderId: 'order-1', totalAmount: 900000 }));
    TestBed.configureTestingModule({
      imports: [PlanPurchaseComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        { provide: SelfCheckoutApi, useValue: api },
        { provide: BranchApi, useValue: { getAll: () => of([
          { id: 'b-closed', name: 'Đã đóng', isActive: false }, { id: 'b-1', name: 'Cơ sở 1', isActive: true }, { id: 'b-home', name: 'Nhà', isActive: true }
        ]) } },
        { provide: AuthService, useValue: { userHomeBranchId: () => 'b-home' } }
      ]
    });
  });

  async function open(p: MembershipPlan = plan) {
    const fixture = TestBed.createComponent(PlanPurchaseComponent);
    // Vitest compiles components in JIT mode, where signal inputs are not registered: stand in a plain signal.
    Object.assign(fixture.componentInstance, { plan: signal(p) });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function button(fixture: { nativeElement: HTMLElement }, label: string): HTMLButtonElement {
    return [...fixture.nativeElement.querySelectorAll('button')].find(b => b.textContent?.includes(label)) as HTMLButtonElement;
  }

  it('asks for the branch of a single-branch plan, defaulting to the home branch', async () => {
    const fixture = await open();
    expect(fixture.nativeElement.querySelector('#purchase-branch')).toBeTruthy();
    expect(api.getQuote).toHaveBeenCalledWith('plan-1', 'b-home');
    expect(fixture.nativeElement.textContent).toContain('900,000');
  });

  it('does not ask for a branch when the plan is valid at every branch', async () => {
    const fixture = await open({ ...plan, isAllBranches: true });
    expect(fixture.nativeElement.querySelector('#purchase-branch')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('tập được tại mọi cơ sở');
    expect(api.getQuote).toHaveBeenCalledWith('plan-1', 'b-home');
  });

  it('creates the order with the quoted amounts and opens the shared checkout page', async () => {
    const fixture = await open();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const closed = vi.fn(); fixture.componentInstance.closed.subscribe(closed);

    button(fixture, 'Tiếp tục thanh toán').click();

    expect(api.createOrder).toHaveBeenCalledWith(
      { branchId: 'b-home', planId: 'plan-1', replacesMembershipId: undefined, expectedCredit: 0, expectedTotal: 900000 }, expect.any(String));
    expect(navigate).toHaveBeenCalledWith(['/membership/checkout', 'order-1']);
    expect(closed).toHaveBeenCalled();
  });

  it('does not let the student continue when the quote reports a problem', async () => {
    api.getQuote.mockReturnValue(of({ currentMembership: null, credit: 0, totalAmount: 900000, issue: 'Học viên có giao dịch đang chờ thanh toán.' }));
    const fixture = await open();
    expect(button(fixture, 'Tiếp tục thanh toán').disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('đang chờ thanh toán');
  });
});
