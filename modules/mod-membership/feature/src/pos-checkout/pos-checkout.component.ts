import { ChangeDetectionStrategy, Component, computed, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { CheckoutQuote, MembershipResp, MembershipApi, MembershipPlan, OnlinePaymentResp, OrderResp, PaymentMethod, PaymentReq, PaymentResp, PosApi, CreateOrderReq } from '@yoga/mod-membership/data-access';
import { AuthService, UserApi, UserResponse } from '@yoga/platform/auth';
import { QrCodeComponent } from '@yoga/platform/api';
import { ZEN_UI } from '@yoga/platform/ui';
import { BranchApi, Branch } from '@yoga/mod-branch/data-access';
import { CourseApi, CourseClass } from '@yoga/mod-schedule/data-access';
/** What the counter sells: a membership plan, or a seat in a whole course. */
type ItemKind = 'PLAN' | 'COURSE';
/**
 * A checkout that may not be confirmed yet; kept in localStorage so a lost response is retried, never collected twice.
 * Course drafts are saved only once the enrollment (and so its order) exists; `orderRequest.planId` then holds the class id.
 */
interface CheckoutDraft { actorId: string; key: string; kind?: ItemKind; orderRequest: CreateOrderReq; paymentRequest: Omit<PaymentReq, 'orderId'>; order?: OrderResp; }
const ONLINE_POLL_MS = 3000;
/** Minimum gap between automatic gateway checks once a VietQR has run out of time. */
const EXPIRY_REFRESH_MS = 5000;
@Component({ selector: 'yoga-pos-checkout', standalone: true, imports: [CommonModule, FormsModule, RouterModule, QrCodeComponent, ...ZEN_UI], templateUrl: './pos-checkout.component.html', styleUrl: './pos-checkout.component.scss', changeDetection: ChangeDetectionStrategy.OnPush })
export class PosCheckoutComponent implements OnInit, OnDestroy {
  private readonly membershipApi = inject(MembershipApi);
  private readonly posApi = inject(PosApi);
  private readonly userApi = inject(UserApi);
  private readonly branchApi = inject(BranchApi);
  private readonly courseApi = inject(CourseApi);
  private readonly route = inject(ActivatedRoute);
  /** A course chosen on the Courses page ("Ghi danh"), selected once the branch's courses are loaded. */
  private preselectCourseId: string | null = null;
  protected readonly auth = inject(AuthService);
  protected readonly plans = signal<readonly MembershipPlan[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly selectedBranch = computed(() => this.branches().find(b => b.id === this.branchId()) ?? null);
  private readonly branchId = signal('');
  protected get selectedBranchId(): string { return this.branchId(); }
  protected set selectedBranchId(value: string) {
    if (this.pendingCheckout() || this.isProcessing()) return;
    this.branchId.set(value); this.clearSelectedStudent();
    if (this.itemKind() === 'COURSE') this.selectPlan(this.plans()[0]?.id ?? '');
    this.loadCourses();
  }
  protected readonly isLoadingPlans = signal(false);
  protected readonly isProcessing = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successReceipt = signal<{ order: OrderResp; payment: PaymentResp; kind?: ItemKind } | null>(null);
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
  // Courses open for enrollment at the selected branch, sold from the same checkout as plans.
  protected readonly itemKind = signal<ItemKind>('PLAN');
  protected readonly courseClasses = signal<CourseClass[]>([]);
  protected readonly isLoadingCourses = signal(false);
  protected readonly selectedCourseId = signal<string | null>(null);
  protected readonly selectedCourse = computed(() => this.courseClasses().find(c => c.id === this.selectedCourseId()) ?? null);
  /** Name of what is being sold; a restored course draft may refer to a class no longer listed. */
  protected readonly itemName = computed(() => this.pendingCheckout()?.order?.planName
    ?? (this.itemKind() === 'COURSE' ? this.selectedCourse()?.name : this.selectedPlan()?.name) ?? null);
  private courseVersion = 0;
  protected readonly quote = signal<CheckoutQuote | null>(null);
  protected readonly isLoadingQuote = signal(false);
  protected readonly studentMemberships = signal<MembershipResp[]>([]);
  protected readonly pendingMembership = computed(() => this.studentMemberships().find(m => m.status === 'PENDING_PAYMENT') ?? null);
  protected readonly currentMembership = computed(() => this.itemKind() === 'COURSE' ? null
    : this.quote()?.currentMembership ?? this.studentMemberships().find(m => ['ACTIVE', 'FROZEN', 'EXPIRED'].includes(m.status)) ?? null);
  protected readonly useCreditAdjustment = signal(false);
  protected readonly adjustedCredit = signal<number | null>(null);
  protected adjustmentReason = '';
  protected readonly effectiveCredit = computed(() => this.useCreditAdjustment() ? (this.adjustedCredit() ?? 0) : (this.quote()?.credit ?? 0));
  protected readonly adjustmentInvalid = computed(() => this.useCreditAdjustment() && (!this.currentMembership() || this.adjustedCredit() == null || !Number.isInteger(this.adjustedCredit()) || this.adjustedCredit()! < 0 || this.adjustedCredit()! > Math.min(this.selectedPlan()?.price ?? 0, this.quote()?.contractValue ?? this.currentMembership()?.purchasedPrice ?? 0)));
  protected readonly amountDue = computed(() => this.pendingCheckout()?.order?.totalAmount ?? this.pendingCheckout()?.orderRequest.expectedTotal
    ?? (this.itemKind() === 'COURSE' ? (this.selectedCourse()?.tuitionFee ?? 0)
      : this.quote() ? (this.selectedPlan()?.price ?? 0) - this.effectiveCredit() : 0));
  protected canCheckout(): boolean {
    if (this.isProcessing()) return false;
    if (this.pendingCheckout()) return true;
    if (!this.resolvedStudent() || !this.selectedBranchId) return false;
    if (this.itemKind() === 'COURSE') return !!this.selectedCourse();
    return !!this.selectedPlan() && !this.isLoadingQuote() && !!this.quote() && !this.quote()?.issue
      && !this.adjustmentInvalid() && !(this.useCreditAdjustment() && !this.adjustmentReason.trim());
  }
  private quoteVersion = 0;
  private searchVersion = 0;

  // Dynamic VietQR: the server confirms the payment through the gateway; the counter only watches it.
  protected readonly onlinePayment = signal<OnlinePaymentResp | null>(null);
  protected readonly onlineOpen = computed(() => this.onlinePayment()?.status === 'CREATED');
  private readonly now = signal(Date.now());
  protected readonly onlineSecondsLeft = computed(() => {
    const online = this.onlinePayment();
    return online ? Math.max(0, Math.floor((Date.parse(online.expiresAt) - this.now()) / 1000)) : 0;
  });
  protected readonly onlineCountdown = computed(() => {
    const s = this.onlineSecondsLeft();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
  /** After a VietQR attempt closes (or never opened) the cashier may collect the same order another way. */
  protected readonly canSwitchMethod = computed(() => {
    const draft = this.pendingCheckout();
    return !!draft?.order && draft.paymentRequest.paymentMethod === 'PAYOS' && !this.onlineOpen() && !this.isProcessing();
  });
  private onlinePollTimer: ReturnType<typeof setTimeout> | null = null;
  private onlineClockTimer: ReturnType<typeof setInterval> | null = null;
  private lastExpiryRefresh = 0;

  refreshQuote(): void {
    const student = this.resolvedStudent(); const plan = this.selectedPlan(); const branch = this.selectedBranchId;
    const version = ++this.quoteVersion;
    this.quote.set(null); this.useCreditAdjustment.set(false); this.adjustedCredit.set(null); this.adjustmentReason = '';
    if (!student || !plan || !branch || this.pendingCheckout() || this.itemKind() === 'COURSE') { this.isLoadingQuote.set(false); return; }
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
      case 'PAYOS': return 'VietQR động (PayOS)';
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
    if (this.isProcessing() || this.onlineOpen()) return;
    const draft = this.pendingCheckout(); const membership = this.pendingMembership();
    if (!draft && !membership) return;
    this.isProcessing.set(true);
    const cancel = (orderId: string) => this.posApi.cancelPendingOrder(orderId).subscribe({
      next: () => { this.pendingCheckout.set(null); this.clearOnline(); try { localStorage.removeItem(this.storageKey()); } catch {} this.isProcessing.set(false); this.refreshQuote(); this.loadCourses(); },
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
    this.stopOnlineTimers();
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
        const query = this.route.snapshot.queryParamMap;
        this.preselectCourseId = query.get('courseId');
        const branch = query.get('branchId');
        if (this.preselectCourseId && branch) {
          if (this.branches().some(b => b.id === branch)) this.branchId.set(branch);
          else { this.preselectCourseId = null; this.errorMessage.set('Bạn không được phân công tại cơ sở của khóa học này.'); }
        }
        this.restoreDraft(); this.isLoadingPlans.set(false); this.loadCourses();
      }, error: err => { this.errorMessage.set(err?.error?.message || 'Không tải được gói tập và chi nhánh.'); this.isLoadingPlans.set(false); }
    });
  }
  selectPlan(id: string): void {
    if (this.pendingCheckout() || this.isProcessing()) return;
    this.itemKind.set('PLAN'); this.selectedCourseId.set(null); this.selectedPlanId.set(id || null); this.refreshQuote();
  }
  selectCourse(id: string): void {
    if (this.pendingCheckout() || this.isProcessing()) return;
    this.itemKind.set('COURSE'); this.selectedPlanId.set(null); this.selectedCourseId.set(id); this.errorMessage.set(null);
    this.refreshQuote();
  }
  /** Classes a customer can still join: open, not full and not started. */
  loadCourses(): void {
    const branch = this.selectedBranchId; const version = ++this.courseVersion;
    if (!branch) { this.courseClasses.set([]); return; }
    this.isLoadingCourses.set(true);
    this.courseApi.classes(branch).subscribe({
      next: list => {
        if (version !== this.courseVersion) return;
        const now = Date.now();
        this.courseClasses.set(list.filter(c => c.status === 'OPEN' && c.enrolledCount < c.maxCapacity && (!c.startTime || Date.parse(c.startTime) > now)));
        this.isLoadingCourses.set(false);
        const wanted = this.preselectCourseId; this.preselectCourseId = null;
        // An unfinished checkout restored from storage takes priority over the course picked on the Courses page.
        if (wanted && !this.pendingCheckout()) {
          if (this.courseClasses().some(c => c.id === wanted)) this.selectCourse(wanted);
          else this.errorMessage.set('Khóa học đã chọn không còn nhận đăng ký (đã đủ chỗ, đã bắt đầu hoặc đã đóng).');
        }
      },
      error: () => { if (version === this.courseVersion) { this.courseClasses.set([]); this.isLoadingCourses.set(false); } }
    });
  }
  setPaymentMethod(method: PaymentMethod): void {
    if (this.canSwitchMethod()) {
      // A new key: the closed VietQR attempt stays on record and must not be replayed.
      const draft = this.pendingCheckout()!;
      this.saveDraft({ ...draft, paymentRequest: { ...draft.paymentRequest, paymentMethod: method, idempotencyKey: crypto.randomUUID() } });
      this.paymentMethod.set(method); this.errorMessage.set(null); return;
    }
    if (!this.pendingCheckout() && !this.isProcessing()) this.paymentMethod.set(method);
  }

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
    let draft = this.pendingCheckout();
    if (draft) {
      if (this.onlineOpen()) return;
      const method = draft.paymentRequest.paymentMethod;
      if ((method === 'POS_CARD' || method === 'BANK_TRANSFER_QR') && !draft.paymentRequest.transactionReference) {
        if (!this.transactionReference.trim()) { this.errorMessage.set('Nhập mã chứng từ thanh toán đã được xác nhận.'); return; }
        draft = { ...draft, paymentRequest: { ...draft.paymentRequest, transactionReference: this.transactionReference.trim() } };
      }
      // The previous VietQR closed unpaid: open a fresh attempt for the same order.
      if (method === 'PAYOS' && this.onlinePayment()) draft = { ...draft, paymentRequest: { ...draft.paymentRequest, idempotencyKey: crypto.randomUUID() } };
      this.saveDraft(draft); this.isProcessing.set(true); this.errorMessage.set(null); this.completeCheckout(draft); return;
    }
    if (this.itemKind() === 'COURSE') { this.courseCheckout(); return; }
    const plan = this.selectedPlan(); const student = this.resolvedStudent();
    const quote = this.quote(); const actorId = this.auth.currentUserId();
    if (!plan || !student || !actorId || !this.selectedBranchId || !quote || this.isLoadingQuote() || quote.issue) {
      this.errorMessage.set(quote?.issue || 'Chọn học viên, gói thẻ và tải báo giá trước khi thanh toán.'); return;
    }
    if (this.adjustmentInvalid() || this.useCreditAdjustment() && !this.adjustmentReason.trim()) {
      this.errorMessage.set('Nhập giá trị điều chỉnh hợp lệ và lý do phê duyệt.'); return;
    }
    if (this.amountDue() > 0 && this.paymentMethod() !== 'CASH' && this.paymentMethod() !== 'PAYOS' && !this.transactionReference.trim()) {
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
  /** Enrolls the student in every session of the course (a pending order), then collects it like a plan order. */
  private courseCheckout(): void {
    const course = this.selectedCourse(); const student = this.resolvedStudent(); const actorId = this.auth.currentUserId();
    if (!course || !student || !actorId || !this.selectedBranchId) { this.errorMessage.set('Chọn học viên và khóa học trước khi thanh toán.'); return; }
    const method = this.amountDue() === 0 ? 'CASH' : this.paymentMethod();
    if ((method === 'POS_CARD' || method === 'BANK_TRANSFER_QR') && !this.transactionReference.trim()) {
      this.errorMessage.set('Nhập mã chứng từ thanh toán đã được xác nhận.'); return;
    }
    this.isProcessing.set(true); this.errorMessage.set(null);
    const notes = this.cashierNotes;
    this.courseApi.enroll(course.id, student.id).subscribe({
      next: e => {
        const order: OrderResp = { orderId: e.orderId, orderCode: e.enrollmentCode, branchId: course.branchId, studentId: student.id,
          planId: course.id, planName: course.name, subtotal: e.totalAmount, discountAmount: 0, totalAmount: e.totalAmount,
          status: 'PENDING', orderDate: new Date().toISOString(), membershipId: '', membershipCode: '' };
        const draft: CheckoutDraft = { actorId, key: crypto.randomUUID(), kind: 'COURSE', order,
          orderRequest: { branchId: course.branchId, studentId: student.id, planId: course.id, cashierId: actorId, notes },
          paymentRequest: { paymentMethod: method, idempotencyKey: crypto.randomUUID(), cashierId: actorId, transactionReference: this.transactionReference.trim() || undefined, notes } };
        this.saveDraft(draft); this.pay(draft);
      },
      error: err => { this.fail(err, 'Chưa ghi danh được học viên vào khóa học.'); this.loadCourses(); }
    });
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
    if (draft.paymentRequest.paymentMethod === 'PAYOS') { this.startOnline(draft); return; }
    this.posApi.processPayment({ ...draft.paymentRequest, orderId: order.orderId }).subscribe({
      next: payment => {
        if (payment.paymentStatus !== 'SUCCESS' || payment.orderId !== order.orderId) { this.fail(null, 'Thanh toán chưa được xác nhận.'); return; }
        this.successReceipt.set({ order, payment, kind: draft.kind ?? 'PLAN' }); this.isProcessing.set(false); this.pendingCheckout.set(null);
        try { localStorage.removeItem(this.storageKey()); } catch { /* storage unavailable */ }
      }, error: err => this.fail(err, 'Chưa xác nhận được kết quả thanh toán. Thử lại cùng đơn và mã giao dịch; không thu tiền lần nữa.')
    });
  }
  private startOnline(draft: CheckoutDraft): void {
    this.posApi.startOnlinePayment(draft.order!.orderId, draft.paymentRequest.idempotencyKey).subscribe({
      next: online => this.showOnline(online),
      error: err => this.fail(err, 'Chưa tạo được mã VietQR. Thử lại hoặc chọn phương thức khác.')
    });
  }

  refreshOnline(): void {
    const online = this.onlinePayment(); if (!online || this.isProcessing()) return;
    this.isProcessing.set(true);
    this.posApi.refreshOnlinePayment(online.id).subscribe({ next: r => this.showOnline(r), error: err => this.fail(err, 'Chưa kiểm tra được cổng thanh toán. Thử lại sau ít giây.') });
  }

  cancelOnline(): void {
    const online = this.onlinePayment(); if (!online || !this.onlineOpen() || this.isProcessing()) return;
    this.isProcessing.set(true);
    this.posApi.cancelOnlinePayment(online.id).subscribe({
      next: r => {
        this.showOnline(r);
        // Hủy thanh toán = hủy luôn đơn chờ, để quầy được tìm/chọn học viên khác ngay.
        if (r.status === 'CANCELLED') this.cancelPendingCheckout();
      },
      error: err => this.fail(err, 'Chưa hủy được mã. Khách có thể vừa thanh toán; bấm Kiểm tra lại.')
    });
  }

  private showOnline(online: OnlinePaymentResp): void {
    const draft = this.pendingCheckout();
    if (draft?.order && online.orderId !== draft.order.orderId) { this.fail(null, 'Mã thanh toán không thuộc đơn đang xử lý.'); return; }
    this.onlinePayment.set(online); this.isProcessing.set(false); this.now.set(Date.now());
    this.stopOnlineTimers();
    switch (online.status) {
      case 'CREATED':
        this.errorMessage.set(null);
        this.onlineClockTimer = setInterval(() => {
          this.now.set(Date.now());
          // The server only closes an expired link on its periodic job: ask the gateway as soon as time is up.
          if (this.onlineSecondsLeft() === 0 && !this.isProcessing() && Date.now() - this.lastExpiryRefresh >= EXPIRY_REFRESH_MS) {
            this.lastExpiryRefresh = Date.now(); this.refreshOnline();
          }
        }, 1000);
        this.onlinePollTimer = setTimeout(() => this.pollOnline(online.id), ONLINE_POLL_MS);
        return;
      case 'PAID':
        if (draft?.order) this.successReceipt.set({ order: draft.order, payment: { paymentId: online.paymentId, paymentCode: `PAYOS-${online.providerOrderCode}`, orderId: online.orderId,
          amount: online.amount, paymentMethod: 'PAYOS', paymentStatus: 'SUCCESS', paymentTime: online.paidAt ?? new Date().toISOString(), activatedMembershipCode: online.activatedMembershipCode ?? '' }, kind: draft.kind ?? 'PLAN' });
        this.pendingCheckout.set(null); this.clearOnline();
        try { localStorage.removeItem(this.storageKey()); } catch { /* storage unavailable */ }
        return;
      case 'NEEDS_RECONCILIATION':
      case 'RESOLVED':
        // Money reached the gateway but the order was not activated: never collect again at the counter.
        this.pendingCheckout.set(null);
        try { localStorage.removeItem(this.storageKey()); } catch { /* storage unavailable */ }
        this.errorMessage.set('Cổng đã nhận tiền nhưng chưa kích hoạt được thẻ. Không thu thêm; quản lý xử lý tại mục "Tiền VietQR chờ đối soát" ở trang Đơn hàng.');
        return;
      default:
        this.errorMessage.set(online.status === 'EXPIRED' ? 'Mã VietQR đã hết hạn. Tạo mã mới hoặc chọn cách thu khác.' : 'Đã hủy mã VietQR. Tạo mã mới hoặc chọn cách thu khác.');
    }
  }

  private pollOnline(id: string): void {
    this.onlinePollTimer = null;
    this.posApi.getOnlinePayment(id).subscribe({
      next: online => { if (this.onlinePayment()?.id === id) this.showOnline(online); },
      // Network blips must not stop watching a link the customer may be paying.
      error: () => { if (this.onlinePayment()?.id === id && this.onlineOpen()) this.onlinePollTimer = setTimeout(() => this.pollOnline(id), ONLINE_POLL_MS); }
    });
  }

  private stopOnlineTimers(): void {
    if (this.onlinePollTimer) { clearTimeout(this.onlinePollTimer); this.onlinePollTimer = null; }
    if (this.onlineClockTimer) { clearInterval(this.onlineClockTimer); this.onlineClockTimer = null; }
  }

  private clearOnline(): void { this.stopOnlineTimers(); this.onlinePayment.set(null); }

  private fail(err: any, fallback: string): void { this.errorMessage.set(err?.error?.message || fallback); this.isProcessing.set(false); }
  private storageKey(): string { return 'yoga_checkout_' + this.auth.currentUserId(); }
  private saveDraft(draft: CheckoutDraft): void { this.pendingCheckout.set(draft); try { localStorage.setItem(this.storageKey(), JSON.stringify(draft)); } catch { /* retry remains available in this tab */ } }
  private restoreDraft(): void {
    try {
      const raw = localStorage.getItem(this.storageKey()); if (!raw) return;
      const draft = JSON.parse(raw) as CheckoutDraft;
      if (draft.actorId !== this.auth.currentUserId() || !draft.key || !draft.orderRequest?.studentId || !draft.paymentRequest?.idempotencyKey) return;
      this.pendingCheckout.set(draft); this.branchId.set(draft.orderRequest.branchId); this.paymentMethod.set(draft.paymentRequest.paymentMethod);
      if (draft.kind === 'COURSE') { this.itemKind.set('COURSE'); this.selectedPlanId.set(null); this.selectedCourseId.set(draft.orderRequest.planId); }
      else this.selectedPlanId.set(draft.orderRequest.planId);
      this.errorMessage.set('Có giao dịch chưa được xác nhận. Thử lại để đối soát cùng đơn; không thu thêm tiền.');
      // A VietQR may still be open for this order: show it again (same key returns the same link) instead of
      // offering a cancel that the server would refuse while the customer can still pay.
      if (draft.order && draft.paymentRequest.paymentMethod === 'PAYOS') { this.isProcessing.set(true); this.startOnline(draft); }
    } catch { this.errorMessage.set('Không đọc được giao dịch đang chờ. Liên hệ quản lý để đối soát trước khi thu tiền.'); }
  }
  resetForm(): void {
    if (this.pendingCheckout() || this.isProcessing()) return;
    this.successReceipt.set(null);
    this.clearOnline();
    this.loadCourses();
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
