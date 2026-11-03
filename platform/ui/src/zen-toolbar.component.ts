import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Thanh bộ lọc phía trên bảng/danh sách. Ô tìm kiếm co giãn, bộ lọc cố định độ rộng, hành động bên phải.
 *
 * <zen-toolbar>
 *   <zen-search class="zen-toolbar-grow" ... />
 *   <zen-select class="zen-toolbar-item" ... />
 *   <div toolbar-end>...</div>
 * </zen-toolbar>
 */
@Component({
  selector: 'zen-toolbar',
  standalone: true,
  template: `
    <div class="ztb-main"><ng-content /></div>
    <div class="ztb-end"><ng-content select="[toolbar-end]" /></div>
  `,
  styles: [`
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .ztb-main {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      flex: 1;
      min-width: 0;
    }
    .ztb-main > ::ng-deep .zen-toolbar-grow { flex: 1 1 260px; min-width: 220px; max-width: 420px; }
    .ztb-main > ::ng-deep .zen-toolbar-item { flex: 0 1 200px; min-width: 160px; }
    .ztb-end { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ztb-end:empty { display: none; }

    @media (max-width: 640px) {
      .ztb-main > ::ng-deep .zen-toolbar-grow,
      .ztb-main > ::ng-deep .zen-toolbar-item { flex: 1 1 100%; max-width: none; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenToolbarComponent {}
