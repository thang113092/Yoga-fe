import { TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '@yoga/platform/auth';
import { BranchApi } from '@yoga/mod-branch/data-access';
import { RevenueApi, RevenueReportResponse } from '@yoga/mod-membership/data-access';
import { RevenueReportComponent } from './revenue-report.component';

describe('RevenueReportComponent', () => {
  const mockReport: RevenueReportResponse = {
    overview: {
      totalRevenue: 50000000,
      totalOrders: 10,
      averageOrderValue: 5000000,
      totalMembershipsActivated: 10
    },
    dailyTrends: [
      { date: '2026-10-01', amount: 20000000, orderCount: 4 },
      { date: '2026-10-02', amount: 30000000, orderCount: 6 }
    ],
    paymentMethodSummaries: [
      { paymentMethod: 'BANK_TRANSFER_QR', methodName: 'Chuyển khoản QR', totalAmount: 30000000, transactionCount: 6, percentage: 60 },
      { paymentMethod: 'CASH', methodName: 'Tiền mặt', totalAmount: 20000000, transactionCount: 4, percentage: 40 }
    ],
    planSummaries: [
      { planId: 'p1', planName: 'Gói Kim Cương 12T', quantitySold: 2, totalRevenue: 30000000, percentage: 60 }
    ],
    branchSummaries: [
      { branchId: 'b1', branchCode: 'CN_Q1', branchName: 'Cơ sở Quận 1', totalRevenue: 50000000, orderCount: 10, percentage: 100 }
    ],
    recentTransactions: [
      {
        orderId: 'o1',
        orderCode: 'ORD-001',
        paymentId: 'pay-1',
        paymentCode: 'PAY-001',
        paymentTime: '2026-10-02T10:00:00Z',
        branchId: 'b1',
        branchName: 'Cơ sở Quận 1',
        customerName: 'Nguyễn Văn A',
        customerPhone: '0901234567',
        planName: 'Gói Kim Cương 12T',
        amount: 15000000,
        paymentMethod: 'BANK_TRANSFER_QR',
        paymentMethodName: 'Chuyển khoản QR',
        cashierName: 'Thu ngân 1',
        status: 'SUCCESS'
      }
    ],
    fromDate: '2026-10-01',
    toDate: '2026-10-02',
    filteredBranchId: null,
    filteredBranchName: null
  };

  const mockBranches = [
    { id: 'b1', code: 'CN_Q1', name: 'Cơ sở Quận 1', address: 'Q1', phone: '0901', email: 'q1@yoga.vn', isActive: true },
    { id: 'b2', code: 'CN_CG', name: 'Cơ sở Cầu Giấy', address: 'CG', phone: '0902', email: 'cg@yoga.vn', isActive: true }
  ];

  let revenueApiMock: { getRevenueReport: ReturnType<typeof vi.fn> };
  let branchApiMock: { getAll: ReturnType<typeof vi.fn> };
  let authMock: {
    isSuperAdmin: ReturnType<typeof vi.fn>;
    isBranchManager: ReturnType<typeof vi.fn>;
    branchIds: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    revenueApiMock = {
      getRevenueReport: vi.fn().mockReturnValue(of(mockReport))
    };

    branchApiMock = {
      getAll: vi.fn().mockReturnValue(of(mockBranches))
    };

    authMock = {
      isSuperAdmin: vi.fn().mockReturnValue(true),
      isBranchManager: vi.fn().mockReturnValue(false),
      branchIds: vi.fn().mockReturnValue(['b1'])
    };

    await TestBed.configureTestingModule({
      imports: [RevenueReportComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        provideRouter([]),
        { provide: RevenueApi, useValue: revenueApiMock },
        { provide: BranchApi, useValue: branchApiMock },
        { provide: AuthService, useValue: authMock }
      ]
    }).compileComponents();
  });

  it('khởi tạo và hiển thị báo cáo doanh thu thành công', () => {
    const fixture = TestBed.createComponent(RevenueReportComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.main-title')?.textContent).toContain('Tổng Hợp Doanh Thu');
    expect(compiled.querySelector('.highlight-card .serif-value')?.textContent).toContain('50.000.000');
    expect(compiled.querySelectorAll('.bar-column').length).toBe(2);
  });

  it('lọc giao dịch theo từ khóa tìm kiếm trên bảng sổ cái', () => {
    const fixture = TestBed.createComponent(RevenueReportComponent);
    fixture.detectChanges();

    const comp = fixture.componentInstance;
    expect(comp['filteredTransactions']().length).toBe(1);

    comp['transactionSearch'].set('Không tồn tại');
    fixture.detectChanges();
    expect(comp['filteredTransactions']().length).toBe(0);

    comp['transactionSearch'].set('0901234567');
    fixture.detectChanges();
    expect(comp['filteredTransactions']().length).toBe(1);
  });
});
