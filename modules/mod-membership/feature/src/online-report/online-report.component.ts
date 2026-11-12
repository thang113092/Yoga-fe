import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { accessScopeLabel, OnlineReport, OnlineReportApi } from '@yoga/mod-membership/data-access';
import { Branch, BranchApi } from '@yoga/mod-branch/data-access';
import { AuthService } from '@yoga/platform/auth';
import { ZEN_UI, ZenSelectOption } from '@yoga/platform/ui';

type DatePreset = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM';

function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Báo cáo học online: lớp online trực tiếp, gói/khóa học online và thư viện video. */
@Component({
  selector: 'yoga-online-report',
  standalone: true,
  imports: [CommonModule, FormsModule, ...ZEN_UI],
  templateUrl: './online-report.component.html',
  styleUrl: './online-report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnlineReportComponent implements OnInit {
  private readonly reportApi = inject(OnlineReportApi);
  private readonly branchApi = inject(BranchApi);
  protected readonly auth = inject(AuthService);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly report = signal<OnlineReport | null>(null);
  protected readonly branches = signal<Branch[]>([]);

  protected readonly selectedPreset = signal<DatePreset>('LAST_30_DAYS');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly selectedBranchId = signal('');

  /** Quản lý cơ sở chỉ xem được cơ sở của mình (backend cũng giới hạn). */
  protected readonly branchLocked = computed(() => this.auth.isBranchManager() && !this.auth.isSuperAdmin());

  protected readonly branchOptions = computed<ZenSelectOption[]>(() => {
    const options: ZenSelectOption[] = [];
    if (!this.branchLocked()) options.push({ value: 'ALL', label: 'Tất cả cơ sở' });
    for (const b of this.branches()) options.push({ value: b.id, label: b.name, sublabel: b.code });
    return options;
  });

  protected readonly selectedBranchName = computed(() => {
    const id = this.report()?.branchId || this.selectedBranchId();
    if (!id) return 'Toàn hệ thống An Yên';
    return this.branches().find(b => b.id === id)?.name ?? 'Cơ sở đã chọn';
  });

  protected readonly maxDaily = computed(() => {
    const days = this.report()?.daily ?? [];
    const max = Math.max(0, ...days.map(d => Math.max(d.joins, d.videoPlays)));
    return max > 0 ? max : 1;
  });

  protected readonly hasDailyActivity = computed(() => (this.report()?.daily ?? []).some(d => d.joins > 0 || d.videoPlays > 0));

  protected readonly totalOnlineRevenue = computed(() => {
    const k = this.report()?.kpi;
    return k ? Number(k.packageRevenue || 0) + Number(k.courseRevenue || 0) : 0;
  });

  ngOnInit(): void {
    this.applyDatePreset('LAST_30_DAYS', false);
    this.isLoading.set(true);
    if (this.branchLocked()) {
      const known = this.auth.userHomeBranchId() || this.auth.branchIds()[0] || '';
      if (known) this.selectedBranchId.set(known);
    }
    this.branchApi.getAll().subscribe({
      next: list => {
        let active = (list ?? []).filter(b => b.isActive);
        if (this.branchLocked()) {
          const mine = new Set(this.auth.branchIds());
          const home = this.auth.userHomeBranchId();
          const own = active.filter(b => mine.has(b.id) || b.id === home);
          if (own.length) active = own;
          if (!this.selectedBranchId() || !active.some(b => b.id === this.selectedBranchId())) {
            this.selectedBranchId.set(active[0]?.id ?? '');
          }
        }
        this.branches.set(active);
        this.loadReport();
      },
      error: () => this.loadReport()
    });
  }

  protected loadReport(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.reportApi.getReport({
      startDate: this.startDate() || undefined,
      endDate: this.endDate() || undefined,
      branchId: this.selectedBranchId() || undefined
    }).subscribe({
      next: r => {
        this.report.set(r);
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set(err?.error?.message || err?.message || 'Không thể tải báo cáo học online. Vui lòng kiểm tra quyền truy cập.');
        this.isLoading.set(false);
      }
    });
  }

  protected applyDatePreset(preset: DatePreset, reload = true): void {
    this.selectedPreset.set(preset);
    const now = new Date();
    const today = formatIsoDate(now);
    switch (preset) {
      case 'TODAY':
        this.startDate.set(today);
        this.endDate.set(today);
        break;
      case 'LAST_7_DAYS':
      case 'LAST_30_DAYS': {
        const d = new Date(now);
        d.setDate(d.getDate() - (preset === 'LAST_7_DAYS' ? 6 : 29));
        this.startDate.set(formatIsoDate(d));
        this.endDate.set(today);
        break;
      }
      case 'THIS_MONTH':
        this.startDate.set(formatIsoDate(new Date(now.getFullYear(), now.getMonth(), 1)));
        this.endDate.set(today);
        break;
      case 'CUSTOM':
        break;
    }
    if (reload) this.loadReport();
  }

  protected onStartDateChange(val: string): void {
    this.startDate.set(val || '');
    this.onCustomDateChange();
  }

  protected onEndDateChange(val: string): void {
    this.endDate.set(val || '');
    this.onCustomDateChange();
  }

  private onCustomDateChange(): void {
    this.selectedPreset.set('CUSTOM');
    if (this.startDate() && this.endDate()) this.loadReport();
  }

  protected onBranchChange(branchId: string): void {
    if (this.branchLocked()) return;
    this.selectedBranchId.set(branchId === 'ALL' ? '' : (branchId || ''));
    this.loadReport();
  }

  protected scopeLabel(scope: string): string {
    return accessScopeLabel(scope);
  }

  protected formatCurrency(amount: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount ?? 0));
  }

  protected formatNumber(value: number | null | undefined, digits = 0): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(Number(value ?? 0));
  }

  protected formatDateDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  }
}
