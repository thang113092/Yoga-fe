import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { RevenueApi, RevenueReportResponse } from '@yoga/mod-membership/data-access';
import { Branch, BranchApi } from '@yoga/mod-branch/data-access';
import { AuthService } from '@yoga/platform/auth';
import {
  ZenButtonComponent,
  ZenInputComponent,
  ZenSelectComponent,
  ZenSelectOption
} from '@yoga/platform/ui';

type DatePreset = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

@Component({
  selector: 'yoga-revenue-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ZenButtonComponent,
    ZenInputComponent,
    ZenSelectComponent
  ],
  templateUrl: './revenue-report.component.html',
  styleUrl: './revenue-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RevenueReportComponent implements OnInit {
  private readonly revenueApi = inject(RevenueApi);
  private readonly branchApi = inject(BranchApi);
  protected readonly auth = inject(AuthService);

  // Trạng thái dữ liệu
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly reportData = signal<RevenueReportResponse | null>(null);
  protected readonly branches = signal<Branch[]>([]);

  // Bộ lọc
  protected readonly selectedPreset = signal<DatePreset>('LAST_30_DAYS');
  protected readonly startDate = signal<string>('');
  protected readonly endDate = signal<string>('');
  protected readonly selectedBranchId = signal<string>('');
  protected readonly selectedPaymentMethod = signal<string>('ALL');
  protected readonly transactionSearch = signal<string>('');

  // Tùy chọn cơ sở cho zen-select
  protected readonly branchOptions = computed<ZenSelectOption[]>(() => {
    const list = this.branches();
    const options: ZenSelectOption[] = [];
    if (this.auth.isSuperAdmin()) {
      options.push({ value: 'ALL', label: 'Tất cả cơ sở' });
    }
    for (const b of list) {
      options.push({ value: b.id, label: b.name, sublabel: b.code });
    }
    return options;
  });

  // Tùy chọn hình thức thanh toán cho zen-select
  protected readonly paymentMethodOptions: ZenSelectOption[] = [
    { value: 'ALL', label: 'Tất cả hình thức' },
    { value: 'CASH', label: 'Tiền mặt tại quầy' },
    { value: 'BANK_TRANSFER_QR', label: 'Chuyển khoản QR Napas' },
    { value: 'POS_CARD', label: 'Quẹt thẻ POS ngân hàng' }
  ];

  // Giá trị tính toán cho biểu đồ cột
  protected readonly maxDailyRevenue = computed(() => {
    const trends = this.reportData()?.dailyTrends ?? [];
    if (trends.length === 0) return 1;
    const max = Math.max(...trends.map(t => t.amount));
    return max > 0 ? max : 1;
  });

  // Giao dịch được lọc theo từ khóa tìm kiếm
  protected readonly filteredTransactions = computed(() => {
    const list = this.reportData()?.recentTransactions ?? [];
    const query = this.transactionSearch().trim().toLowerCase();
    if (!query) return list;
    return list.filter(t =>
      (t.orderCode && t.orderCode.toLowerCase().includes(query)) ||
      (t.paymentCode && t.paymentCode.toLowerCase().includes(query)) ||
      (t.customerName && t.customerName.toLowerCase().includes(query)) ||
      (t.customerPhone && t.customerPhone.includes(query)) ||
      (t.planName && t.planName.toLowerCase().includes(query)) ||
      (t.branchName && t.branchName.toLowerCase().includes(query))
    );
  });

  ngOnInit(): void {
    this.applyDatePreset('LAST_30_DAYS', false);
    this.initData();
  }

  private initData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    if (this.auth.isBranchManager() && !this.auth.isSuperAdmin()) {
      const knownBranchId = this.auth.userHomeBranchId() || this.auth.branchIds()[0] || '';
      if (knownBranchId) {
        this.selectedBranchId.set(knownBranchId);
      }
    }

    this.branchApi.getAll().subscribe({
      next: branches => {
        const activeBranches = branches.filter(b => b.isActive);
        this.branches.set(activeBranches);

        if (this.auth.isBranchManager() && !this.auth.isSuperAdmin()) {
          const userBranchIds = this.auth.branchIds();
          const managerBranch = activeBranches.find(b => userBranchIds.includes(b.id))
            || activeBranches.find(b => b.id === this.auth.userHomeBranchId())
            || activeBranches[0];
          if (managerBranch) {
            this.selectedBranchId.set(managerBranch.id);
          }
        }

        this.loadReport();
      },
      error: () => {
        this.loadReport();
      }
    });
  }

  protected loadReport(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.fetchReportObservable().subscribe({
      next: report => {
        this.reportData.set(report);
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(err?.error?.message || 'Không thể cập nhật báo cáo. Vui lòng kiểm tra quyền truy cập.');
        this.isLoading.set(false);
      }
    });
  }

  private fetchReportObservable() {
    return this.revenueApi.getRevenueReport({
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      branchId: this.selectedBranchId() || undefined,
      paymentMethod: this.selectedPaymentMethod() !== 'ALL' ? this.selectedPaymentMethod() : undefined
    });
  }

  protected applyDatePreset(preset: DatePreset, reload = true): void {
    this.selectedPreset.set(preset);
    const now = new Date();

    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(now);

    switch (preset) {
      case 'TODAY':
        this.startDate.set(todayStr);
        this.endDate.set(todayStr);
        break;
      case 'LAST_7_DAYS': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        this.startDate.set(formatDate(d));
        this.endDate.set(todayStr);
        break;
      }
      case 'LAST_30_DAYS': {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        this.startDate.set(formatDate(d));
        this.endDate.set(todayStr);
        break;
      }
      case 'THIS_MONTH': {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        this.startDate.set(formatDate(d));
        this.endDate.set(todayStr);
        break;
      }
      case 'CUSTOM':
        // Giữ nguyên giá trị ngày người dùng chọn
        break;
    }

    if (reload) {
      this.loadReport();
    }
  }

  protected onStartDateChange(val: string): void {
    this.startDate.set(val || '');
    this.onCustomDateChange();
  }

  protected onEndDateChange(val: string): void {
    this.endDate.set(val || '');
    this.onCustomDateChange();
  }

  protected onCustomDateChange(): void {
    this.selectedPreset.set('CUSTOM');
    if (this.startDate() && this.endDate()) {
      this.loadReport();
    }
  }

  protected onBranchChange(branchId: string): void {
    this.selectedBranchId.set(branchId === 'ALL' ? '' : (branchId || ''));
    this.loadReport();
  }

  protected onPaymentMethodChange(method: string): void {
    this.selectedPaymentMethod.set(method || 'ALL');
    this.loadReport();
  }

  protected printReport(): void {
    window.print();
  }

  protected formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  }

  protected formatDateDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    // Chuyển YYYY-MM-DD thành DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  protected formatDateTimeDisplay(isoStr: string | null | undefined): string {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(d);
    } catch {
      return isoStr;
    }
  }
}
