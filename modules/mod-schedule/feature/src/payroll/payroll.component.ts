import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@yoga/platform/auth';
import { ZEN_UI, ZenConfirmService, ZenSelectOption, ZenTabItem, ZenToastService } from '@yoga/platform/ui';
import {
  BranchItem,
  InstructorItem,
  InstructorPay,
  PayRatePolicy,
  PayrollApi,
  PayrollPreview,
  SavePayRatePolicyReq,
  ScheduleApi
} from '@yoga/mod-schedule/data-access';

type PayrollTab = 'preview' | 'policies';

interface PolicyForm {
  instructorId: string;
  branchId: string;
  basePayPerClass: number | null;
  onlinePayPerClass: number | null;
  headcountBonusPerStudent: number | null;
  effectiveFrom: string;
}

const MODE_LABELS: Record<string, string> = { IN_PERSON: 'Tại phòng', ONLINE: 'Online', HYBRID: 'Hybrid' };

function vnToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Bảng lương HLV theo tháng (CSV cho Excel) và đơn giá thù lao. */
export function buildPayrollCsv(preview: PayrollPreview, branchName = ''): string {
  const fmtTime = (iso: string) => new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(iso));
  const rows: unknown[][] = [
    ['Bảng lương HLV', `Tháng ${String(preview.month).padStart(2, '0')}/${preview.year}`, branchName || 'Tất cả cơ sở'],
    [],
    ['Huấn luyện viên', 'Buổi tại phòng', 'Buổi online', 'Buổi hybrid', 'Học viên', 'Học viên online', 'Buổi chưa có đơn giá', 'Tổng thù lao (VND)']
  ];
  for (const p of preview.instructors) {
    rows.push([p.instructorName, p.studioSessions, p.onlineSessions, p.hybridSessions, p.attended, p.onlineAttended, p.unpricedSessions, Number(p.total ?? 0)]);
  }
  rows.push(['Tổng cộng', '', '', '', '', '', preview.unpricedSessions, Number(preview.total ?? 0)]);
  rows.push([]);
  rows.push(['Chi tiết buổi dạy']);
  rows.push(['Huấn luyện viên', 'Thời gian', 'Lớp', 'Hình thức', 'Học viên', 'Học viên online', 'Đơn giá buổi', 'Thưởng/học viên', 'Thành tiền']);
  for (const p of preview.instructors) {
    for (const l of p.lines) {
      rows.push([
        p.instructorName, fmtTime(l.startTime), l.className, MODE_LABELS[l.deliveryMode] ?? l.deliveryMode,
        l.attended, l.onlineAttended,
        l.sessionRate ?? 'Chưa có đơn giá', l.bonusPerStudent ?? '', l.lineTotal ?? ''
      ]);
    }
  }
  return '﻿' + rows.map(r => r.map(csvCell).join(',')).join('\r\n');
}

