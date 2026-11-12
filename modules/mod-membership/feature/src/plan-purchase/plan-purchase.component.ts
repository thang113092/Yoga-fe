import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@yoga/platform/auth';
import { ZEN_UI } from '@yoga/platform/ui';
import { Branch, BranchApi } from '@yoga/mod-branch/data-access';
import { CheckoutQuote, MembershipPlan, SelfCheckoutApi } from '@yoga/mod-membership/data-access';

/**
 * A student buying a plan: confirm the backend quote, create the order, then pay on the shared checkout page.
 * A plan valid at every branch needs no branch choice; the order is then registered at the student's home branch.
 */
@Component({
  selector: 'yoga-plan-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule, ...ZEN_UI],
  templateUrl: './plan-purchase.component.html',
  styleUrl: './plan-purchase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanPurchaseComponent implements OnInit {
  private readonly api = inject(SelfCheckoutApi);
  private readonly branchApi = inject(BranchApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly plan = input<MembershipPlan | null>(null);
  readonly closed = output<void>();

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly branches = signal<Branch[]>([]);
  private readonly branch = signal('');
  protected get branchId(): string { return this.branch(); }
  protected set branchId(value: string) { if (this.busy()) return; this.branch.set(value); this.loadQuote(); }
  protected readonly needsBranch = computed(() => !this.plan()?.isAllBranches);
  protected readonly quote = signal<CheckoutQuote | null>(null);
  protected readonly loadingQuote = signal(false);
  /** Kept until the order exists, so a retry after a lost response cannot create a second order. */
  private orderKey: string | null = null;

  ngOnInit(): void {
    this.branchApi.getAll().subscribe({
      next: list => {
        const active = list.filter(b => b.isActive);
        this.branches.set(active);
        const home = this.auth.userHomeBranchId();
        this.branch.set(active.find(b => b.id === home)?.id ?? active[0]?.id ?? '');
        this.loadQuote();
      },
      error: err => this.error.set(message(err, 'Không tải được danh sách cơ sở.'))
    });
  }

  protected close(): void { this.closed.emit(); }

  private loadQuote(): void {
    const plan = this.plan(); const branchId = this.branch();
    this.quote.set(null); this.error.set(null);
    if (!plan || !branchId) return;
    this.loadingQuote.set(true);
    this.api.getQuote(plan.id, branchId).subscribe({
      next: q => { if (plan === this.plan() && branchId === this.branch()) { this.quote.set(q); this.loadingQuote.set(false); } },
      error: err => { this.loadingQuote.set(false); this.error.set(message(err, 'Không lấy được báo giá. Vui lòng thử lại.')); }
    });
  }

  /** Creates the order from the confirmed quote and opens the checkout page for it. */
  protected confirm(): void {
    const plan = this.plan(); const q = this.quote();
    if (!plan || !q || q.issue || this.busy()) return;
    this.busy.set(true); this.error.set(null);
    this.orderKey ??= crypto.randomUUID();
    this.api.createOrder({
      branchId: this.branch(), planId: plan.id, replacesMembershipId: q.currentMembership?.id,
      expectedCredit: q.credit, expectedTotal: q.totalAmount
    }, this.orderKey).subscribe({
      next: order => { this.busy.set(false); this.close(); void this.router.navigate(['/membership/checkout', order.orderId]); },
      error: err => {
        this.busy.set(false);
        this.error.set(message(err, 'Chưa tạo được đơn hàng. Vui lòng thử lại.'));
        // The quote may be stale (price or current card changed): show the fresh one; a new confirm is a new order.
        this.orderKey = null; this.loadQuote();
      }
    });
  }
}

function message(err: unknown, fallback: string): string {
  const e = err as { error?: { message?: string } } | null;
  return e?.error?.message || fallback;
}
