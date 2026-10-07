import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService, UserApi, UserResponse } from '@yoga/platform/auth';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { MembershipApi, PosApi } from '@yoga/mod-membership/data-access';
import { PosCheckoutComponent } from './pos-checkout.component';

describe('POS single membership checkout', () => {
  const student = { id: 'customer-real', fullName: 'Người mua', phone: '0901234567', email: 'mua@test.com' } as UserResponse;
  const plan = { id: 'plan', name: 'Gói mới', price: 3000000, isActive: true, totalSessions: 30, durationDays: 90 };
  const membership = { id: 'old', membershipCode: 'MB-old', planId: 'old-plan', status: 'ACTIVE', remainingSessions: 8, totalSessions: 20, purchasedPrice: 2000000 };
  let createOrder: ReturnType<typeof vi.fn>; let processPayment: ReturnType<typeof vi.fn>;
  let getQuote: ReturnType<typeof vi.fn>; let getMemberships: ReturnType<typeof vi.fn>; let cancelOrder: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    createOrder = vi.fn().mockReturnValue(of({ orderId: 'order', membershipCode: 'MB-real', totalAmount: 3000000 }));
    processPayment = vi.fn().mockReturnValue(of({ orderId: 'order', paymentStatus: 'SUCCESS' }));
    getQuote = vi.fn().mockReturnValue(of({ currentMembership: null, credit: 0, totalAmount: 3000000, issue: null }));
    getMemberships = vi.fn().mockReturnValue(of([])); cancelOrder = vi.fn().mockReturnValue(of(undefined));
    TestBed.configureTestingModule({ imports: [PosCheckoutComponent], providers: [provideExperimentalZonelessChangeDetection(), provideRouter([]),
      { provide: AuthService, useValue: { currentUserId: () => 'cashier', isSuperAdmin: () => false, isBranchManager: () => false, branchIds: () => ['branch'] } },
      { provide: UserApi, useValue: { searchStudents: vi.fn().mockReturnValue(of([student])) } },
      { provide: BranchApi, useValue: { getAll: () => of([{ id: 'branch', name: 'Cơ sở', isActive: true }]) } },
      { provide: MembershipApi, useValue: { getActivePlans: () => of([plan]), getStudentMemberships: getMemberships } },
      { provide: PosApi, useValue: { createOrder, processPayment, getCheckoutQuote: getQuote, cancelPendingOrder: cancelOrder } }
    ] });
  });
  function page(select = true) {
    const fixture = TestBed.createComponent(PosCheckoutComponent); fixture.detectChanges();
    if (select) fixture.componentInstance.selectStudentFromSearch(student);
    return fixture;
  }
  it('requires a selected student and a server quote', () => {
    const component = page(false).componentInstance; component.handleCheckout(); expect(createOrder).not.toHaveBeenCalled();
  });
  it('removes editable identity fields and shows selected student information', () => {
    const fixture = page(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#pos-phone')).toBeNull();
    expect(fixture.nativeElement.querySelector('#pos-email')).toBeNull();
    expect(fixture.nativeElement.querySelector('#pos-name')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(student.fullName);
  });
  it('uses the resolved customer, cashier and confirmed quote', () => {
    const component = page().componentInstance; component.handleCheckout();
    expect(createOrder.mock.calls[0][0]).toMatchObject({ studentId: student.id, cashierId: 'cashier', expectedCredit: 0, expectedTotal: 3000000 });
    expect(component['successReceipt']()).not.toBeNull();
  });
  it('submits the old card and credit for an exchange', () => {
    getQuote.mockReturnValue(of({ currentMembership: membership, credit: 800000, totalAmount: 2200000, issue: null }));
    const fixture = page(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('MB-old');
    expect(fixture.nativeElement.textContent).toContain('Xác nhận đổi thẻ');
    fixture.componentInstance.handleCheckout();
    expect(createOrder.mock.calls[0][0]).toMatchObject({ replacesMembershipId: 'old', expectedCredit: 800000, expectedTotal: 2200000 });
  });
  it('blocks checkout while membership data is loading or failed', () => {
    const quote = new Subject(); getQuote.mockReturnValue(quote);
    const component = page().componentInstance; component.handleCheckout(); expect(createOrder).not.toHaveBeenCalled();
    quote.error({ status: 500 }); component.handleCheckout(); expect(createOrder).not.toHaveBeenCalled();
  });
  it('keeps loading membership information when the quote fails', () => {
    const memberships = new Subject(); getMemberships.mockReturnValue(memberships);
    getQuote.mockReturnValue(throwError(() => ({ status: 503, error: { message: 'Chưa hoàn tất cập nhật hệ thống.' } })));
    const component = page().componentInstance;
    expect(memberships.observed).toBe(true);
    memberships.next([membership]); memberships.complete();
    expect(component['currentMembership']()?.id).toBe('old');
    expect(component['quote']()).toBeNull();
    expect(component['errorMessage']()).toContain('cập nhật hệ thống');
    component.handleCheckout(); expect(createOrder).not.toHaveBeenCalled();
  });
  it('blocks ineligible exchanges' , () => {
    getQuote.mockReturnValue(of({ currentMembership: membership, credit: 800000, totalAmount: 2200000, issue: 'Cần kết thúc bảo lưu.' }));
    const component = page().componentInstance; component.handleCheckout(); expect(createOrder).not.toHaveBeenCalled();
  });
  it('ignores a late quote for a different student', () => {
    const first = new Subject(); getQuote.mockReturnValueOnce(first);
    const component = page().componentInstance; component.selectStudentFromSearch({ ...student, id: 'another' });
    first.next({ currentMembership: membership, credit: 800000, totalAmount: 2200000, issue: null }); first.complete();
    expect(component['quote']()?.currentMembership).toBeNull(); expect(component['resolvedStudent']()?.id).toBe('another');
  });
  it('clears the selected student when the search text changes', () => {
    const component = page().componentInstance; component.onSearchQueryChange('');
    expect(component['resolvedStudent']()).toBeNull(); expect(component['quote']()).toBeNull();
  });
  it('does not fabricate a receipt when the server rejects the order', () => {
    createOrder.mockReturnValue(throwError(() => ({ status: 409 })));
    const component = page().componentInstance; component.handleCheckout();
    expect(component['successReceipt']()).toBeNull(); expect(processPayment).not.toHaveBeenCalled();
  });
  it('retries payment with the same order, key and payload', () => {
    processPayment.mockReturnValueOnce(throwError(() => ({ status: 0 })));
    const component = page().componentInstance; component.handleCheckout(); const first = processPayment.mock.calls[0][0]; component.handleCheckout();
    expect(createOrder).toHaveBeenCalledTimes(1); expect(processPayment.mock.calls[1][0]).toEqual(first);
  });
  it('retries an ambiguous order with its original key', () => {
    createOrder.mockReturnValueOnce(throwError(() => ({ status: 0 })));
    const component = page().componentInstance; component.handleCheckout(); const key = createOrder.mock.calls[0][1]; component.handleCheckout();
    expect(createOrder.mock.calls[1][1]).toBe(key);
  });
  it('cancels a pending order before allowing a new quote', () => {
    processPayment.mockReturnValueOnce(throwError(() => ({ status: 0 })));
    const component = page().componentInstance; component.handleCheckout(); component.cancelPendingCheckout();
    expect(cancelOrder).toHaveBeenCalledWith('order'); expect(component['pendingCheckout']()).toBeNull();
  });
  it('allows a manager adjustment only with a reason and bounded value', () => {
    getQuote.mockReturnValue(of({ currentMembership: membership, credit: 800000, totalAmount: 2200000, issue: null }));
    const component = page().componentInstance;
    component['useCreditAdjustment'].set(true); component['adjustedCredit'].set(900000);
    component.handleCheckout(); expect(createOrder).not.toHaveBeenCalled();
    component['adjustmentReason'] = 'Bảo toàn quyền lợi'; component.handleCheckout();
    expect(createOrder.mock.calls[0][0]).toMatchObject({ expectedCredit: 800000, expectedTotal: 2100000, adjustedCredit: 900000, adjustmentReason: 'Bảo toàn quyền lợi' });
  });
  it('allows a zero top-up exchange without a transfer reference', () => {
    getQuote.mockReturnValue(of({ currentMembership: membership, credit: 3000000, totalAmount: 0, issue: null }));
    const component = page().componentInstance; component.setPaymentMethod('BANK_TRANSFER_QR'); component.handleCheckout();
    expect(processPayment.mock.calls[0][0].paymentMethod).toBe('CASH');
  });
});
