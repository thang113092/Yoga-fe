import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Avatar chữ cái đầu (tròn) — dùng trong bảng người dùng, header, danh sách học viên.
 *
 * <zen-avatar [name]="user.fullName" size="sm" />
 */
@Component({
  selector: 'zen-avatar',
  standalone: true,
  inputs: ['name', 'size'],
  host: { '[attr.data-size]': 'size', '[attr.title]': 'name' },
  template: `{{ initials }}`,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-primary-soft);
      color: var(--color-primary);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: var(--weight-bold);
      letter-spacing: 0.02em;
      flex-shrink: 0;
      user-select: none;
    }
    :host([data-size='sm']) { width: 30px; height: 30px; font-size: var(--text-2xs); }
    :host([data-size='lg']) { width: 48px; height: 48px; font-size: var(--text-md); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZenAvatarComponent {
  name: string | null | undefined = '';
  size: 'sm' | 'md' | 'lg' = 'md';

  // Tên tiếng Việt: lấy chữ cái đầu của tên gọi (từ cuối cùng), ví dụ "Nguyễn Văn An" -> "A".
  protected get initials(): string {
    const parts = (this.name ?? '').trim().split(/\s+/).filter(Boolean);
    return parts.length ? parts[parts.length - 1].charAt(0).toUpperCase() : '?';
  }
}
