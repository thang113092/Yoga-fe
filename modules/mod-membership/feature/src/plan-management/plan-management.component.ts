import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '@yoga/platform/auth';
import {
  ZenSelectComponent,
  ZenInputComponent,
  ZenSearchComponent,
  ZenConfirmService,
  ZenToastService
} from '@yoga/platform/ui';
import {
  CreatePlanReq,
  MembershipApi,
  MembershipPlan,
  PlanType,
  UpdatePlanReq
} from '@yoga/mod-membership/data-access';

@Component({
  selector: 'yoga-plan-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ZenSelectComponent,
    ZenInputComponent,
    ZenSearchComponent
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
