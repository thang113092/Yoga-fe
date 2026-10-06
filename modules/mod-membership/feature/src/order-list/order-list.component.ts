import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { PosApi, OrderListResult } from '@yoga/mod-membership/data-access';
import { Branch, BranchApi } from '@yoga/mod-branch/data-access';
import { AuthService } from '@yoga/platform/auth';
import { ZenSelectComponent, ZenSearchComponent, ZenSelectOption } from '@yoga/platform/ui';

@Component({
  selector: 'yoga-order-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ZenSelectComponent, ZenSearchComponent],
  templateUrl: './order-list.component.html',
  styleUrl: './order-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderListComponent implements OnInit {
  private readonly api = inject(PosApi);
  private readonly branchApi = inject(BranchApi);
  protected readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  readonly branches = signal<Branch[]>([]);
  readonly result = signal<OrderListResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  search = '';
  branchId = '';
  status = '';

  readonly statuses: Record<string, string> = {
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    CANCELLED: 'Đã hủy',
    REFUNDED: 'Đã hoàn tiền'
  };

  readonly statusFilterOptions: ZenSelectOption<string>[] = [
    { value: '', label: 'Tất cả trạng thái' },
    { value: 'PAID', label: 'Đã thanh toán' },
    { value: 'PENDING', label: 'Chờ thanh toán' },
    { value: 'CANCELLED', label: 'Đã hủy' },
    { value: 'REFUNDED', label: 'Đã hoàn tiền' }
  ];

  readonly branchFilterOptions = computed(() => {
    const list = this.branches().map(b => ({
      value: b.id,
      label: b.name
    }));
    return [{ value: '', label: 'Tất cả cơ sở được phép xem' }, ...list];
  });

  ngOnInit(): void {
    this.branchApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: branches => this.branches.set(branches.filter(b => this.auth.isSuperAdmin()
        || b.id === this.auth.userHomeBranchId() || this.auth.branchIds().includes(b.id))),
      error: () => this.branches.set([])
    });
    this.load(0);
  }

  load(page = 0): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    const params: Record<string, string | number> = { page, size: 20 };
    if (this.search.trim()) params['search'] = this.search.trim();
    if (this.branchId) params['branchId'] = this.branchId;
    if (this.status) params['status'] = this.status;

    this.request = this.api.listOrders(params).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: () => {
        this.result.set(null);
        this.error.set('Không thể tải danh sách đơn hàng. Vui lòng thử lại.');
        this.loading.set(false);
      }
    });
  }

  onSearchChange(term: string): void {
    this.search = term;
    this.load(0);
  }

  onSearchClear(): void {
    this.search = '';
    this.load(0);
  }

  onBranchChange(id: string): void {
    this.branchId = id;
    this.load(0);
  }

  onStatusChange(stat: string): void {
    this.status = stat;
    this.load(0);
  }
}
