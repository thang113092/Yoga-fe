# An Yên UI — bộ giao diện dùng chung

Mọi trang quản lý dùng chung bộ component và lớp CSS này để đồng nhất màu sắc, kiểu chữ, khoảng cách.
Xem trực quan tất cả thành phần tại **`/ui-kit`** khi chạy dev server.

## Nguyên tắc

1. **Không hard-code màu, cỡ chữ, bo góc, bóng đổ.** Chỉ dùng biến trong `platform/tokens/src/tokens.scss`
   (`--color-*`, `--text-*`, `--weight-*`, `--radius-*`, `--shadow-*`, `--spacing-*`).
2. **Font:** `--font-sans` (Plus Jakarta Sans) cho mọi chữ. `--font-display` (Playfair Display) chỉ dùng cho
   tiêu đề trang (đã có sẵn trong `zen-page-header`) và các con số/tên gói nổi bật nếu thật cần.
3. **Thang cỡ chữ:** 11 / 12 / 13 / 14 / 15 / 18 / 22 / 26 / 30px → `--text-2xs … --text-3xl`. Không dùng giá trị khác.
4. **Không emoji.** Icon dùng `<zen-icon name="..." />` (danh sách trong `zen-icon.component.ts`).
5. SCSS của trang chỉ chứa bố cục riêng của trang đó (grid, kích thước vùng đặc thù). Header, card, bảng, nút,
   badge, modal, form, empty/loading state **phải** dùng thành phần chung.

## Cách dùng

```ts
import { ZEN_UI } from '@yoga/platform/ui';

@Component({ imports: [CommonModule, FormsModule, ...ZEN_UI], ... })
```

## Bố cục trang chuẩn

```html
<div class="zen-page">
  <zen-page-header eyebrow="Giao dịch & thanh toán" heading="Đơn hàng" subtitle="..." [count]="total" countLabel="đơn">
    <button actions class="zen-btn zen-btn--primary"><zen-icon name="plus" />Tạo đơn</button>
  </zen-page-header>

  <div class="zen-grid zen-grid--stats">
    <zen-stat-card label="Doanh thu" [value]="revenue" icon="wallet" tone="success" hint="..." />
  </div>

  <zen-tabs [items]="tabs" [active]="tab()" (activeChange)="tab.set($event)" />

  <zen-card padding="none">
    <zen-toolbar style="padding:14px 16px;border-bottom:1px solid var(--color-border)">
      <zen-search class="zen-toolbar-grow" ... />
      <zen-select class="zen-toolbar-item" ... />
      <div toolbar-end>...</div>
    </zen-toolbar>
    <div class="zen-table-wrap">
      <table class="zen-table">...</table>
    </div>
    <zen-pagination card-footer [page]="p" [totalPages]="n" (pageChange)="load($event)" />
  </zen-card>
</div>
```

## Thành phần

| Thành phần | Dùng cho |
|---|---|
| `zen-page-header` | Tiêu đề trang gọn một dòng: `heading`, `subtitle` (hiện cùng dòng, ẩn dưới 1024px), `count`, `countLabel` (`eyebrow` không còn hiển thị); slot `[actions]`, `[title-extra]` |
| `zen-card` | Khung nội dung: `heading`, `subtitle`, `padding` (`none/sm/md/lg`), `interactive`, `selected`; slot `[card-actions]`, `[card-footer]` |
| `zen-stat-card` | Ô KPI: `label`, `value`, `hint`, `icon`, `tone` |
| `zen-badge` | Trạng thái dạng pill: `tone` (`primary/success/warning/danger/info/neutral`), `size` (`sm/md`), `dot` |
| `zen-tabs` | Tab gạch chân: `items: ZenTabItem[]` (`key`, `label`, `count`, `icon`), `active`, `(activeChange)` |
| `zen-toolbar` | Thanh lọc: con có class `zen-toolbar-grow` (ô tìm kiếm) / `zen-toolbar-item` (bộ lọc); slot `[toolbar-end]` |
| `zen-modal` | Hộp thoại: `heading`, `subtitle`, `icon`, `tone`, `size` (`sm/md/lg/xl`), `closable` (false khi đang lưu), `(closed)`; modal chồng nhau thì Esc chỉ đóng modal trên cùng; slot `[modal-footer]`. Bọc trong `@if` |
| `zen-alert` | Thông báo nội tuyến: `tone`, `heading`, `dismissible`, `(dismissed)` |
| `zen-empty-state` | Trạng thái rỗng: `icon`, `heading`, `description`, `compact`; nội dung con = nút hành động |
| `zen-loading` | Đang tải: `message`, `inline` |
| `zen-pagination` | Phân trang (page từ 0): `page`, `totalPages`, `totalElements`, `(pageChange)` |
| `zen-avatar` | Avatar chữ cái: `name`, `size` (`sm/md/lg`) |
| `zen-icon` | Icon nét mảnh: `name`, `size` (mặc định 16), `strokeWidth` |
| `zen-button`, `zen-input`, `zen-select`, `zen-search` | Điều khiển form có sẵn |
| `ZenConfirmService`, `ZenToastService` | Hộp xác nhận và toast |

