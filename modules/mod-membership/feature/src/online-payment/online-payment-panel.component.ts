import { ChangeDetectionStrategy, Component, computed, DestroyRef, EventEmitter, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { QrCodeComponent } from '@yoga/platform/api';
import { ZEN_UI } from '@yoga/platform/ui';
import { OnlinePaymentResp, PosApi, SelfCheckoutApi } from '@yoga/mod-membership/data-access';

const POLL_MS = 3000;
/** Minimum gap between gateway checks once the QR has run out of time. */
const EXPIRY_REFRESH_MS = 5000;

type Step = 'loading' | 'paying' | 'paid' | 'closed' | 'reconcile';

/** The calls the panel needs; the student (`/me`) and counter (`/pos`) APIs both provide them. */
interface OnlinePaymentCalls {
  startOnlinePayment(orderId: string, key: string): Observable<OnlinePaymentResp>;
  getOnlinePayment(id: string): Observable<OnlinePaymentResp>;
  refreshOnlinePayment(id: string): Observable<OnlinePaymentResp>;
  cancelOnlinePayment(id: string): Observable<OnlinePaymentResp>;
}

/**
 * VietQR for one pending order (membership or course). The backend confirms the payment through the gateway;
 * this panel only shows the code and watches it. Opening it again for the same order returns the open code.
 *
 * Inputs are declared in metadata on purpose: signal inputs and field decorators do not work in the JIT-compiled unit tests.
 */
@Component({
  selector: 'yoga-online-payment-panel',
  standalone: true,
  imports: [CommonModule, QrCodeComponent, ...ZEN_UI],
  templateUrl: './online-payment-panel.component.html',
  styleUrl: './online-payment-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  inputs: ['orderId', 'mode', 'checkGateway', 'successText'],
  outputs: ['paid', 'orderCancelled', 'codeClosed']
})
export class OnlinePaymentPanelComponent implements OnInit {
  private readonly studentApi = inject(SelfCheckoutApi);
  private readonly counterApi = inject(PosApi);

  orderId = '';
  /** `student`: the customer pays their own order. `counter`: staff show the code to a customer at the desk. */
  mode: 'student' | 'counter' = 'student';
  /** Ask the gateway right away, e.g. the student just came back from the gateway's page. */
  checkGateway = false;
  successText = 'Thanh toán thành công.';
  readonly paid = new EventEmitter<OnlinePaymentResp>();
  /** Student mode: the student cancelled the whole order. */
  readonly orderCancelled = new EventEmitter<void>();
  /** Counter mode: the code was closed unpaid, so staff may collect another way. */
  readonly codeClosed = new EventEmitter<void>();

  protected readonly step = signal<Step>('loading');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly online = signal<OnlinePaymentResp | null>(null);

  private readonly now = signal(Date.now());
  protected readonly secondsLeft = computed(() => {
    const o = this.online();
    return o ? Math.max(0, Math.floor((Date.parse(o.expiresAt) - this.now()) / 1000)) : 0;
  });
  protected readonly countdown = computed(() => {
    const s = this.secondsLeft();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;
  private lastExpiryRefresh = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTimers());
  }

  private get api(): OnlinePaymentCalls { return this.mode === 'counter' ? this.counterApi : this.studentApi; }

  ngOnInit(): void { this.open(this.checkGateway); }

  /** Shows the order's open code, or opens a new one when the previous attempt closed unpaid. */
  protected open(askGateway = false): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(null);
    this.api.startOnlinePayment(this.orderId, crypto.randomUUID()).subscribe({
      next: o => askGateway && o.status === 'CREATED' ? this.refresh(o.id) : this.show(o),
      error: err => {
        this.busy.set(false); this.step.set('closed');
        this.error.set(message(err, 'Chưa tạo được mã VietQR. Vui lòng thử lại sau ít phút.'));
      }
    });
  }

  protected checkNow(): void {
    const o = this.online(); if (o && !this.busy()) this.refresh(o.id);
  }

  private refresh(id: string): void {
    this.busy.set(true);
    this.api.refreshOnlinePayment(id).subscribe({
      next: o => this.show(o),
      error: err => { this.busy.set(false); this.error.set(message(err, 'Chưa kiểm tra được cổng thanh toán. Thử lại sau ít giây.')); }
    });
  }

  /** Counter: close the code so the customer can pay another way. */
  protected cancelCode(): void {
    const o = this.online(); if (!o || this.busy()) return;
    this.busy.set(true); this.error.set(null); this.stopTimers();
    this.api.cancelOnlinePayment(o.id).subscribe({
      next: r => { this.show(r); if (r.status !== 'PAID') this.codeClosed.emit(); },
      error: err => { this.busy.set(false); this.error.set(message(err, 'Chưa hủy được mã. Khách có thể vừa chuyển khoản; hãy kiểm tra lại.')); this.refresh(o.id); }
    });
  }

  /** Student: close the code and cancel the order. A payment that just arrived wins over the cancellation. */
  protected cancelOrder(): void {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(null); this.stopTimers();
    this.studentApi.cancelOrder(this.orderId).subscribe({
      next: () => { this.busy.set(false); this.orderCancelled.emit(); },
      error: err => {
        this.busy.set(false);
        this.error.set(message(err, 'Chưa hủy được đơn. Nếu bạn vừa chuyển khoản, vui lòng chờ hệ thống xác nhận.'));
        const o = this.online(); if (o) this.refresh(o.id);
      }
    });
  }

  private show(o: OnlinePaymentResp): void {
    this.online.set(o); this.busy.set(false); this.now.set(Date.now());
    this.stopTimers();
    switch (o.status) {
      case 'CREATED':
        this.step.set('paying');
        this.clockTimer = setInterval(() => {
          this.now.set(Date.now());
          // Out of time: ask the gateway, which either confirms a late payment or closes the code.
          if (this.secondsLeft() === 0 && !this.busy() && Date.now() - this.lastExpiryRefresh >= EXPIRY_REFRESH_MS) {
            this.lastExpiryRefresh = Date.now(); this.refresh(o.id);
          }
        }, 1000);
        this.pollTimer = setTimeout(() => this.poll(o.id), POLL_MS);
        break;
      case 'PAID':
        this.step.set('paid'); this.paid.emit(o);
        break;
      case 'NEEDS_RECONCILIATION':
      case 'RESOLVED':
        this.step.set('reconcile');
        break;
      default:
        this.step.set('closed');
    }
  }

  private poll(id: string): void {
    this.pollTimer = null;
    this.api.getOnlinePayment(id).subscribe({
      next: o => { if (this.online()?.id === id && this.step() === 'paying' && !this.busy()) this.show(o); },
      error: () => { if (this.online()?.id === id && this.step() === 'paying') this.pollTimer = setTimeout(() => this.poll(id), POLL_MS); }
    });
  }

  private stopTimers(): void {
    if (this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = null; }
    if (this.clockTimer) { clearInterval(this.clockTimer); this.clockTimer = null; }
  }
}

function message(err: unknown, fallback: string): string {
  const e = err as { error?: { message?: string } } | null;
  return e?.error?.message || fallback;
}
