import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { OnlinePaymentResp, PosApi, SelfCheckoutApi } from '@yoga/mod-membership/data-access';
import { CheckoutComponent } from './checkout.component';

const link = (status: OnlinePaymentResp['status']): OnlinePaymentResp => ({
  id: 'link-1', paymentId: 'pay-1', orderId: 'order-1', provider: 'PAYOS', providerOrderCode: 100001, status, amount: 2400000,
  checkoutUrl: status === 'CREATED' ? 'https://pay.payos.vn/1' : null, qrPayload: status === 'CREATED' ? '000201' : null,
  expiresAt: new Date(Date.now() + 600_000).toISOString(), paidAt: null, paymentStatus: 'PENDING', orderStatus: 'PENDING', activatedMembershipCode: null
});

describe('Shared student checkout page', () => {
  let orders: unknown[];
  let selfCheckout: Record<string, ReturnType<typeof vi.fn>>;
  const courseOrder = { orderId: 'order-1', orderCode: 'ORD-1', branchName: 'An Yên Q1', subtotal: 2400000, discountAmount: 0, totalAmount: 2400000,
    status: 'PENDING', orderDate: '', items: [{ itemType: 'COURSE_CLASS', itemName: 'Yoga nền tảng' }], payments: [] };
  const planOrder = { ...courseOrder, orderId: 'order-2', subtotal: 3000000, discountAmount: 800000, totalAmount: 2200000,
    items: [{ itemType: 'MEMBERSHIP_PLAN', itemName: 'Thẻ 3 tháng', membershipCode: 'MB-9' }] };

  function setUp(orderId: string, query: Record<string, string> = {}) {
    orders = [courseOrder, planOrder];
    selfCheckout = { startOnlinePayment: vi.fn().mockReturnValue(of(link('CREATED'))), getOnlinePayment: vi.fn().mockReturnValue(of(link('CREATED'))),
      refreshOnlinePayment: vi.fn().mockReturnValue(of(link('CREATED'))), cancelOrder: vi.fn() };
    TestBed.configureTestingModule({ imports: [CheckoutComponent], providers: [provideExperimentalZonelessChangeDetection(), provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ orderId }), queryParamMap: convertToParamMap(query) } } },
      { provide: AuthService, useValue: { currentUserId: () => 'student-1' } },
      { provide: PosApi, useValue: { getStudentOrders: () => of(orders) } },
      { provide: SelfCheckoutApi, useValue: selfCheckout }] });
  }

  async function render() {
    const fixture = TestBed.createComponent(CheckoutComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
    return fixture;
  }

  it('shows a pending course order with its VietQR', async () => {
    setUp('order-1');
    const fixture = await render();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Khóa học'); expect(text).toContain('Yoga nền tảng'); expect(text).toContain('2,400,000');
    expect(selfCheckout['startOnlinePayment']).toHaveBeenCalledWith('order-1', expect.any(String));
    expect(text).toContain('100001');
  });

  it('shows the exchange credit of a plan order', async () => {
    setUp('order-2');
    const text = (await render()).nativeElement.textContent as string;
    expect(text).toContain('Gói thẻ'); expect(text).toContain('Khấu trừ thẻ cũ'); expect(text).toContain('800,000');
  });

  it('asks the gateway at once when the student comes back from PayOS', async () => {
    setUp('order-1', { check: '1' });
    await render();
    expect(selfCheckout['refreshOnlinePayment']).toHaveBeenCalledWith('link-1');
  });

  it('shows the result instead of a QR for an order already paid', async () => {
    setUp('order-2');
    planOrder.status = 'PAID';
    try {
      const fixture = await render();
      expect(fixture.nativeElement.textContent).toContain('Đơn hàng đã được thanh toán');
      expect(fixture.nativeElement.textContent).toContain('MB-9');
      expect(selfCheckout['startOnlinePayment']).not.toHaveBeenCalled();
    } finally { planOrder.status = 'PENDING'; }
  });

  it('does not open another student’s order', async () => {
    setUp('someone-else');
    const fixture = await render();
    expect(fixture.nativeElement.textContent).toContain('Không tìm thấy đơn hàng');
    expect(selfCheckout['startOnlinePayment']).not.toHaveBeenCalled();
  });
});
