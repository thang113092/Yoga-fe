import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MembershipApi, MembershipPlan, OrderResp, PaymentMethod, PaymentReq, PaymentResp, PosApi, CreateOrderReq } from '@yoga/mod-membership/data-access';
import { AuthService, UserApi, UserResponse } from '@yoga/platform/auth';
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

  protected searchQuery = '';
  protected readonly searchResults = signal<UserResponse[]>([]);
  protected readonly isSearchingDropdown = signal(false);
  protected readonly isSearchDropdownOpen = signal(false);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  protected studentPhone = '';
  protected studentEmail = '';
  protected studentName = '';
  protected readonly isLookingUpStudent = signal(false);
  protected readonly studentLookupStatus = signal<'idle' | 'found' | 'not_found'>('idle');
  protected readonly resolvedStudent = signal<UserResponse | null>(null);
  protected selectedPlanId = signal<string | null>(null);
  protected paymentMethod = signal<PaymentMethod>('CASH');
  protected cashierNotes = '';
  protected transactionReference = '';
  protected readonly selectedPlan = computed(() => this.plans().find(p => p.id === this.selectedPlanId()) ?? null);
  private lookupDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.student-quick-search')) {
      this.isSearchDropdownOpen.set(false);
    }
  }

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

  onSearchQueryChange(val: string): void {
    this.searchQuery = val;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }
    const trimmed = val.trim();
    if (!trimmed) {
      this.searchResults.set([]);
      this.isSearchDropdownOpen.set(false);
      this.isSearchingDropdown.set(false);
      return;
    }
    this.isSearchDropdownOpen.set(true);
    this.isSearchingDropdown.set(true);
    this.searchDebounceTimer = setTimeout(() => {
      this.executeStudentSearch(trimmed);
    }, 300);
  }

  executeStudentSearch(query: string): void {
    const trimmed = query.trim();
    const branchId = this.selectedBranchId;
    if (!trimmed || !branchId) {
      this.searchResults.set([]);
      this.isSearchingDropdown.set(false);
      return;
    }
    this.isSearchingDropdown.set(true);
    this.isSearchDropdownOpen.set(true);
    this.userApi.searchStudents(trimmed, branchId, 10).subscribe({
      next: list => {
        this.searchResults.set(list);
        this.isSearchingDropdown.set(false);
        this.isSearchDropdownOpen.set(true);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearchingDropdown.set(false);
      }
    });
  }

  selectStudentFromSearch(student: UserResponse): void {
    this.resolvedStudent.set(student);
    this.studentName = student.fullName;
    this.studentPhone = student.phone || '';
    this.studentEmail = student.email || '';
    this.studentLookupStatus.set('found');
    this.searchQuery = `${student.fullName} (${student.phone})`;
    this.isSearchDropdownOpen.set(false);
    this.searchResults.set([]);
  }

  clearSearchBox(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
    this.isSearchDropdownOpen.set(false);
    this.isSearchingDropdown.set(false);
  }

  onPhoneChange(val: string): void {
    this.studentPhone = val;
    this.onStudentFieldChange('phone');
  }

  onEmailChange(val: string): void {
    this.studentEmail = val;
    this.onStudentFieldChange('email');
  }

  private onStudentFieldChange(source: 'phone' | 'email'): void {
    if (this.lookupDebounceTimer) {
      clearTimeout(this.lookupDebounceTimer);
      this.lookupDebounceTimer = null;
    }
    const phone = this.studentPhone.trim();
    const email = this.studentEmail.trim();

    if (!phone && !email) {
      this.studentName = '';
      this.resolvedStudent.set(null);
      this.studentLookupStatus.set('idle');
      return;
    }

    this.lookupDebounceTimer = setTimeout(() => {
      this.triggerLookup(source);
    }, 400);
  }

  triggerLookup(source?: 'phone' | 'email'): void {
    const branchId = this.selectedBranchId;
    if (!branchId) return;

    const phone = this.studentPhone.trim();
    const email = this.studentEmail.trim();

    if (source === 'phone' && phone.length < 8 && !email) return;
    if (source === 'email' && (!email.includes('@') || email.length < 5) && !phone) return;
    if (!phone && !email) {
      this.studentName = '';
      this.resolvedStudent.set(null);
      this.studentLookupStatus.set('idle');
      return;
    }

    const current = this.resolvedStudent();
    if (current) {
      const matchPhone = phone && current.phone === phone;
      const matchEmail = email && current.email?.toLowerCase() === email.toLowerCase();
      if ((phone && matchPhone) || (email && matchEmail)) return;
    }

    this.isLookingUpStudent.set(true);
    const lookup$ = source === 'email' && email
      ? this.userApi.lookupStudent({ email, branchId })
      : phone
        ? this.userApi.lookupStudent(phone, branchId)
        : this.userApi.lookupStudent({ email, branchId });

    lookup$.subscribe({
      next: student => {
        this.isLookingUpStudent.set(false);
        this.resolvedStudent.set(student);
        this.studentLookupStatus.set('found');
        this.studentName = student.fullName;
        if (student.phone && (!this.studentPhone || source === 'email')) {
          this.studentPhone = student.phone;
        }
        if (student.email && (!this.studentEmail || source === 'phone')) {
          this.studentEmail = student.email;
        }
      },
      error: () => {
        this.isLookingUpStudent.set(false);
        this.resolvedStudent.set(null);
        this.studentLookupStatus.set('not_found');
        this.studentName = '';
      }
    });
  }

  handleCheckout(): void {
    if (this.isProcessing()) return;
    const draft = this.pendingCheckout();
    if (draft) { this.isProcessing.set(true); this.errorMessage.set(null); this.completeCheckout(draft); return; }
    const plan = this.selectedPlan(); const actorId = this.auth.currentUserId();
    const phone = this.studentPhone.trim();
    const email = this.studentEmail.trim();
    if (!plan || !actorId || !this.selectedBranchId || (!phone && !email)) {
      this.errorMessage.set('Chọn chi nhánh, gói tập và nhập số điện thoại hoặc email học viên.');
      return;
    }
    if (this.paymentMethod() !== 'CASH' && !this.transactionReference.trim()) {
      this.errorMessage.set('Nhập mã chứng từ thanh toán đã được xác nhận.');
      return;
    }
    this.isProcessing.set(true); this.errorMessage.set(null);
    const branchId = this.selectedBranchId;
    const method = this.paymentMethod(); const reference = this.transactionReference.trim() || undefined; const notes = this.cashierNotes;

    const currentStudent = this.resolvedStudent();
    if (currentStudent && ((phone && currentStudent.phone === phone) || (email && currentStudent.email?.toLowerCase() === email.toLowerCase()))) {
      this.studentName = currentStudent.fullName;
      const checkoutDraft: CheckoutDraft = { actorId, key: crypto.randomUUID(), orderRequest: { branchId, studentId: currentStudent.id, planId: plan.id, cashierId: actorId, notes }, paymentRequest: { paymentMethod: method, idempotencyKey: crypto.randomUUID(), cashierId: actorId, transactionReference: reference, notes } };
      this.saveDraft(checkoutDraft); this.completeCheckout(checkoutDraft);
      return;
    }

    const lookup$ = phone
      ? this.userApi.lookupStudent(phone, branchId)
      : this.userApi.lookupStudent({ email, branchId });

    lookup$.subscribe({
      next: student => {
        this.studentName = student.fullName;
        if (student.phone) this.studentPhone = student.phone;
        if (student.email) this.studentEmail = student.email;
        this.resolvedStudent.set(student);
        this.studentLookupStatus.set('found');
        const checkoutDraft: CheckoutDraft = { actorId, key: crypto.randomUUID(), orderRequest: { branchId, studentId: student.id, planId: plan.id, cashierId: actorId, notes }, paymentRequest: { paymentMethod: method, idempotencyKey: crypto.randomUUID(), cashierId: actorId, transactionReference: reference, notes } };
        this.saveDraft(checkoutDraft); this.completeCheckout(checkoutDraft);
      }, error: err => this.fail(err, 'Không tìm thấy học viên đang hoạt động. Kiểm tra số điện thoại hoặc email học viên trước.')
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
  resetForm(): void { if (this.pendingCheckout() || this.isProcessing()) return; this.successReceipt.set(null); this.cashierNotes = ''; this.transactionReference = ''; this.studentPhone = ''; this.studentEmail = ''; this.studentName = ''; this.searchQuery = ''; this.searchResults.set([]); this.isSearchDropdownOpen.set(false); this.isSearchingDropdown.set(false); this.resolvedStudent.set(null); this.studentLookupStatus.set('idle'); }
}
