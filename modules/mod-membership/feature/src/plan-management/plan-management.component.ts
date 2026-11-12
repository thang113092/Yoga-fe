import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '@yoga/platform/auth';
import { ZEN_UI, ZenConfirmService, ZenToastService } from '@yoga/platform/ui';
import {
  CreatePlanReq,
  MembershipApi,
  MembershipPlan,
  PlanType,
  PosApi,
  SelfCheckoutApi,
  StudentOrderHistoryResp,
  UpdatePlanReq
} from '@yoga/mod-membership/data-access';
import { PlanPurchaseComponent } from '../plan-purchase/plan-purchase.component';

@Component({
  selector: 'yoga-plan-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PlanPurchaseComponent,
    ...ZEN_UI
  ],
  templateUrl: './plan-management.component.html',
  styleUrl: './plan-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanManagementComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly membershipApi = inject(MembershipApi);
  private readonly confirmService = inject(ZenConfirmService);
  private readonly toast = inject(ZenToastService);
  private readonly posApi = inject(PosApi);
  private readonly selfCheckout = inject(SelfCheckoutApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Student online purchase
  protected readonly purchasePlan = signal<MembershipPlan | null>(null);
  /** The student's unpaid membership order: it blocks buying another plan until paid or cancelled. */
  protected readonly pendingOrder = signal<StudentOrderHistoryResp | null>(null);
  protected readonly isCancellingPending = signal(false);

  protected readonly planTypeOptions = [
    { value: 'TIME_BASED', label: 'Theo thời hạn (ngày/tháng)' },
    { value: 'SESSION_BASED', label: 'Theo số buổi tập (lượt)' },
    { value: 'COMBO', label: 'Kết hợp cả ngày và số buổi' }
  ];

  // Data signals
  protected readonly plans = signal<MembershipPlan[]>([]);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Filters
  protected readonly searchQuery = signal<string>('');
  protected readonly filterScope = signal<'ALL' | 'ALL_BRANCHES' | 'SINGLE_BRANCH'>('ALL');

  // Modal State for Create/Edit
  protected readonly isModalOpen = signal<boolean>(false);
  protected readonly isEditing = signal<boolean>(false);
  protected readonly editingPlanId = signal<string | null>(null);
  protected readonly isSubmitting = signal<boolean>(false);

  // Form Signals
  protected readonly formCode = signal<string>('');
  protected readonly formName = signal<string>('');
  protected readonly formDescription = signal<string>('');
  protected readonly formPrice = signal<number>(1500000);
  protected readonly formPlanType = signal<PlanType>('TIME_BASED');
  protected readonly formDurationDays = signal<number | null>(30);
  protected readonly formTotalSessions = signal<number | null>(null);
  protected readonly formIsAllBranches = signal<boolean>(false);
  protected readonly formIsActive = signal<boolean>(true);

  // Delete Confirmation State
  protected readonly planToDelete = signal<MembershipPlan | null>(null);
  protected readonly isDeleting = signal<boolean>(false);

  // Computed Filtered List
  protected readonly filteredPlans = computed(() => {
    let list = this.plans();
    const query = this.searchQuery().trim().toLowerCase();
    const scope = this.filterScope();

    if (query) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      );
    }

    if (scope === 'ALL_BRANCHES') {
      list = list.filter(p => p.isAllBranches);
    } else if (scope === 'SINGLE_BRANCH') {
      list = list.filter(p => !p.isAllBranches);
    }

    return list;
  });

  ngOnInit(): void {
    this.loadPlans();
    if (this.auth.isStudent()) {
      // PayOS sends the student back here with its own query parameters; the status is read from the backend.
      const fromGateway = this.route.snapshot.queryParamMap.has('orderCode');
      if (fromGateway) void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      this.loadPendingOrder(fromGateway);
    }
  }

  protected loadPendingOrder(resume = false): void {
    const me = this.auth.currentUserId();
    if (!me) return;
    this.posApi.getStudentOrders(me).subscribe({
      next: orders => {
        const pending = orders.find(o => o.status === 'PENDING' && o.items.some(i => i.itemType === 'MEMBERSHIP_PLAN')) ?? null;
        this.pendingOrder.set(pending);
        if (pending && resume) this.resumePending(true);
      },
      error: () => this.pendingOrder.set(null)
    });
  }

  protected buy(plan: MembershipPlan): void {
    this.purchasePlan.set(plan);
  }

  /** Pending orders are paid on the shared checkout page; coming back from the gateway asks it for the status. */
  protected resumePending(checkGateway = false): void {
    const pending = this.pendingOrder();
    if (!pending) return;
    void this.router.navigate(['/membership/checkout', pending.orderId], checkGateway ? { queryParams: { check: 1 } } : {});
  }

  protected closePurchase(): void {
    this.purchasePlan.set(null);
  }

  protected async cancelPending(): Promise<void> {
    const pending = this.pendingOrder();
    if (!pending || this.isCancellingPending()) return;
    const confirmed = await this.confirmService.confirm({
      title: 'Hủy đơn chờ thanh toán',
      message: `Hủy đơn ${pending.items[0]?.itemName ?? ''}? Mã thanh toán của đơn sẽ không dùng được nữa.`,
      confirmText: 'Hủy đơn',
      cancelText: 'Giữ đơn',
      type: 'cancel'
    });
    if (!confirmed) return;
    this.isCancellingPending.set(true);
    this.selfCheckout.cancelOrder(pending.orderId).subscribe({
      next: () => { this.isCancellingPending.set(false); this.toast.success('Đã hủy đơn chờ thanh toán.'); this.loadPendingOrder(); },
      error: err => {
        this.isCancellingPending.set(false);
        this.toast.error(err?.error?.message || 'Chưa hủy được đơn. Nếu bạn vừa chuyển khoản, vui lòng chờ hệ thống xác nhận.');
        this.loadPendingOrder();
      }
    });
  }

  loadPlans(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Super Admin gets all plans (including inactive); other roles get active plans
    const request$ = this.auth.isSuperAdmin()
      ? this.membershipApi.getAllPlans(true)
      : this.membershipApi.getActivePlans();

    request$.subscribe({
      next: (data) => {
        this.plans.set(data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(err?.message || 'Không thể tải danh sách gói thẻ tập.');
        this.isLoading.set(false);
      }
    });
  }

  // --- Actions (Restricted to SUPER_ADMIN) ---

  openCreateModal(): void {
    if (!this.auth.isSuperAdmin()) return;
    this.isEditing.set(false);
    this.editingPlanId.set(null);
    this.formCode.set('');
    this.formName.set('');
    this.formDescription.set('');
    this.formPrice.set(1500000);
    this.formPlanType.set('TIME_BASED');
    this.formDurationDays.set(30);
    this.formTotalSessions.set(null);
    this.formIsAllBranches.set(false);
    this.formIsActive.set(true);
    this.isModalOpen.set(true);
  }

  openEditModal(plan: MembershipPlan): void {
    if (!this.auth.isSuperAdmin()) return;
    this.isEditing.set(true);
    this.editingPlanId.set(plan.id);
    this.formCode.set(plan.code);
    this.formName.set(plan.name);
    this.formDescription.set(plan.description || '');
    this.formPrice.set(plan.price);
    this.formPlanType.set(plan.planType);
    this.formDurationDays.set(plan.durationDays ?? null);
    this.formTotalSessions.set(plan.totalSessions ?? null);
    this.formIsAllBranches.set(plan.isAllBranches);
    this.formIsActive.set(plan.isActive);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  submitPlan(): void {
    if (!this.auth.isSuperAdmin()) return;

    const name = this.formName().trim();
    if (!name) {
      this.errorMessage.set('Vui lòng nhập tên gói thẻ tập.');
      return;
    }

    if (this.formPrice() < 0) {
      this.errorMessage.set('Giá bán không được âm.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    if (this.isEditing() && this.editingPlanId()) {
      const updateReq: UpdatePlanReq = {
        name,
        description: this.formDescription().trim() || undefined,
        price: this.formPrice(),
        isAllBranches: this.formIsAllBranches(),
        isActive: this.formIsActive()
      };

      this.membershipApi.updatePlan(this.editingPlanId()!, updateReq).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.toast.success('Đã cập nhật thông tin gói thẻ tập thành công.');
          this.loadPlans();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toast.error(err?.message || 'Lỗi khi cập nhật gói thẻ.');
        }
      });
    } else {
      const code = this.formCode().trim().toUpperCase();
      if (!code) {
        this.toast.warning('Vui lòng nhập mã định danh gói thẻ.');
        this.isSubmitting.set(false);
        return;
      }

      const createReq: CreatePlanReq = {
        code,
        name,
        description: this.formDescription().trim() || undefined,
        price: this.formPrice(),
        planType: this.formPlanType(),
        durationDays: this.formDurationDays(),
        totalSessions: this.formTotalSessions(),
        isAllBranches: this.formIsAllBranches()
      };

      this.membershipApi.createPlan(createReq).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.closeModal();
          this.toast.success('Đã tạo mới gói thẻ tập thành công.');
          this.loadPlans();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.toast.error(err?.message || 'Lỗi khi tạo mới gói thẻ.');
        }
      });
    }
  }

  async confirmDelete(plan: MembershipPlan): Promise<void> {
    if (!this.auth.isSuperAdmin()) return;

    const confirmed = await this.confirmService.confirmDelete({
      title: 'Xác Nhận Xóa Gói Thẻ',
      itemName: plan.name,
      details: 'Nếu đã có học viên đăng ký, hệ thống sẽ tự động chuyển gói sang trạng thái tạm ngừng để bảo toàn lịch sử giao dịch.'
    });

    if (confirmed) {
      this.executeDelete(plan);
    }
  }

  cancelDelete(): void {
    this.planToDelete.set(null);
  }

  executeDelete(plan: MembershipPlan): void {
    if (!plan || !this.auth.isSuperAdmin()) return;

    this.isDeleting.set(true);
    this.membershipApi.deletePlan(plan.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.planToDelete.set(null);
        this.toast.success(`Đã xóa hoặc ngừng phát hành gói thẻ ${plan.name}.`);
        this.loadPlans();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.toast.error(err?.message || 'Không thể xóa gói thẻ tập.');
      }
    });
  }

  onPlanTypeChange(type: PlanType): void {
    this.formPlanType.set(type);
    if (type === 'TIME_BASED') {
      if (!this.formDurationDays()) this.formDurationDays.set(30);
      this.formTotalSessions.set(null);
    } else if (type === 'SESSION_BASED') {
      if (!this.formTotalSessions()) this.formTotalSessions.set(10);
      this.formDurationDays.set(null);
    } else if (type === 'COMBO') {
      if (!this.formDurationDays()) this.formDurationDays.set(90);
      if (!this.formTotalSessions()) this.formTotalSessions.set(30);
    }
  }
}
