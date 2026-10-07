import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CheckoutQuote, MembershipResp, MembershipApi, MembershipPlan, OrderResp, PaymentMethod, PaymentReq, PaymentResp, PosApi, CreateOrderReq } from '@yoga/mod-membership/data-access';
import { AuthService, UserApi, UserResponse } from '@yoga/platform/auth';
import { ZenSelectComponent, ZenInputComponent } from '@yoga/platform/ui';
import { BranchApi, Branch } from '@yoga/mod-branch/data-access';
interface CheckoutDraft { actorId: string; key: string; orderRequest: CreateOrderReq; paymentRequest: Omit<PaymentReq, 'orderId'>; order?: OrderResp; }
@Component({ selector: 'yoga-pos-checkout', standalone: true, imports: [CommonModule, FormsModule, RouterModule, ZenSelectComponent, ZenInputComponent], templateUrl: './pos-checkout.component.html', styleUrl: './pos-checkout.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class PosCheckoutComponent implements OnInit, OnDestroy {
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
  protected set selectedBranchId(value: string) { if (this.pendingCheckout() || this.isProcessing()) return; this.branchId.set(value); this.clearSelectedStudent(); }
  protected readonly isLoadingPlans = signal(false);
  protected readonly isProcessing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successReceipt = signal<{ order: OrderResp; payment: PaymentResp } | null>(null);
  protected readonly pendingCheckout = signal<CheckoutDraft | null>(null);
  protected readonly copiedCode = signal(false);
  private copyTimeout: ReturnType<typeof setTimeout> | null = null;

  protected searchQuery = '';
  protected readonly searchResults = signal<UserResponse[]>([]);
  protected readonly isSearchingDropdown = signal(false);
  protected readonly isSearchDropdownOpen = signal(false);
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  protected studentPhone = '';
  protected studentEmail = '';
  protected studentName = '';
  protected readonly studentLookupStatus = signal<'idle' | 'found' | 'not_found'>('idle');
  protected readonly resolvedStudent = signal<UserResponse | null>(null);
  protected selectedPlanId = signal<string | null>(null);
  protected paymentMethod = signal<PaymentMethod>('CASH');
  protected cashierNotes = '';
  protected transactionReference = '';
  protected readonly selectedPlan = computed(() => this.plans().find(p => p.id === this.selectedPlanId()) ?? null);
  protected readonly quote = signal<CheckoutQuote | null>(null);
  protected readonly isLoadingQuote = signal(false);
  protected readonly studentMemberships = signal<MembershipResp[]>([]);
  protected readonly pendingMembership = computed(() => this.studentMemberships().find(m => m.status === 'PENDING_PAYMENT') ?? null);
  protected readonly currentMembership = computed(() => this.quote()?.currentMembership ?? this.studentMemberships().find(m => ['ACTIVE', 'FROZEN', 'EXPIRED'].includes(m.status)) ?? null);
  protected readonly useCreditAdjustment = signal(false);
  protected readonly adjustedCredit = signal<number | null>(null);
  protected adjustmentReason = '';
  protected readonly effectiveCredit = computed(() => this.useCreditAdjustment() ? (this.adjustedCredit() ?? 0) : (this.quote()?.credit ?? 0));
  protected readonly adjustmentInvalid = computed(() => this.useCreditAdjustment() && (!this.currentMembership() || this.adjustedCredit() == null || !Number.isInteger(this.adjustedCredit()) || this.adjustedCredit()! < 0 || this.adjustedCredit()! > Math.min(this.selectedPlan()?.price ?? 0, this.quote()?.contractValue ?? this.currentMembership()?.purchasedPrice ?? 0)));
  protected readonly amountDue = computed(() => this.pendingCheckout()?.order?.totalAmount ?? this.pendingCheckout()?.orderRequest.expectedTotal ?? (this.quote() ? (this.selectedPlan()?.price ?? 0) - this.effectiveCredit() : 0));
  private quoteVersion = 0;
  private searchVersion = 0;

  refreshQuote(): void {
    const student = this.resolvedStudent(); const plan = this.selectedPlan(); const branch = this.selectedBranchId;
    const version = ++this.quoteVersion;
    this.quote.set(null); this.useCreditAdjustment.set(false); this.adjustedCredit.set(null); this.adjustmentReason = '';
    if (!student || !plan || !branch || this.pendingCheckout()) { this.isLoadingQuote.set(false); return; }
    this.isLoadingQuote.set(true); this.errorMessage.set(null);
    const quote$ = this.posApi.getCheckoutQuote(student.id, plan.id, branch).pipe(catchError(err => {
      if (version === this.quoteVersion) this.errorMessage.set(err?.error?.message || 'Không tải được báo giá. Vui lòng thử lại trước khi thanh toán.');
      return of(null);
    }));
    forkJoin([quote$, this.membershipApi.getStudentMemberships(student.id)]).subscribe({
      next: ([quote, memberships]) => {
        if (version !== this.quoteVersion) return;
        this.quote.set(quote); this.studentMemberships.set(memberships); this.isLoadingQuote.set(false);
      },
      error: err => { if (version !== this.quoteVersion) return; this.isLoadingQuote.set(false); this.fail(err, 'Không tải được thông tin thẻ. Vui lòng thử lại trước khi thanh toán.'); }
    });
  }

  protected readonly currentPlanName = computed(() => this.quote()?.currentPlanName ?? this.plans().find(p => p.id === this.currentMembership()?.planId)?.name ?? 'Gói ngừng bán');

  membershipStatusLabel(status: string): string {
    return ({ ACTIVE: 'Đang sử dụng', FROZEN: 'Đang bảo lưu', EXPIRED: 'Hết hạn', PENDING_PAYMENT: 'Chờ thanh toán', REPLACED: 'Đã thay thế', CANCELLED: 'Đã hủy', TRANSFERRED: 'Đã chuyển nhượng' } as Record<string, string>)[status] ?? status;
  }

  paymentMethodLabel(method?: string): string {
    switch (method) {
      case 'CASH': return 'Tiền mặt';
      case 'POS_CARD': return 'Quẹt thẻ máy POS';
      case 'BANK_TRANSFER_QR': return 'Chuyển khoản QR ngân hàng';
      default: return method || '—';
    }
  }

  copyPassCode(code?: string): void {
    if (!code) return;
    navigator.clipboard?.writeText(code).then(() => {
      this.copiedCode.set(true);
      if (this.copyTimeout) clearTimeout(this.copyTimeout);
      this.copyTimeout = setTimeout(() => this.copiedCode.set(false), 2000);
    }).catch(() => { /* fallback */ });
  }

  printReceipt(): void {
    window.print();
  }

  clearSelectedStudent(): void {
    if (this.pendingCheckout() || this.isProcessing()) return;
    ++this.quoteVersion; ++this.searchVersion;
    if (this.searchDebounceTimer) { clearTimeout(this.searchDebounceTimer); this.searchDebounceTimer = null; }
    this.quote.set(null); this.studentMemberships.set([]); this.isLoadingQuote.set(false);
    this.resolvedStudent.set(null); this.studentLookupStatus.set('idle');
    this.studentName = ''; this.studentPhone = ''; this.studentEmail = ''; this.clearSearchBox();
  }

  cancelPendingCheckout(): void {
    if (this.isProcessing()) return;
    const draft = this.pendingCheckout(); const membership = this.pendingMembership();
    if (!draft && !membership) return;
    this.isProcessing.set(true);
    const cancel = (orderId: string) => this.posApi.cancelPendingOrder(orderId).subscribe({
      next: () => { this.pendingCheckout.set(null); try { localStorage.removeItem(this.storageKey()); } catch {} this.isProcessing.set(false); this.refreshQuote(); },
      error: err => this.fail(err, 'Chưa hủy được đơn. Cần đối soát trước khi tạo giao dịch khác.')
    });
    if (draft?.order) { cancel(draft.order.orderId); return; }
    if (draft) {
      this.posApi.createOrder(draft.orderRequest, draft.key).subscribe({ next: order => { this.saveDraft({ ...draft, order }); cancel(order.orderId); }, error: err => this.fail(err, 'Chưa xác định được kết quả tạo đơn. Vui lòng đối soát.') });
      return;
    }
    this.posApi.getStudentOrders(this.resolvedStudent()!.id).subscribe({
      next: orders => { const order = orders.find(o => o.status === 'PENDING' && o.items.some(i => i.membershipCode === membership!.membershipCode)); if (order) cancel(order.orderId); else this.fail(null, 'Không tìm thấy đơn chờ. Vui lòng tải lại thông tin.'); },
      error: err => this.fail(err, 'Không tải được đơn đang chờ.')
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.student-quick-search')) {
      this.isSearchDropdownOpen.set(false);
    }
  }

  ngOnInit(): void { this.loadPlans(); }
  ngOnDestroy(): void {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    if (this.copyTimeout) clearTimeout(this.copyTimeout);
    ++this.quoteVersion; ++this.searchVersion;
  }
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
  selectPlan(id: string): void { if (!this.pendingCheckout() && !this.isProcessing()) { this.selectedPlanId.set(id); this.refreshQuote(); } }
  setPaymentMethod(method: PaymentMethod): void { if (!this.pendingCheckout() && !this.isProcessing()) this.paymentMethod.set(method); }

  onSearchQueryChange(val: string): void {
    if (this.pendingCheckout() || this.isProcessing()) return;
    this.clearSelectedStudent();
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
    if (this.pendingCheckout() || this.isProcessing()) return;
    const trimmed = query.trim();
    const branchId = this.selectedBranchId;
    if (!trimmed || !branchId) {
      this.searchResults.set([]);
      this.isSearchingDropdown.set(false);
      return;
    }
    this.isSearchingDropdown.set(true);
    this.isSearchDropdownOpen.set(true);
    const version = ++this.searchVersion;
    this.userApi.searchStudents(trimmed, branchId, 10).subscribe({
      next: list => {
        if (version !== this.searchVersion) return;
        this.searchResults.set(list);
        this.isSearchingDropdown.set(false);
        this.isSearchDropdownOpen.set(true);
      },
      error: () => {
        if (version !== this.searchVersion) return;
        this.searchResults.set([]);
        this.isSearchingDropdown.set(false);
      }
    });
  }

  selectStudentFromSearch(student: UserResponse): void {
    if (this.pendingCheckout() || this.isProcessing()) return;
    ++this.searchVersion;
    this.studentMemberships.set([]);
    this.resolvedStudent.set(student);
    this.studentName = student.fullName;
    this.studentPhone = student.phone || '';
    this.studentEmail = student.email || '';
    this.studentLookupStatus.set('found');
    this.searchQuery = student.fullName;
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.isSearchingDropdown.set(false);
    this.isSearchDropdownOpen.set(false);
    this.searchResults.set([]);
    this.refreshQuote();
  }

  clearSearchBox(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
    this.isSearchDropdownOpen.set(false);
    this.isSearchingDropdown.set(false);
  }

  handleCheckout(): void {
    if (this.isProcessing()) return;
    const draft = this.pendingCheckout();
    if (draft) { this.isProcessing.set(true); this.errorMessage.set(null); this.completeCheckout(draft); return; }
    const plan = this.selectedPlan(); const student = this.resolvedStudent();
    const quote = this.quote(); const actorId = this.auth.currentUserId();
    if (!plan || !student || !actorId || !this.selectedBranchId || !quote || this.isLoadingQuote() || quote.issue) {
      this.errorMessage.set(quote?.issue || 'Chọn học viên, gói thẻ và tải báo giá trước khi thanh toán.'); return;
    }
    if (this.adjustmentInvalid() || this.useCreditAdjustment() && !this.adjustmentReason.trim()) {
      this.errorMessage.set('Nhập giá trị điều chỉnh hợp lệ và lý do phê duyệt.'); return;
    }
    if (this.amountDue() > 0 && this.paymentMethod() !== 'CASH' && !this.transactionReference.trim()) {
      this.errorMessage.set('Nhập mã chứng từ thanh toán đã được xác nhận.'); return;
    }
    this.isProcessing.set(true); this.errorMessage.set(null);
    const notes = this.cashierNotes;
    const checkoutDraft: CheckoutDraft = {
      actorId, key: crypto.randomUUID(),
      orderRequest: { branchId: this.selectedBranchId, studentId: student.id, planId: plan.id, cashierId: actorId, notes,
        replacesMembershipId: quote.currentMembership?.id, expectedCredit: quote.credit, expectedTotal: this.amountDue(), adjustedCredit: this.useCreditAdjustment() ? Math.trunc(this.adjustedCredit()!) : undefined, adjustmentReason: this.useCreditAdjustment() ? this.adjustmentReason.trim() : undefined },
      paymentRequest: { paymentMethod: this.amountDue() === 0 ? 'CASH' : this.paymentMethod(), idempotencyKey: crypto.randomUUID(), cashierId: actorId, transactionReference: this.transactionReference.trim() || undefined, notes }
    };
    this.saveDraft(checkoutDraft); this.completeCheckout(checkoutDraft);
  }
  private completeCheckout(draft: CheckoutDraft): void {
    if (draft.actorId !== this.auth.currentUserId()) { this.fail(null, 'Phiên thu ngân đã thay đổi. Đăng nhập lại đúng tài khoản để đối soát giao dịch.'); return; }
    if (draft.order) { this.pay(draft); return; }
    this.posApi.createOrder(draft.orderRequest, draft.key).subscribe({ next: order => { const updated = { ...draft, order }; this.saveDraft(updated); this.pay(updated); }, error: err => {
      if ([400, 403, 404, 409].includes(err?.status)) {
        this.pendingCheckout.set(null); try { localStorage.removeItem(this.storageKey()); } catch {}
        this.isProcessing.set(false); this.refreshQuote();
      }
      this.fail(err, 'Chưa xác nhận được kết quả tạo đơn. Thử lại cùng giao dịch để tránh tạo trùng.');
    } });
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
  resetForm(): void {
    if (this.pendingCheckout() || this.isProcessing()) return;
    this.successReceipt.set(null);
    this.copiedCode.set(false);
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
      this.copyTimeout = null;
    }
    this.cashierNotes = '';
    this.transactionReference = '';
    this.studentPhone = '';
    this.studentEmail = '';
    this.studentName = '';
    this.searchQuery = '';
    this.searchResults.set([]);
    this.isSearchDropdownOpen.set(false);
    this.isSearchingDropdown.set(false);
    this.resolvedStudent.set(null);
    this.studentLookupStatus.set('idle');
    ++this.quoteVersion;
    this.quote.set(null);
    this.studentMemberships.set([]);
    this.isLoadingQuote.set(false);
    this.useCreditAdjustment.set(false);
    this.adjustedCredit.set(null);
    this.adjustmentReason = '';
  }
}
