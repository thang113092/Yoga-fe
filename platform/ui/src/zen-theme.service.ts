import { Injectable, computed, signal } from '@angular/core';

export type ZenThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'an-yen-theme';

/**
 * Chế độ sáng / tối của khu vực quản lý.
 * Lưu lựa chọn trong localStorage; 'system' đi theo cài đặt hệ điều hành.
 * Việc gắn data-theme lên <html> do app shell quyết định (trang chủ, đăng nhập luôn sáng).
 */
@Injectable({ providedIn: 'root' })
export class ZenThemeService {
  private readonly media = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
  private readonly systemDark = signal(this.media?.matches ?? false);

  readonly mode = signal<ZenThemeMode>(this.readStored());
  readonly resolved = computed<'light' | 'dark'>(() => {
    const mode = this.mode();
    return mode === 'system' ? (this.systemDark() ? 'dark' : 'light') : mode;
  });
  readonly isDark = computed(() => this.resolved() === 'dark');

  constructor() {
    this.media?.addEventListener?.('change', event => this.systemDark.set(event.matches));
  }

  setMode(mode: ZenThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* Trình duyệt chặn lưu trữ: chỉ áp dụng trong phiên hiện tại. */
    }
  }

  toggle(): void {
    this.setMode(this.isDark() ? 'light' : 'dark');
  }

  /** Gắn chế độ lên <html>; `enabled = false` buộc giao diện sáng (trang công khai). */
  apply(enabled: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset['theme'] = enabled && this.isDark() ? 'dark' : 'light';
  }

  private readStored(): ZenThemeMode {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      if (value === 'light' || value === 'dark' || value === 'system') return value;
    } catch {
      /* bỏ qua */
    }
    return 'system';
  }
}