## Lớp CSS toàn cục (`styles/zen-ui.scss`)

- **Bố cục:** `zen-page` (full chiều ngang, lề theo `--page-padding-x`; `zen-page--narrow` cho trang đọc),  `zen-stack(--sm/--lg)`, `zen-row(--between/--end)`, `zen-grid(--2/--3/--4/--stats)`
- **Nút:** `zen-btn` + `--primary | --secondary | --outline | --ghost | --danger | --danger-outline`, `--sm | --lg`, `--icon`, `--block`
- **Form:** `zen-form-grid`, `zen-field(--full)`, `zen-label`, `zen-required`, `zen-control` (input/select/textarea, `.is-invalid`), `zen-hint`, `zen-error`, `zen-check`
- **Bảng:** `zen-table-wrap`, `zen-table(--compact)`; trong ô: `cell-primary`, `cell-sub`, `cell-muted`; cột: `is-numeric`, `is-center`, `is-actions`, `is-nowrap`; dòng: `is-selected`; `zen-cell-user`
- **Chọn nhanh:** `zen-chip(.is-active)`, `zen-segmented > button(.is-active)`
- **Số tiền lớn:** `zen-amount` (+ `zen-amount__unit` cho ký hiệu ₫, `zen-amount--md` cỡ vừa)
- **Chữ:** `zen-eyebrow`, `zen-section-title`, `zen-text-muted`, `zen-text-secondary`, `zen-text-sm`, `zen-text-xs`, `zen-num`, `zen-mono`, `zen-strong`, `zen-price`, `zen-truncate`
- **Khác:** `zen-dl` (danh sách mô tả), `zen-divider`, `zen-skeleton`, `zen-spin`

## Bảng màu trạng thái

| Ý nghĩa | tone | Ví dụ |
|---|---|---|
| Hoàn tất / hoạt động | `success` | Đã thanh toán, Đang hoạt động, Đã điểm danh |
| Chờ / sắp hết hạn | `warning` | Chờ thanh toán, Sắp hết hạn, Danh sách chờ |
| Lỗi / hủy / khóa | `danger` | Đã khóa, Hết hạn, Vắng mặt |
| Thông tin | `info` | Đã hoàn tiền, Đã đặt chỗ |
| Thương hiệu / vai trò | `primary` | Vai trò, Gói nổi bật |
| Trung tính | `neutral` | Đã hủy (không lỗi), Lưu trữ, Nháp |

## Chế độ sáng / tối

- Màu tối định nghĩa trong `tokens.scss` dưới `:root[data-theme='dark']`. Component chỉ dùng token nên tự đổi màu, không cần CSS riêng.
- `ZenThemeService` (`mode`: `light | dark | system`, `toggle()`, `setMode()`) lưu lựa chọn vào localStorage `an-yen-theme`.
- App shell chỉ bật chế độ tối cho khu vực quản lý; trang chủ và đăng nhập luôn sáng. Script trong `index.html` áp chế độ trước lần vẽ đầu để không nháy màn hình.
- Thẻ nền xanh thương hiệu (thẻ hội viên, thẻ POS) dùng `--color-brand-surface`, `--color-brand-surface-end`, `--color-on-brand` — không dùng `--color-primary` + `--color-text-inverse` vì hai màu này đảo ngược ở chế độ tối.
