import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MembershipApi, MembershipPlan, OrderResp, PaymentMethod, PaymentReq, PaymentResp, PosApi, CreateOrderReq } from '@yoga/mod-membership/data-access';
import { AuthService, UserApi } from '@yoga/platform/auth';
import { ZenSelectComponent, ZenInputComponent } from '@yoga/platform/ui';
import { BranchApi, Branch } from '@yoga/mod-branch/data-access';
interface CheckoutDraft { actorId: string; key: string; orderRequest: CreateOrderReq; paymentRequest: Omit<PaymentReq, 'orderId'>; order?: OrderResp; }
@Component({ selector: 'yoga-pos-checkout', standalone: true, imports: [CommonModule, FormsModule, RouterModule, ZenSelectComponent, ZenInputComponent], templateUrl: './pos-checkout.component.html', styleUrl: './pos-checkout.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class PosCheckoutComponent implements OnInit {
  private readonly membershipApi = inject(MembershipApi);
  private readonly posApi = inject(PosApi);
  private readonly userApi = inject(UserApi);
  private readonly branchApi = inject(BranchApi);
  protected readonly auth = inject(AuthService);
  protected readonly plans = signal<readonly MembershipPlan[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly selectedBranch = computed(() => this.branches().find(b => b.id === this.branchId()) ?? null);
  private readonly branchId = signal('');
  protected get selectedBranchId(): string { return this.branchId(); }
  protected set selectedBranchId(value: string) { this.branchId.set(value); }
  protected readonly isLoadingPlans = signal(false);
  protected readonly isProcessing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successReceipt = signal<{ order: OrderResp; payment: PaymentResp } | null>(null);
  protected readonly pendingCheckout = signal<CheckoutDraft | null>(null);
  protected studentPhone = '';
  protected studentName = '';
  protected selectedPlanId = signal<string | null>(null);
  protected paymentMethod = signal<PaymentMethod>('CASH');
  protected cashierNotes = '';
  protected transactionReference = '';
  protected readonly selectedPlan = computed(() => this.plans().find(p => p.id === this.selectedPlanId()) ?? null);
  ngOnInit(): void { this.loadPlans(); }
  loadPlans(): void {
    this.isLoadingPlans.set(true); this.errorMessage.set(null);
    forkJoin([this.membershipApi.getActivePlans(), this.branchApi.getAll()]).subscribe({
      next: ([plans, branches]) => {
        this.plans.set(plans);
        this.branches.set(branches.filter(b => b.isActive && (this.auth.isSuperAdmin() || this.auth.branchIds().includes(b.id))));
        this.branchId.set(this.branches()[0]?.id ?? '');
        this.selectedPlanId.set(plans[0]?.id ?? null);
        this.restoreDraft(); this.isLoadingPlans.set(false);
      }, error: err => { this.errorMessage.set(err?.error?.message || 'Không tải được gói tập và chi nhánh.'); this.isLoadingPlans.set(false); }
    });
  }
  selectPlan(id: string): void { if (!this.pendingCheckout() && !this.isProcessing()) this.selectedPlanId.set(id); }
  setPaymentMethod(method: PaymentMethod): void { if (!this.pendingCheckout() && !this.isProcessing()) this.paymentMethod.set(method); }
  handleCheckout(): void {
    if (this.isProcessing()) return;
    const draft = this.pendingCheckout();
    if (draft) { this.isProcessing.set(true); this.errorMessage.set(null); this.completeCheckout(draft); return; }
    const plan = this.selectedPlan(); const actorId = this.auth.currentUserId();
    if (!plan || !actorId || !this.selectedBranchId || !this.studentPhone.trim()) { this.errorMessage.set('Chọn chi nhánh, gói tập và nhập số điện thoại học viên.'); return; }
    if (this.paymentMethod() !== 'CASH' && !this.transactionReference.trim()) { this.errorMessage.set('Nhập mã chứng từ thanh toán đã được xác nhận.'); return; }
    this.isProcessing.set(true); this.errorMessage.set(null);
    const branchId = this.selectedBranchId; const phone = this.studentPhone.trim();
    const method = this.paymentMethod(); const reference = this.transactionReference.trim() || undefined; const notes = this.cashierNotes;
    this.userApi.lookupStudent(phone, branchId).subscribe({
      next: student => {
        this.studentName = student.fullName;
        const draft: CheckoutDraft = { actorId, key: crypto.randomUUID(), orderRequest: { branchId, studentId: student.id, planId: plan.id, cashierId: actorId, notes }, paymentRequest: { paymentMethod: method, idempotencyKey: crypto.randomUUID(), cashierId: actorId, transactionReference: reference, notes } };
        this.saveDraft(draft); this.completeCheckout(draft);
      }, error: err => this.fail(err, 'Không tìm thấy học viên đang hoạt động. Kiểm tra số điện thoại hoặc tạo tài khoản học viên trước.')
    });
  }
  private completeCheckout(draft: CheckoutDraft): void {
    if (draft.actorId !== this.auth.currentUserId()) { this.fail(null, 'Phiên thu ngân đã thay đổi. Đăng nhập lại đúng tài khoản để đối soát giao dịch.'); return; }
    if (draft.order) { this.pay(draft); return; }
    this.posApi.createOrder(draft.orderRequest, draft.key).subscribe({ next: order => { const updated = { ...draft, order }; this.saveDraft(updated); this.pay(updated); }, error: err => this.fail(err, 'Chưa xác nhận được kết quả tạo đơn. Thử lại cùng giao dịch để tránh tạo trùng.') });
  }
  private pay(draft: CheckoutDraft): void {
    const order = draft.order!;
    this.posApi.processPayment({ ...draft.paymentRequest, orderId: order.orderId }).subscribe({
      next: payment => {
        if (payment.paymentStatus !== 'SUCCESS' || payment.orderId !== order.orderId) { this.fail(null, 'Thanh toán chưa được xác nhận.'); return; }
        this.successReceipt.set({ order, payment }); this.isProcessing.set(false); this.pendingCheckout.set(null);
        try { localStorage.removeItem(this.storageKey()); } catch { /* storage unavailable */ }
      }, error: err => this.fail(err, 'Chưa xác nhận được kết quả thanh toán. Thử lại cùng đơn và mã giao dịch; không thu tiền lần nữa.')
    });
  }
  private fail(err: any, fallback: string): void { this.errorMessage.set(err?.error?.message || fallback); this.isProcessing.set(false); }
  private storageKey(): string { return 'yoga_checkout_' + this.auth.currentUserId(); }
  private saveDraft(draft: CheckoutDraft): void { this.pendingCheckout.set(draft); try { localStorage.setItem(this.storageKey(), JSON.stringify(draft)); } catch { /* retry remains available in this tab */ } }
  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(this.storageKey()); if (!raw) return;
      const draft = JSON.parse(raw) as CheckoutDraft;
      if (draft.actorId !== this.auth.currentUserId() || !draft.key || !draft.orderRequest?.studentId || !draft.paymentRequest?.idempotencyKey) return;
      this.pendingCheckout.set(draft); this.branchId.set(draft.orderRequest.branchId); this.selectedPlanId.set(draft.orderRequest.planId); this.paymentMethod.set(draft.paymentRequest.paymentMethod);
      this.errorMessage.set('Có giao dịch chưa được xác nhận. Thử lại để đối soát cùng đơn; không thu thêm tiền.');
    } catch { this.errorMessage.set('Không đọc được giao dịch đang chờ. Liên hệ quản lý để đối soát trước khi thu tiền.'); }
  }
  resetForm(): void { if (this.pendingCheckout() || this.isProcessing()) return; this.successReceipt.set(null); this.cashierNotes = ''; this.transactionReference = ''; this.studentPhone = ''; this.studentName = ''; }
}
