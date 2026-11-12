import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '@yoga/platform/auth';
import { ZEN_UI } from '@yoga/platform/ui';
import { PosApi, StudentOrderHistoryResp } from '@yoga/mod-membership/data-access';
import { OnlinePaymentPanelComponent } from '../online-payment/online-payment-panel.component';

/**
 * The one page where a student pays any of their pending orders online: a membership plan or a course.
 * `?check=1` (coming back from the gateway's page) asks the gateway for the status straight away.
 */
@Component({
  selector: 'yoga-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, OnlinePaymentPanelComponent, ...ZEN_UI],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent implements OnInit {
  private readonly posApi = inject(PosApi);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly orderId = signal('');
  protected readonly checkGateway = signal(false);
  protected readonly order = signal<StudentOrderHistoryResp | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly justPaid = signal(false);

  protected readonly isCourse = computed(() => this.order()?.items.some(i => i.itemType === 'COURSE_CLASS') ?? false);
  protected readonly itemName = computed(() => this.order()?.items[0]?.itemName ?? '');
  protected readonly membershipCode = computed(() => this.order()?.items.find(i => i.membershipCode)?.membershipCode ?? null);

  ngOnInit(): void {
    const params = this.route.snapshot;
    this.orderId.set(params.paramMap.get('orderId') ?? '');
    this.checkGateway.set(params.queryParamMap.get('check') === '1');
    this.load();
  }

  protected load(): void {
    const me = this.auth.currentUserId();
    if (!me || !this.orderId()) { this.loading.set(false); this.error.set('Không tìm thấy đơn hàng.'); return; }
    this.loading.set(true);
    this.posApi.getStudentOrders(me).subscribe({
      next: orders => {
        const order = orders.find(o => o.orderId === this.orderId()) ?? null;
        this.order.set(order); this.loading.set(false);
        this.error.set(order ? null : 'Không tìm thấy đơn hàng của bạn.');
      },
      error: err => { this.loading.set(false); this.error.set(err?.error?.message || 'Không tải được đơn hàng. Vui lòng thử lại.'); }
    });
  }

  protected onPaid(): void { this.justPaid.set(true); this.load(); }

  protected onCancelled(): void { this.load(); }
}
