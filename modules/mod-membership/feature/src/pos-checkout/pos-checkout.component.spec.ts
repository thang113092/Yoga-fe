import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService, UserApi, UserResponse } from '@yoga/platform/auth';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { MembershipApi, PosApi } from '@yoga/mod-membership/data-access';
import { CourseApi } from '@yoga/mod-schedule/data-access';
import { PosCheckoutComponent } from './pos-checkout.component';

describe('POS single membership checkout', () => {
  const student = { id: 'customer-real', fullName: 'Người mua', phone: '0901234567', email: 'mua@test.com' } as UserResponse;
  const plan = { id: 'plan', name: 'Gói mới', price: 3000000, isActive: true, totalSessions: 30, durationDays: 90 };
  const membership = { id: 'old', membershipCode: 'MB-old', planId: 'old-plan', status: 'ACTIVE', remainingSessions: 8, totalSessions: 20, purchasedPrice: 2000000 };
  let createOrder: ReturnType<typeof vi.fn>; let processPayment: ReturnType<typeof vi.fn>;
  let getQuote: ReturnType<typeof vi.fn>; let getMemberships: ReturnType<typeof vi.fn>; let cancelOrder: ReturnType<typeof vi.fn>;
  let startOnline: ReturnType<typeof vi.fn>; let getOnline: ReturnType<typeof vi.fn>; let refreshOnline: ReturnType<typeof vi.fn>;
  let getClasses: ReturnType<typeof vi.fn>; let enroll: ReturnType<typeof vi.fn>;
  const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
  const course = { id: 'class-1', code: 'YG01', name: 'Yoga nền tảng', branchId: 'branch', status: 'OPEN', plannedSessions: 12, maxCapacity: 20,
    enrolledCount: 4, tuitionFee: 2400000, startTime: future(10), endTime: future(50) };
  const online = (status: string) => ({ id: 'online', paymentId: 'pay', orderId: 'order', provider: 'PAYOS', providerOrderCode: 100001, status, amount: 3000000,
    checkoutUrl: status === 'CREATED' ? 'https://pay.payos.vn/web/1' : null, qrPayload: status === 'CREATED' ? '000201' : null,
    expiresAt: new Date(Date.now() + 600000).toISOString(), paidAt: null, paymentStatus: 'PENDING', orderStatus: status === 'PAID' ? 'PAID' : 'PENDING',
    activatedMembershipCode: status === 'PAID' ? 'MB-real' : null });
  beforeEach(() => {
    localStorage.clear();
    createOrder = vi.fn().mockReturnValue(of({ orderId: 'order', membershipCode: 'MB-real', totalAmount: 3000000 }));
    processPayment = vi.fn().mockReturnValue(of({ orderId: 'order', paymentStatus: 'SUCCESS' }));
    getQuote = vi.fn().mockReturnValue(of({ currentMembership: null, credit: 0, totalAmount: 3000000, issue: null }));
    getMemberships = vi.fn().mockReturnValue(of([])); cancelOrder = vi.fn().mockReturnValue(of(undefined));
    startOnline = vi.fn().mockReturnValue(of(online('CREATED'))); getOnline = vi.fn().mockReturnValue(of(online('CREATED')));
    refreshOnline = vi.fn().mockReturnValue(of(online('EXPIRED')));
    getClasses = vi.fn().mockReturnValue(of([course,
      { ...course, id: 'full', name: 'Đã đủ', enrolledCount: 20 }, { ...course, id: 'draft', name: 'Nháp', status: 'DRAFT' },
      { ...course, id: 'started', name: 'Đã học', startTime: future(-1) }]));
    enroll = vi.fn().mockReturnValue(of({ id: 'enr-1', enrollmentCode: 'CE-1', orderId: 'course-order', totalAmount: 2400000, status: 'PENDING_PAYMENT' }));
    TestBed.configureTestingModule({ imports: [PosCheckoutComponent], providers: [provideExperimentalZonelessChangeDetection(), provideRouter([]),
      { provide: AuthService, useValue: { currentUserId: () => 'cashier', isSuperAdmin: () => false, isBranchManager: () => false, branchIds: () => ['branch'] } },
      { provide: UserApi, useValue: { searchStudents: vi.fn().mockReturnValue(of([student])) } },
      { provide: BranchApi, useValue: { getAll: () => of([{ id: 'branch', name: 'Cơ sở', isActive: true }]) } },
      { provide: MembershipApi, useValue: { getActivePlans: () => of([plan]), getStudentMemberships: getMemberships } },
      { provide: CourseApi, useValue: { classes: getClasses, enroll } },
      { provide: PosApi, useValue: { createOrder, processPayment, getCheckoutQuote: getQuote, cancelPendingOrder: cancelOrder, startOnlinePayment: startOnline, getOnlinePayment: getOnline, cancelOnlinePayment: () => of(online('CANCELLED')), refreshOnlinePayment: refreshOnline } }
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
  describe('dynamic VietQR', () => {
    afterEach(() => vi.useRealTimers());
    it('opens a VietQR for the order without a transfer reference or counter payment', () => {
      const fixture = page(); const component = fixture.componentInstance;
      component.setPaymentMethod('PAYOS'); component.handleCheckout(); fixture.detectChanges();
      expect(createOrder).toHaveBeenCalledTimes(1);
      expect(startOnline).toHaveBeenCalledWith('order', expect.any(String));
      expect(processPayment).not.toHaveBeenCalled();
      expect(component['onlineOpen']()).toBe(true);
      expect(component['successReceipt']()).toBeNull();
      expect(fixture.nativeElement.querySelector('yoga-qr-code')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('#transactionRef')).toBeNull();
    });
    it('shows the receipt once the gateway confirms the money', () => {
      vi.useFakeTimers(); getOnline.mockReturnValue(of(online('PAID')));
      const component = page().componentInstance; component.setPaymentMethod('PAYOS'); component.handleCheckout();
      vi.advanceTimersByTime(3000);
      expect(component['successReceipt']()?.payment.activatedMembershipCode).toBe('MB-real');
      expect(component['pendingCheckout']()).toBeNull();
    });
    it('cannot cancel the order while the VietQR is open', () => {
      const component = page().componentInstance; component.setPaymentMethod('PAYOS'); component.handleCheckout();
      component.cancelPendingCheckout(); expect(cancelOrder).not.toHaveBeenCalled();
    });
    it('releases the order and unlocks student search when the cashier cancels the VietQR', () => {
      const component = page().componentInstance; component.setPaymentMethod('PAYOS'); component.handleCheckout();
      component.cancelOnline();
      expect(cancelOrder).toHaveBeenCalledWith('order');
      expect(component['pendingCheckout']()).toBeNull();
      expect(component['isProcessing']()).toBe(false);
      component.onSearchQueryChange('khác');
      expect(component['resolvedStudent']()).toBeNull();
    });
    it('asks the gateway as soon as the VietQR countdown ends', () => {
      vi.useFakeTimers();
      startOnline.mockReturnValue(of({ ...online('CREATED'), expiresAt: new Date(Date.now() + 2000).toISOString() }));
      const component = page().componentInstance; component.setPaymentMethod('PAYOS'); component.handleCheckout();
      vi.advanceTimersByTime(1000); expect(refreshOnline).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1500);
      expect(refreshOnline).toHaveBeenCalledTimes(1);
      expect(component['onlineOpen']()).toBe(false);
      expect(component['errorMessage']()).toContain('hết hạn');
    });
    it('reopens the same VietQR after a page reload instead of offering a cancel', () => {
      const first = page().componentInstance; first.setPaymentMethod('PAYOS'); first.handleCheckout();
      const key = startOnline.mock.calls[0][1];
      const fixture = page(false); fixture.detectChanges();
      expect(startOnline).toHaveBeenCalledTimes(2);
      expect(startOnline.mock.calls[1]).toEqual(['order', key]);
      expect(fixture.componentInstance['onlineOpen']()).toBe(true);
      expect(fixture.nativeElement.textContent).not.toContain('Hủy đơn chưa thanh toán');
    });
    it('collects the same order another way after the VietQR expires', () => {
      startOnline.mockReturnValue(of(online('EXPIRED')));
      const component = page().componentInstance; component.setPaymentMethod('PAYOS'); component.handleCheckout();
      const onlineKey = startOnline.mock.calls[0][1];
      expect(component['errorMessage']()).toContain('hết hạn');
      component.setPaymentMethod('CASH'); component.handleCheckout();
      expect(createOrder).toHaveBeenCalledTimes(1);
      expect(processPayment.mock.calls[0][0]).toMatchObject({ orderId: 'order', paymentMethod: 'CASH' });
      expect(processPayment.mock.calls[0][0].idempotencyKey).not.toBe(onlineKey);
    });
    it('never offers to collect again when the money needs reconciliation', () => {
      startOnline.mockReturnValue(of(online('NEEDS_RECONCILIATION')));
      const component = page().componentInstance; component.setPaymentMethod('PAYOS'); component.handleCheckout();
      expect(component['pendingCheckout']()).toBeNull();
      expect(component['errorMessage']()).toContain('đối soát');
    });
  });
  it('allows a zero top-up exchange without a transfer reference', () => {
    getQuote.mockReturnValue(of({ currentMembership: membership, credit: 3000000, totalAmount: 0, issue: null }));
    const component = page().componentInstance; component.setPaymentMethod('BANK_TRANSFER_QR'); component.handleCheckout();
    expect(processPayment.mock.calls[0][0].paymentMethod).toBe('CASH');
  });

  it('lists open courses of the branch below the plans, without full, draft or started classes', () => {
    const fixture = page(); fixture.detectChanges();
    expect(getClasses).toHaveBeenCalledWith('branch');
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Gói mới');
    expect(text).toContain('Yoga nền tảng');
    expect(text).not.toContain('Đã đủ'); expect(text).not.toContain('Nháp'); expect(text).not.toContain('Đã học');
    expect(text.indexOf('Gói mới')).toBeLessThan(text.indexOf('Yoga nền tảng'));
  });

  it('sells a course: enrolls the student, collects the fee and shows the enrollment code', () => {
    processPayment.mockReturnValue(of({ orderId: 'course-order', paymentStatus: 'SUCCESS', paymentMethod: 'CASH' }));
    const fixture = page(); const component = fixture.componentInstance;
    component.selectCourse('class-1'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Xác nhận ghi danh & thu học phí');
    expect(component['amountDue']()).toBe(2400000);

    component.handleCheckout(); fixture.detectChanges();

    expect(enroll).toHaveBeenCalledWith('class-1', student.id);
    expect(createOrder).not.toHaveBeenCalled();
    expect(processPayment.mock.calls[0][0]).toMatchObject({ orderId: 'course-order', paymentMethod: 'CASH', cashierId: 'cashier' });
    expect(fixture.nativeElement.textContent).toContain('CE-1');
    expect(fixture.nativeElement.textContent).toContain('Khóa học đăng ký');
  });

  it('collects a course fee by dynamic VietQR on the enrollment order', () => {
    const fixture = page(); const component = fixture.componentInstance;
    component.selectCourse('class-1'); component.setPaymentMethod('PAYOS');
    component.handleCheckout(); fixture.detectChanges();
    expect(startOnline).toHaveBeenCalledWith('course-order', expect.any(String));
    expect(processPayment).not.toHaveBeenCalled();
  });

  it('switching back to a plan clears the course and asks for a quote again', () => {
    const component = page().componentInstance;
    component.selectCourse('class-1');
    getQuote.mockClear();
    component.selectPlan('plan');
    expect(component['selectedCourse']()).toBeNull();
    expect(getQuote).toHaveBeenCalled();
    component.handleCheckout();
    expect(enroll).not.toHaveBeenCalled();
    expect(createOrder).toHaveBeenCalled();
  });

  function openedFromCourses(params: Record<string, string>) {
    TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } });
  }

  it('opens with the course chosen on the Courses page already selected', () => {
    openedFromCourses({ courseId: 'class-1', branchId: 'branch' });
    const fixture = page(); fixture.detectChanges();
    expect(fixture.componentInstance['selectedCourse']()?.id).toBe('class-1');
    expect(fixture.componentInstance['amountDue']()).toBe(2400000);
    expect(fixture.nativeElement.textContent).toContain('Xác nhận ghi danh & thu học phí');
  });

  it('explains when the chosen course can no longer be joined', () => {
    openedFromCourses({ courseId: 'full', branchId: 'branch' });
    const component = page(false).componentInstance;
    expect(component['selectedCourse']()).toBeNull();
    expect(component['errorMessage']()).toContain('không còn nhận đăng ký');
  });

  it('refuses a course at a branch the cashier is not assigned to', () => {
    openedFromCourses({ courseId: 'class-1', branchId: 'other-branch' });
    const component = page(false).componentInstance;
    expect(component['selectedCourse']()).toBeNull();
    expect(component['errorMessage']()).toContain('không được phân công');
  });
});
