import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ZEN_UI, ZenTabItem } from '@yoga/platform/ui';

/** Trang tham chiếu bộ giao diện dùng chung (/ui-kit) — xem nhanh mọi component và token. */
@Component({
  selector: 'yoga-ui-kit-page',
  standalone: true,
  imports: [FormsModule, ...ZEN_UI],
  template: `
    <div class="zen-page">
      <zen-page-header
        eyebrow="Hệ thống thiết kế"
        heading="Bộ giao diện An Yên"
        subtitle="Các thành phần dùng chung cho toàn bộ phần quản lý. Mọi trang đều dùng lại những khối này để đồng nhất màu sắc, kiểu chữ và khoảng cách."
        [count]="17"
        countLabel="component"
      >
        <button actions type="button" class="zen-btn zen-btn--outline"><zen-icon name="download" />Xuất báo cáo</button>
        <button actions type="button" class="zen-btn zen-btn--primary" (click)="modalOpen.set(true)"><zen-icon name="plus" />Mở modal</button>
      </zen-page-header>

      <div class="zen-grid zen-grid--stats">
        <zen-stat-card label="Doanh thu tháng" value="128.500.000 ₫" icon="wallet" tone="success" hint="Tăng 12% so với tháng trước" />
        <zen-stat-card label="Đơn hàng" value="342" icon="receipt" hint="28 đơn chờ thanh toán" />
        <zen-stat-card label="Học viên hoạt động" value="1.204" icon="users" tone="info" hint="Trên 4 cơ sở" />
        <zen-stat-card label="Thẻ sắp hết hạn" value="17" icon="alert-triangle" tone="warning" hint="Trong 7 ngày tới" />
      </div>

      <zen-tabs [items]="tabs" [active]="tab()" (activeChange)="tab.set($event)" />

      <zen-alert tone="info" heading="Ghi chú">Thông tin thuộc tính hệ thống hiển thị dạng hộp thông báo nội tuyến.</zen-alert>
      <zen-alert tone="danger" dismissible>Không thể tải danh sách. Vui lòng thử lại.</zen-alert>

      <zen-card padding="none">
        <zen-toolbar class="kit-toolbar">
          <zen-search class="zen-toolbar-grow" placeholder="Tìm theo tên, số điện thoại..." />
          <zen-select class="zen-toolbar-item" [options]="branchOptions" placeholder="Tất cả cơ sở" />
          <div toolbar-end>
            <div class="zen-segmented">
              <button type="button" class="is-active">Tuần</button>
              <button type="button">Tháng</button>
            </div>
          </div>
        </zen-toolbar>
        <div class="zen-table-wrap">
          <table class="zen-table">
            <thead>
              <tr><th>Học viên</th><th>Cơ sở</th><th>Vai trò</th><th class="is-numeric">Tổng chi tiêu</th><th>Trạng thái</th><th class="is-actions"></th></tr>
            </thead>
            <tbody>
              @for (row of rows; track row.name) {
                <tr>
                  <td>
                    <div class="zen-cell-user">
                      <zen-avatar [name]="row.name" size="sm" />
                      <div><span class="cell-primary">{{ row.name }}</span><span class="cell-sub">{{ row.phone }}</span></div>
                    </div>
                  </td>
                  <td class="cell-muted">{{ row.branch }}</td>
                  <td><zen-badge tone="primary" size="sm">{{ row.role }}</zen-badge></td>
                  <td class="is-numeric"><span class="zen-price">{{ row.amount }}</span></td>
                  <td><zen-badge [tone]="row.tone" dot>{{ row.status }}</zen-badge></td>
                  <td class="is-actions">
                    <button type="button" class="zen-btn zen-btn--ghost zen-btn--sm zen-btn--icon" aria-label="Sửa"><zen-icon name="edit" /></button>
                    <button type="button" class="zen-btn zen-btn--ghost zen-btn--sm zen-btn--icon" aria-label="Xóa"><zen-icon name="trash" /></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <zen-pagination card-footer [page]="0" [totalPages]="5" [totalElements]="48" />
      </zen-card>

      <div class="zen-grid zen-grid--2">
        <zen-card heading="Nút bấm" subtitle="Một kiểu nút cho mọi trang">
          <div class="zen-stack">
            <div class="zen-row">
              <button type="button" class="zen-btn zen-btn--primary">Chính</button>
              <button type="button" class="zen-btn zen-btn--secondary">Phụ</button>
              <button type="button" class="zen-btn zen-btn--outline">Viền</button>
              <button type="button" class="zen-btn zen-btn--ghost">Nhẹ</button>
              <button type="button" class="zen-btn zen-btn--danger">Xóa</button>
            </div>
            <div class="zen-row">
              <button type="button" class="zen-btn zen-btn--primary zen-btn--sm">Nhỏ</button>
              <button type="button" class="zen-btn zen-btn--primary zen-btn--lg">Lớn</button>
              <button type="button" class="zen-btn zen-btn--outline zen-btn--icon" aria-label="Làm mới"><zen-icon name="refresh" /></button>
              <zen-button variant="primary" [loading]="true">Đang lưu</zen-button>
            </div>
            <div class="zen-row">
              <button type="button" class="zen-chip is-active">Tất cả</button>
              <button type="button" class="zen-chip">Đang hoạt động</button>
              <button type="button" class="zen-chip">Tạm khóa</button>
            </div>
          </div>
        </zen-card>

        <zen-card heading="Biểu mẫu" subtitle="Nhãn, ô nhập, gợi ý, lỗi">
          <div class="zen-form-grid">
            <label class="zen-field">
              <span class="zen-label">Họ và tên<span class="zen-required">*</span></span>
              <input class="zen-control" placeholder="Nguyễn Văn An" />
            </label>
            <label class="zen-field">
              <span class="zen-label">Số điện thoại</span>
              <input class="zen-control is-invalid" value="0901" />
              <span class="zen-error">Số điện thoại chưa hợp lệ</span>
            </label>
            <div class="zen-field zen-field--full">
              <span class="zen-label">Cơ sở</span>
              <zen-select [options]="branchOptions" placeholder="Chọn cơ sở" />
              <span class="zen-hint">Học viên có thể tập tại mọi cơ sở trong hệ thống.</span>
            </div>
          </div>
        </zen-card>
      </div>

      <div class="zen-grid zen-grid--2">
        <zen-card heading="Trạng thái" subtitle="Badge dạng pill, màu nhạt">
          <div class="zen-row">
            <zen-badge tone="success" dot>Đã thanh toán</zen-badge>
            <zen-badge tone="warning" dot>Chờ thanh toán</zen-badge>
            <zen-badge tone="danger" dot>Đã hủy</zen-badge>
            <zen-badge tone="info">Đã hoàn tiền</zen-badge>
            <zen-badge tone="primary">Quản Lý Cơ Sở</zen-badge>
            <zen-badge>Lưu trữ</zen-badge>
          </div>
        </zen-card>
        <zen-card heading="Trạng thái rỗng & đang tải" padding="none">
          <div class="zen-grid zen-grid--2">
            <zen-empty-state compact icon="calendar" heading="Chưa có lịch học" description="Tạo lịch đầu tiên cho cơ sở này." />
            <zen-loading message="Đang đồng bộ dữ liệu..." />
          </div>
        </zen-card>
      </div>
    </div>

    @if (modalOpen()) {
      <zen-modal heading="Thêm cơ sở mới" subtitle="Thông tin cơ bản của cơ sở trong hệ thống." icon="building" (closed)="modalOpen.set(false)">
        <div class="zen-form-grid">
          <label class="zen-field zen-field--full"><span class="zen-label">Tên cơ sở</span><input class="zen-control" placeholder="An Yên Quận 1" /></label>
          <label class="zen-field"><span class="zen-label">Số điện thoại</span><input class="zen-control" /></label>
          <label class="zen-field"><span class="zen-label">Giờ mở cửa</span><input class="zen-control" placeholder="06:00 - 21:00" /></label>
        </div>
        <ng-container modal-footer>
          <button type="button" class="zen-btn zen-btn--outline" (click)="modalOpen.set(false)">Hủy</button>
          <button type="button" class="zen-btn zen-btn--primary" (click)="modalOpen.set(false)">Lưu cơ sở</button>
        </ng-container>
      </zen-modal>
    }
  `,
  styles: [`
    .kit-toolbar { padding: 14px 16px; border-bottom: 1px solid var(--color-border); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UiKitPage {
  readonly tab = signal('overview');
  readonly modalOpen = signal(false);

  readonly tabs: ZenTabItem[] = [
    { key: 'overview', label: 'Tổng quan', icon: 'grid' },
    { key: 'students', label: 'Học viên', count: 1204, icon: 'users' },
    { key: 'orders', label: 'Đơn hàng', count: 28, icon: 'receipt' },
    { key: 'archived', label: 'Lưu trữ' }
  ];

  readonly branchOptions = [
    { value: '', label: 'Tất cả cơ sở' },
    { value: 'q1', label: 'An Yên Quận 1' },
    { value: 'q3', label: 'An Yên Quận 3' }
  ];

  readonly rows = [
    { name: 'Nguyễn Thị Lan', phone: '0901 234 567', branch: 'An Yên Quận 1', role: 'Học Viên', amount: '4.800.000 ₫', status: 'Đang hoạt động', tone: 'success' as const },
    { name: 'Trần Minh Khoa', phone: '0912 345 678', branch: 'An Yên Quận 3', role: 'Huấn Luyện Viên', amount: '—', status: 'Tạm nghỉ', tone: 'warning' as const },
    { name: 'Lê Hoàng Anh', phone: '0987 654 321', branch: 'An Yên Thủ Đức', role: 'Lễ Tân', amount: '1.200.000 ₫', status: 'Đã khóa', tone: 'danger' as const }
  ];
}
