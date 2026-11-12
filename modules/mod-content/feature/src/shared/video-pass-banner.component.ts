import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ZEN_UI } from '@yoga/platform/ui';

/** Explains that locked videos need an Online or Hybrid package, with a link to the package list. */
@Component({
  selector: 'yoga-video-pass-banner',
  standalone: true,
  inputs: ['heading'],
  imports: [RouterModule, ...ZEN_UI],
  template: `
    <zen-alert tone="warning" icon="lock" [heading]="heading">
      <div class="pass-banner">
        <span>
          Các video có biểu tượng khóa dành cho học viên có gói <strong>Online</strong> hoặc <strong>Kết hợp</strong> còn hạn.
          Video gắn nhãn <strong>Miễn phí</strong> vẫn xem được ngay.
        </span>
        <a routerLink="/membership/plans" class="zen-btn zen-btn--primary zen-btn--sm">
          <zen-icon name="layers" [size]="15" />
          <span>Xem gói Online</span>
        </a>
      </div>
    </zen-alert>
  `,
  styles: [`
    :host { display: block; }
    .pass-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VideoPassBannerComponent {
  heading = 'Bạn chưa có gói học online';
}