@Component({
  selector: 'yoga-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, ...ZEN_UI],
  templateUrl: './payroll.component.html',
  styleUrls: ['./payroll.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PayrollComponent implements OnInit {
  private readonly payrollApi = inject(PayrollApi);
  private readonly scheduleApi = inject(ScheduleApi);
  private readonly toast = inject(ZenToastService);
  private readonly confirm = inject(ZenConfirmService);
  protected readonly auth = inject(AuthService);

  readonly tabs: ZenTabItem<PayrollTab>[] = [
    { key: 'preview', label: 'Bảng lương tháng', icon: 'banknote' },
    { key: 'policies', label: 'Đơn giá', icon: 'tag' }
  ];
  readonly activeTab = signal<PayrollTab>('preview');

  readonly canAdmin = computed(() => this.auth.isSuperAdmin());
  readonly isInstructorOnly = computed(() => this.auth.isInstructor() && !this.auth.isSuperAdmin() && !this.auth.isBranchManager());
  readonly showBranchFilter = computed(() => this.auth.isSuperAdmin() || this.auth.isBranchManager());

  readonly branches = signal<BranchItem[]>([]);
  readonly instructors = signal<InstructorItem[]>([]);

  // ---- Bảng lương tháng
  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth() + 1);
  readonly branchId = signal('');
  readonly preview = signal<PayrollPreview | null>(null);
  readonly loadingPreview = signal(false);
  readonly previewError = signal<string | null>(null);
  readonly expanded = signal<ReadonlySet<string>>(new Set());

  // ---- Đơn giá
  readonly policies = signal<PayRatePolicy[]>([]);
  readonly loadingPolicies = signal(false);
  readonly policiesLoaded = signal(false);
  readonly policiesError = signal<string | null>(null);
  readonly showInactive = signal(false);
  readonly formOpen = signal(false);
  readonly form = signal<PolicyForm | null>(null);
  readonly formError = signal<string | null>(null);
  readonly saving = signal(false);

  readonly monthOptions: ZenSelectOption[] = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Tháng ${i + 1}` }));
  readonly yearOptions = computed<ZenSelectOption[]>(() => {
    const now = new Date().getFullYear();
    return [now + 1, now, now - 1, now - 2].map(y => ({ value: String(y), label: String(y) }));
  });

  readonly branchOptions = computed<ZenSelectOption[]>(() => {
    const opts: ZenSelectOption[] = this.auth.isSuperAdmin() ? [{ value: 'ALL', label: 'Tất cả cơ sở' }] : [];
    return [...opts, ...this.branches().map(b => ({ value: b.id, label: b.name, sublabel: b.code }))];
  });
  readonly formBranchOptions = computed<ZenSelectOption[]>(() => [
    { value: '', label: 'Mọi cơ sở (áp dụng chung)' },
    ...this.branches().map(b => ({ value: b.id, label: b.name, sublabel: b.code }))
  ]);
  readonly instructorOptions = computed<ZenSelectOption[]>(() =>
    this.instructors().map(i => ({ value: i.id, label: i.fullName, sublabel: i.phone || i.email || undefined })));

  readonly visiblePolicies = computed(() => this.showInactive() ? this.policies() : this.policies().filter(p => p.active));

  readonly summary = computed(() => {
    const p = this.preview();
    const list = p?.instructors ?? [];
    return {
      instructors: list.length,
      sessions: list.reduce((s, i) => s + i.studioSessions + i.onlineSessions + i.hybridSessions, 0),
      attended: list.reduce((s, i) => s + i.attended, 0),
      total: Number(p?.total ?? 0),
      unpriced: p?.unpricedSessions ?? 0
    };
  });

  ngOnInit(): void {
    if (this.showBranchFilter()) {
      this.scheduleApi.getBranches().subscribe({
        next: list => {
          const mine = new Set(this.auth.branchIds());
          const home = this.auth.userHomeBranchId();
          const active = (list ?? []).filter(b => !b.isVirtual && b.isActive !== false);
          this.branches.set(this.auth.isSuperAdmin() ? active : active.filter(b => b.id === home || mine.has(b.id)));
          if (!this.auth.isSuperAdmin() && !this.branchId()) this.branchId.set(home && this.branches().some(b => b.id === home) ? home : (this.branches()[0]?.id ?? ''));
          this.loadPreview();
        },
        error: () => this.loadPreview()
      });
    } else {
      this.loadPreview();
    }
  }

  setTab(tab: PayrollTab): void {
    this.activeTab.set(tab);
    if (tab === 'policies' && !this.policiesLoaded()) this.loadPolicies();
  }

  // ------------------------------------------------------------ preview

  loadPreview(): void {
    this.loadingPreview.set(true);
    this.previewError.set(null);
    this.payrollApi.getPreview({
      year: this.year(),
      month: this.month(),
      branchId: this.showBranchFilter() ? (this.branchId() || undefined) : undefined
    }).subscribe({
      next: p => {
        this.preview.set(p);
        this.expanded.set(new Set());
        this.loadingPreview.set(false);
      },
      error: err => {
        this.previewError.set(err?.error?.message || err?.message || 'Không tải được bảng lương.');
        this.loadingPreview.set(false);
      }
    });
  }

  onMonthChange(value: string): void {
    this.month.set(Number(value) || this.month());
    this.loadPreview();
  }

  onYearChange(value: string): void {
    this.year.set(Number(value) || this.year());
    this.loadPreview();
  }

  shiftMonth(delta: number): void {
    const d = new Date(this.year(), this.month() - 1 + delta, 1);
    this.year.set(d.getFullYear());
    this.month.set(d.getMonth() + 1);
    this.loadPreview();
  }

  onBranchChange(value: string): void {
    this.branchId.set(value === 'ALL' ? '' : (value || ''));
    this.loadPreview();
  }

  toggleExpanded(instructorId: string): void {
    this.expanded.update(set => {
      const next = new Set(set);
      if (next.has(instructorId)) next.delete(instructorId); else next.add(instructorId);
      return next;
    });
  }

  isExpanded(instructorId: string): boolean {
    return this.expanded().has(instructorId);
  }

  totalSessions(p: InstructorPay): number {
    return p.studioSessions + p.onlineSessions + p.hybridSessions;
  }

  exportCsv(): void {
    const p = this.preview();
    if (!p) return;
    const branchName = this.branches().find(b => b.id === this.branchId())?.name ?? '';
    const blob = new Blob([buildPayrollCsv(p, branchName)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bang-luong-hlv-${p.year}-${String(p.month).padStart(2, '0')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  modeLabel(mode: string): string {
    return MODE_LABELS[mode] ?? mode;
  }

  // ------------------------------------------------------------ policies

  loadPolicies(): void {
    this.loadingPolicies.set(true);
    this.policiesError.set(null);
    this.payrollApi.getPolicies().subscribe({
      next: list => {
        this.policies.set(list ?? []);
        this.policiesLoaded.set(true);
        this.loadingPolicies.set(false);
      },
      error: err => {
        this.policiesError.set(err?.error?.message || err?.message || 'Không tải được đơn giá.');
        this.loadingPolicies.set(false);
      }
    });
  }

  openCreate(): void {
    this.form.set({ instructorId: '', branchId: '', basePayPerClass: null, onlinePayPerClass: null, headcountBonusPerStudent: null, effectiveFrom: vnToday() });
    this.formError.set(null);
    this.formOpen.set(true);
    if (!this.instructors().length) {
      this.scheduleApi.getInstructors().subscribe({
        next: list => this.instructors.set(list ?? []),
        error: () => this.formError.set('Không tải được danh sách huấn luyện viên.')
      });
    }
  }

  closeCreate(): void {
    this.formOpen.set(false);
    this.form.set(null);
  }

  patchForm(patch: Partial<PolicyForm>): void {
    this.form.update(f => f ? { ...f, ...patch } : f);
  }

  private amount(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  submit(): void {
    const f = this.form();
    if (!f || this.saving()) return;
    const base = this.amount(f.basePayPerClass);
    const online = this.amount(f.onlinePayPerClass);
    const bonus = this.amount(f.headcountBonusPerStudent);
    if (!f.instructorId) { this.formError.set('Vui lòng chọn huấn luyện viên.'); return; }
    if (base === null || Number.isNaN(base) || base < 0) { this.formError.set('Đơn giá tại phòng phải là số không âm.'); return; }
    if ((online !== null && (Number.isNaN(online) || online < 0)) || (bonus !== null && (Number.isNaN(bonus) || bonus < 0))) {
      this.formError.set('Đơn giá online và thưởng theo học viên phải là số không âm.');
      return;
    }
    const req: SavePayRatePolicyReq = {
      instructorId: f.instructorId,
      branchId: f.branchId || null,
      basePayPerClass: base,
      onlinePayPerClass: online,
      headcountBonusPerStudent: bonus ?? 0
    };
    if (f.effectiveFrom) req.effectiveFrom = f.effectiveFrom;
    this.saving.set(true);
    this.formError.set(null);
    this.payrollApi.createPolicy(req).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeCreate();
        this.toast.success('Đã lưu đơn giá mới. Đơn giá cũ cùng phạm vi đã được đóng từ ngày hiệu lực.');
        this.loadPolicies();
        this.loadPreview();
      },
      error: err => {
        this.saving.set(false);
        this.formError.set(err?.error?.message || err?.message || 'Không lưu được đơn giá.');
      }
    });
  }

  async deactivate(p: PayRatePolicy): Promise<void> {
    const ok = await this.confirm.confirm({
      type: 'warning',
      title: 'Ngừng áp dụng đơn giá',
      message: 'Các buổi dạy trong thời gian hiệu lực của đơn giá này sẽ không còn được tính tiền theo nó.',
      itemName: `${p.instructorName} · ${p.branchName || 'Mọi cơ sở'}`,
      details: 'Không thể bật lại đơn giá đã ngừng; hãy tạo đơn giá mới nếu cần.',
      confirmText: 'Ngừng áp dụng'
    });
    if (!ok) return;
    this.payrollApi.deactivatePolicy(p.id).subscribe({
      next: () => {
        this.toast.success('Đã ngừng áp dụng đơn giá.');
        this.loadPolicies();
        this.loadPreview();
      },
      error: err => this.toast.error(err?.error?.message || 'Không thể ngừng áp dụng đơn giá.')
    });
  }

  formatCurrency(amount: number | null | undefined): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(amount ?? 0));
  }
}
